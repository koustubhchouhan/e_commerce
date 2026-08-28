import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { loadImagesByProduct, pickCover, serializeProduct } from './product-data.js';
import { uploadProductImage, removeProductImage } from './storage.service.js';

const PRODUCT_SELECT = '*, categories(id, name, slug), stores(id, name)';

// The caller's store row. A seller without a store (e.g. role upgraded before
// approval flow finished) cannot manage products.
async function requireStore(userId) {
  const { data: store, error } = await db
    .from('stores')
    .select('id, name')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load your store: ${error.message}`);
  if (!store) throw new AppError(403, 'You need an approved store before managing products');
  return store;
}

// Loads a product and asserts the caller owns it (via their store). Used by
// every seller mutation so ownership lives in one place.
async function loadOwnedProduct(userId, productId) {
  const { data: product, error } = await db
    .from('products')
    .select('id, store_id, stores(owner_id)')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load product: ${error.message}`);
  if (!product) throw new AppError(404, 'Product not found');
  if (product.stores?.owner_id !== userId) {
    throw new AppError(403, 'You can only manage products from your own store');
  }
  return product;
}

async function validateCategory(categoryId) {
  if (!categoryId) return;
  const { data, error } = await db
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();
  if (error) throw new AppError(500, `Could not validate category: ${error.message}`);
  if (!data) throw new AppError(400, 'Category does not exist');
}

// GET /seller/products — the caller's own products for the inventory page.
export async function listSellerProducts(userId) {
  const store = await requireStore(userId);

  const { data, error } = await db
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load your products: ${error.message}`);

  const ids = (data ?? []).map((p) => p.id);
  const imagesByProduct = await loadImagesByProduct(ids);

  return {
    items: (data ?? []).map((row) => {
      const images = imagesByProduct.get(row.id) ?? [];
      return {
        ...serializeProduct(row, pickCover(images)),
        images: images.map((i) => ({ id: i.id, url: i.url, isCover: i.is_cover })),
      };
    }),
  };
}

// POST /products — creates a product attached to the caller's store.
export async function createProduct(userId, input) {
  const store = await requireStore(userId);
  await validateCategory(input.category_id);

  const { data, error } = await db
    .from('products')
    .insert({ ...input, store_id: store.id })
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw new AppError(400, `Could not create product: ${error.message}`);

  const imagesByProduct = await loadImagesByProduct([data.id]);
  return serializeProduct(data, pickCover(imagesByProduct.get(data.id)));
}

// PATCH /products/:id — partial update. Fields are whitelisted by zod already.
export async function updateProduct(userId, productId, patch) {
  await loadOwnedProduct(userId, productId);
  await validateCategory(patch.category_id);

  const { data, error } = await db
    .from('products')
    .update(patch)
    .eq('id', productId)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw new AppError(400, `Could not update product: ${error.message}`);

  const imagesByProduct = await loadImagesByProduct([data.id]);
  return serializeProduct(data, pickCover(imagesByProduct.get(data.id)));
}

// DELETE /products/:id → 204. Also removes the product's images from storage.
export async function deleteProduct(userId, productId) {
  await loadOwnedProduct(userId, productId);

  const { data: images, error: imgErr } = await db
    .from('product_images')
    .select('url')
    .eq('product_id', productId);
  if (imgErr) throw new AppError(500, `Could not load product images: ${imgErr.message}`);

  const { error } = await db.from('products').delete().eq('id', productId);
  if (error) throw new AppError(400, `Could not delete product: ${error.message}`);

  await Promise.all((images ?? []).map((i) => removeProductImage(i.url)));
}

// POST /products/:id/images — multipart upload. First image becomes the cover
// unless the product already has a cover. Returns the saved image rows.
export async function addProductImages(userId, productId, files) {
  if (!files?.length) throw new AppError(400, 'No images were uploaded');
  await loadOwnedProduct(userId, productId);

  const { data: existing, error: existErr } = await db
    .from('product_images')
    .select('is_cover')
    .eq('product_id', productId);
  if (existErr) throw new AppError(500, `Could not read existing images: ${existErr.message}`);

  const alreadyHasCover = (existing ?? []).some((i) => i.is_cover);
  let position = existing?.length ?? 0;

  const saved = [];
  try {
    for (const [i, file] of files.entries()) {
      const { url } = await uploadProductImage({
        file,
        folder: `products/${productId}`,
      });

      const { data, error } = await db
        .from('product_images')
        .insert({
          product_id: productId,
          url,
          position: position++,
          is_cover: !alreadyHasCover && i === 0,
        })
        .select('id, url, is_cover, position')
        .single();

      if (error) throw new AppError(400, `Could not save image: ${error.message}`);
      saved.push(data);
    }
  } catch (err) {
    // Roll back storage objects for anything we uploaded before the failure.
    await Promise.all(saved.map((s) => removeProductImage(s.url)));
    throw err;
  }

  return { images: saved };
}
