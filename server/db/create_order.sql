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
-- none do), and returns a JSON array of
-- { order_id, store_id, total, delivery_fee }. One flat delivery charge is
-- added to the whole checkout when the items total is under the free-delivery
-- threshold; it is recorded on the first order so the sum of order totals
-- always equals the amount collected.
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
  v_free_delivery_threshold numeric(12,2) := 200;
  v_delivery_charge         numeric(12,2) := 29;
  v_result      jsonb := '[]'::jsonb;
  v_store_id    uuid;
  v_group       jsonb;
  v_order_id    uuid;
  v_order_ids   uuid[] := '{}';
  v_first_id    uuid := null;
  v_items_total numeric(12,2) := 0;
begin
  -- Delivery pricing is admin-editable from Platform Settings. Read it here so
  -- a change applies to the next checkout; fall back to the defaults if the
  -- single settings row is somehow missing.
  select delivery_charge, free_delivery_threshold
    into v_delivery_charge, v_free_delivery_threshold
    from public.platform_settings
    where id = true;

  v_delivery_charge         := coalesce(v_delivery_charge, 29);
  v_free_delivery_threshold := coalesce(v_free_delivery_threshold, 200);

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
    v_order_ids := v_order_ids || v_order_id;
    if v_first_id is null then
      v_first_id := v_order_id;
    end if;
  end loop;

  -- One flat delivery charge for the whole checkout when the items total is
  -- under the threshold. It rides on the first order so the payment amount
  -- (the sum of order totals) collects it exactly once.
  select coalesce(sum(subtotal), 0) into v_items_total
    from public.orders
    where id = any(v_order_ids);

  if v_items_total > 0
     and (v_free_delivery_threshold <= 0 or v_items_total < v_free_delivery_threshold) then
    update public.orders
      set delivery_fee = v_delivery_charge,
          total        = subtotal + v_delivery_charge
      where id = v_first_id;
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'order_id',     o.id,
             'store_id',     o.store_id,
             'total',        o.total,
             'delivery_fee', o.delivery_fee
           ) order by array_position(v_order_ids, o.id)
         ), '[]'::jsonb)
    into v_result
    from public.orders o
    where o.id = any(v_order_ids);

  return v_result;
end;
$$;

-- =====================================================================
-- Payment lifecycle.
--   mark_payment_captured -> flip a payments row to 'captured' and every order
--     it paid for to 'paid', in one transaction. Idempotent: a webhook retry
--     racing /payments/verify affects zero rows the second time.
--   mark_payment_failed   -> mark the payment failed and release the stock its
--     still-pending orders reserved, so an abandoned checkout frees inventory.
-- Both can move money/stock, so the revokes below drop the default
-- anon/authenticated EXECUTE grant and leave them service_role-only.
-- =====================================================================
create or replace function public.mark_payment_captured(
  p_gateway_order_id   text,
  p_gateway_payment_id text,
  p_raw_payload        jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_order_ids  uuid[];
  v_status     payment_status;
  v_order_id   uuid;
  v_missing    int;
  v_reinstated uuid[] := '{}';
  v_failed     uuid[] := '{}';
begin
  select id, status into v_payment_id, v_status
    from public.payments
    where gateway_order_id = p_gateway_order_id
    for update;

  if not found then
    raise exception 'Unknown payment order %', p_gateway_order_id;
  end if;

  select array_agg(order_id) into v_order_ids
    from public.payment_orders
    where payment_id = v_payment_id;

  -- Capture the payment. Idempotent (a webhook retry racing /payments/verify
  -- affects zero rows the second time) and it also revives a payment the
  -- sweeper already failed, so a late capture is never dropped.
  update public.payments
    set status             = 'captured',
        gateway_payment_id = coalesce(gateway_payment_id, p_gateway_payment_id),
        signature_verified = true,
        raw_payload        = coalesce(p_raw_payload, raw_payload),
        updated_at         = now()
    where id = v_payment_id
      and status in ('created', 'authorized', 'failed');

  -- Orders still awaiting payment simply flip to paid.
  update public.orders
    set status = 'paid'
    where id = any(coalesce(v_order_ids, '{}'::uuid[]))
      and status = 'pending';

  -- Late capture: the sweeper (or an early cancel) already released these and
  -- marked them expired/cancelled. Re-reserve their stock under a row lock and
  -- reinstate them as paid. If the stock is genuinely gone, leave the order
  -- cancelled and report it so the capture is refunded instead of silently lost.
  for v_order_id in
    select id from public.orders
    where id = any(coalesce(v_order_ids, '{}'::uuid[]))
      and status in ('expired', 'cancelled')
  loop
    perform 1
      from public.products p
      join public.order_items oi on oi.product_id = p.id
      where oi.order_id = v_order_id
      for update of p;

    select count(*) into v_missing
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
      where oi.order_id = v_order_id
        and (oi.product_id is null or p.stock < oi.quantity);

    if v_missing = 0 then
      update public.products p
        set stock = p.stock - oi.quantity
        from public.order_items oi
        where oi.order_id = v_order_id
          and oi.product_id = p.id;

      update public.orders set status = 'paid' where id = v_order_id;
      v_reinstated := v_reinstated || v_order_id;
    else
      v_failed := v_failed || v_order_id;
    end if;
  end loop;

  select status into v_status from public.payments where id = v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'status',     v_status,
    'order_ids',  coalesce(to_jsonb(v_order_ids), '[]'::jsonb),
    'reinstated_order_ids',  to_jsonb(v_reinstated),
    'unfulfillable_order_ids', to_jsonb(v_failed)
  );
end;
$$;

create or replace function public.mark_payment_failed(
  p_gateway_order_id   text default null,
  p_gateway_payment_id text default null,
  p_raw_payload        jsonb default null,
  p_payment_id         uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_order_ids  uuid[];
  v_status     payment_status;
begin
  select id into v_payment_id
    from public.payments
    where (p_payment_id is not null and id = p_payment_id)
       or (p_gateway_order_id is not null and gateway_order_id = p_gateway_order_id)
    for update;

  if not found then
    raise exception 'Unknown payment (order %, id %)', p_gateway_order_id, p_payment_id;
  end if;

  select array_agg(order_id) into v_order_ids
    from public.payment_orders
    where payment_id = v_payment_id;

  -- Give back the stock of orders that were still awaiting payment.
  update public.products p
    set stock = p.stock + released.qty
    from (
      select oi.product_id, sum(oi.quantity) as qty
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.order_id = any(coalesce(v_order_ids, '{}'::uuid[]))
        and o.status = 'pending'
        and oi.product_id is not null
      group by oi.product_id
    ) released
    where p.id = released.product_id;

  update public.orders
    set status = 'cancelled'
    where id = any(coalesce(v_order_ids, '{}'::uuid[]))
      and status = 'pending';

  update public.payments
    set status             = 'failed',
        gateway_payment_id = coalesce(gateway_payment_id, p_gateway_payment_id),
        raw_payload        = coalesce(p_raw_payload, raw_payload),
        updated_at         = now()
    where id = v_payment_id
      and status in ('created', 'authorized');

  select status into v_status from public.payments where id = v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'status',     v_status,
    'order_ids',  coalesce(to_jsonb(v_order_ids), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.mark_payment_captured(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.mark_payment_captured(text, text, jsonb) to service_role;
grant execute on function public.mark_payment_failed(text, text, jsonb, uuid) to service_role;

-- =====================================================================
-- expire_stale_payments -> safety net for abandoned checkouts. Any payment
-- still 'created'/'authorized' past the window is flipped to 'failed', and the
-- stock its still-pending orders reserved is released (orders become 'expired').
-- A user who merely dismisses the Razorpay modal is handled by
-- POST /payments/cancel; this catches closed tabs, crashes and lost networks.
-- service_role only, like mark_payment_failed.
-- =====================================================================
create or replace function public.expire_stale_payments(
  p_minutes int default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_ids uuid[];
  v_order_ids   uuid[];
  v_payments    int;
  v_orders      int;
begin
  if p_minutes is null or p_minutes < 1 then
    raise exception 'Invalid expiry window %', p_minutes;
  end if;

  -- Claim the stale payments by flipping them to failed in one statement, so
  -- two sweepers (or a retry) can never release the same stock twice.
  with expired as (
    update public.payments
      set status = 'failed', updated_at = now()
      where status in ('created', 'authorized')
        and created_at < now() - make_interval(mins => p_minutes)
      returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into v_payment_ids from expired;

  v_payments := coalesce(array_length(v_payment_ids, 1), 0);
  if v_payments = 0 then
    return jsonb_build_object('expired_payments', 0, 'expired_orders', 0);
  end if;

  select coalesce(array_agg(order_id), '{}'::uuid[]) into v_order_ids
    from public.payment_orders
    where payment_id = any(v_payment_ids);

  -- Give back the stock of the orders that were still awaiting payment.
  update public.products p
    set stock = p.stock + released.qty
    from (
      select oi.product_id, sum(oi.quantity) as qty
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.order_id = any(v_order_ids)
        and o.status = 'pending'
        and oi.product_id is not null
      group by oi.product_id
    ) released
    where p.id = released.product_id;

  with expired_orders as (
    update public.orders
      set status = 'expired'
      where id = any(v_order_ids)
        and status = 'pending'
      returning id
  )
  select count(*) into v_orders from expired_orders;

  return jsonb_build_object(
    'expired_payments', v_payments,
    'expired_orders',   v_orders
  );
end;
$$;

revoke all on function public.expire_stale_payments(int) from public, anon, authenticated;
grant execute on function public.expire_stale_payments(int) to service_role;


-- =====================================================================
-- Seller settlements.
--   create_settlement -> record one manual payout to a store: the orders it
--     covers plus gross / platform fee / net. It refuses if any order is for
--     another store, is not in a settled revenue state, or was already paid
--     out. Writes money-adjacent rows, so service_role only.
-- =====================================================================
create or replace function public.create_settlement(
  p_store_id   uuid,
  p_order_ids  uuid[],
  p_fee_rate   numeric,
  p_created_by uuid default null,
  p_note       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gross     numeric(12,2);
  v_fee       numeric(12,2);
  v_net       numeric(12,2);
  v_eligible  int;
  v_requested int;
  v_id        uuid;
begin
  v_requested := coalesce(array_length(p_order_ids, 1), 0);
  if v_requested = 0 then
    raise exception 'No orders supplied';
  end if;
  if p_fee_rate is null or p_fee_rate < 0 or p_fee_rate >= 1 then
    raise exception 'Invalid fee rate %', p_fee_rate;
  end if;

  -- Lock the candidate orders so a concurrent settlement cannot double-count.
  perform 1 from public.orders where id = any(p_order_ids) for update;

  -- Seller payout is based on the items subtotal; the flat delivery charge is
  -- platform revenue and is deliberately excluded (orders.total - delivery_fee).
  select coalesce(sum(o.subtotal), 0), count(*)
    into v_gross, v_eligible
    from public.orders o
    where o.id = any(p_order_ids)
      and o.store_id = p_store_id
      and o.status in ('paid', 'shipped', 'delivered')
      and not exists (
        select 1 from public.settlement_orders so where so.order_id = o.id
      );

  if v_eligible <> v_requested then
    raise exception 'Some orders are not settleable (wrong store, unpaid, or already settled)';
  end if;

  v_fee := round(v_gross * p_fee_rate, 2);
  v_net := round(v_gross - v_fee, 2);

  insert into public.settlements
    (store_id, gross, fee, net, order_count, note, created_by)
  values
    (p_store_id, v_gross, v_fee, v_net, v_eligible, p_note, p_created_by)
  returning id into v_id;

  insert into public.settlement_orders (settlement_id, order_id, amount)
  select v_id, o.id, round(o.subtotal * (1 - p_fee_rate), 2)
    from public.orders o
    where o.id = any(p_order_ids);

  return jsonb_build_object(
    'id',          v_id,
    'store_id',    p_store_id,
    'gross',       v_gross,
    'fee',         v_fee,
    'net',         v_net,
    'order_count', v_eligible,
    'order_ids',   to_jsonb(p_order_ids)
  );
end;
$$;

revoke all on function public.create_settlement(uuid, uuid[], numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.create_settlement(uuid, uuid[], numeric, uuid, text) to service_role;

-- =====================================================================
-- Seller membership.
--   mark_seller_membership_paid -> capture a seller_membership payment and, when
--     the application is still awaiting payment, grant the seller role, create
--     the store once, and mark the application approved. Idempotent: a webhook
--     racing /membership-verify returns activated=false the second time.
--     service_role only.
--   expire_stale_seller_approvals -> reject applications whose 24h payment
--     window lapsed without a captured fee.
-- A capture that lands after the window already rejected the application is not
-- activated; the caller logs it so the charge can be refunded manually.
-- =====================================================================
create or replace function public.mark_seller_membership_paid(
  p_gateway_order_id   text,
  p_gateway_payment_id text,
  p_raw_payload        jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment     public.payments%rowtype;
  v_application public.seller_applications%rowtype;
  v_status      payment_status;
  v_app_status  application_status;
  v_store_id    uuid;
  v_activated   boolean := false;
begin
  select * into v_payment
    from public.payments
    where gateway_order_id = p_gateway_order_id
    for update;

  if not found then
    raise exception 'Unknown payment order %', p_gateway_order_id;
  end if;
  if v_payment.purpose <> 'seller_membership' then
    raise exception 'Payment % is not a seller membership charge', p_gateway_order_id;
  end if;

  update public.payments
    set status             = 'captured',
        gateway_payment_id = coalesce(gateway_payment_id, p_gateway_payment_id),
        signature_verified = true,
        raw_payload        = coalesce(p_raw_payload, raw_payload),
        updated_at         = now()
    where id = v_payment.id
      and status in ('created', 'authorized', 'failed');

  select status into v_status from public.payments where id = v_payment.id;

  select * into v_application
    from public.seller_applications
    where id = v_payment.seller_application_id
    for update;

  if found and v_application.status in ('approved_pending_payment', 'approved') then
    if v_application.status = 'approved_pending_payment'
       and v_application.payment_deadline is not null
       and v_application.payment_deadline >= now() then
      update public.profiles set role = 'seller' where id = v_application.user_id;

      select id into v_store_id
        from public.stores
        where owner_id = v_application.user_id
        limit 1;

      if v_store_id is null then
        insert into public.stores (owner_id, name)
          values (v_application.user_id, v_application.store_name)
          returning id into v_store_id;
      end if;

      update public.seller_applications
        set status = 'approved',
            activated_at = now(),
            payment_deadline = null,
            membership_payment_id = v_payment.id
        where id = v_application.id;

      v_activated := true;
    elsif v_application.status = 'approved_pending_payment' then
      -- The fee was captured, but the 24h window had already lapsed. Do not
      -- grant access; the caller logs this so the charge can be refunded.
      update public.seller_applications
        set status = 'rejected',
            reviewed_at = now(),
            payment_deadline = null
        where id = v_application.id;
    else
      -- Already active (e.g. a webhook retry): just record the payment link.
      update public.seller_applications
        set membership_payment_id = coalesce(membership_payment_id, v_payment.id)
        where id = v_application.id;
    end if;

    select id into v_store_id
      from public.stores
      where owner_id = v_application.user_id
      limit 1;
  end if;

  select status into v_app_status
    from public.seller_applications
    where id = v_payment.seller_application_id;

  return jsonb_build_object(
    'payment_id',         v_payment.id,
    'status',             v_status,
    'application_id',     v_payment.seller_application_id,
    'application_status', v_app_status,
    'store_id',           v_store_id,
    'activated',          v_activated
  );
end;
$$;

create or replace function public.expire_stale_seller_approvals()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired int;
begin
  with expired as (
    update public.seller_applications
      set status = 'rejected',
          reviewed_at = now(),
          payment_deadline = null
      where status = 'approved_pending_payment'
        and payment_deadline is not null
        and payment_deadline < now()
      returning id
  )
  select count(*) into v_expired from expired;

  return jsonb_build_object('expired_applications', v_expired);
end;
$$;

revoke all on function public.mark_seller_membership_paid(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.expire_stale_seller_approvals() from public, anon, authenticated;
grant execute on function public.mark_seller_membership_paid(text, text, jsonb) to service_role;
grant execute on function public.expire_stale_seller_approvals() to service_role;
