-- =====================================================================
-- Checkout functions.
--   create_orders  -> splits a (possibly multi-store) cart into one order
--                     per seller and returns each order's id/store/total.
--   create_order   -> the single-store primitive create_orders calls; kept
--                     separate so its row-lock + stock logic stays simple.
-- Called from Express via db.rpc('create_orders', { p_user_id, p_items, p_shipping }).
--   p_items example: [{ "product_id": "uuid", "quantity": 2 }, ...]
-- Prices are read from the products table INSIDE these functions — the client
-- never sends a price. Product rows are locked FOR UPDATE so two shoppers
-- can't buy the last unit at the same time. Any error rolls the whole thing back.
-- =====================================================================
create or replace function public.create_order(
  p_user_id  uuid,
  p_items    jsonb,
  p_shipping jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id   uuid;
  v_item       jsonb;
  v_product_id uuid;
  v_qty        int;
  v_product    record;
  v_first_store uuid := null;
  v_unit_price numeric(10,2);
  v_discount   int;
  v_line_total numeric(12,2);
  v_subtotal   numeric(12,2) := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (user_id, status, subtotal, total, shipping_address)
  values (p_user_id, 'pending', 0, 0, p_shipping)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    -- Lock this product row until the transaction commits.
    select id, name, price, discount_percent, stock, status, approval_status, store_id
      into v_product
      from public.products
      where id = v_product_id
      for update;

    if not found then
      raise exception 'Product % not found', v_product_id;
    end if;
    if v_product.status <> 'active' then
      raise exception 'Product % is not available', v_product_id;
    end if;
    -- status is seller-controlled; approval_status is admin-controlled. Both
    -- are required so a seller can't self-publish an unapproved listing.
    if v_product.approval_status <> 'approved' then
      raise exception 'Product % is not available', v_product_id;
    end if;
    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    -- This primitive handles a single store. create_orders groups the cart by
    -- store first, so a mixed cart never reaches here.
    if v_first_store is null then
      v_first_store := v_product.store_id;
    elsif v_product.store_id is distinct from v_first_store then
      raise exception 'Checkout can only contain items from one store; please place separate orders for each seller';
    end if;

    v_unit_price := v_product.price;
    v_discount   := v_product.discount_percent;
    v_line_total := round(v_unit_price * (1 - v_discount / 100.0) * v_qty, 2);

    insert into public.order_items
      (order_id, product_id, product_name, unit_price, discount_percent, quantity, line_total)
    values
      (v_order_id, v_product.id, v_product.name, v_unit_price, v_discount, v_qty, v_line_total);

    update public.products
      set stock = stock - v_qty
      where id = v_product_id;

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  update public.orders
    set subtotal = v_subtotal,
        total    = v_subtotal,
        store_id = v_first_store
    where id = v_order_id;

  return v_order_id;
end;
$$;

-- Splits the cart into one order per store, atomically (all orders succeed or
-- none do), and returns a JSON array of { order_id, store_id, total }.
create or replace function public.create_orders(
  p_user_id  uuid,
  p_items    jsonb,
  p_shipping jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result   jsonb := '[]'::jsonb;
  v_store_id uuid;
  v_group    jsonb;
  v_order_id uuid;
  v_total    numeric(12,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- Fail loudly on unknown products instead of silently dropping them from the
  -- grouping join below.
  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where not exists (
      select 1 from public.products p where p.id = (e->>'product_id')::uuid
    )
  ) then
    raise exception 'One or more products were not found';
  end if;

  for v_store_id, v_group in
    select p.store_id, jsonb_agg(t.elem order by t.ord)
    from jsonb_array_elements(p_items) with ordinality as t(elem, ord)
    join public.products p on p.id = (t.elem->>'product_id')::uuid
    group by p.store_id
    order by min(t.ord)
  loop
    v_order_id := public.create_order(p_user_id, v_group, p_shipping);
    select total into v_total from public.orders where id = v_order_id;

    v_result := v_result || jsonb_build_object(
      'order_id', v_order_id,
      'store_id', v_store_id,
      'total',    v_total
    );
  end loop;

  return v_result;
end;
$$;
