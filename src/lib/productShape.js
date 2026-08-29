// Maps API products (catalog/service shape) to the display shape the existing
// storefront components render: { id, title, price, oldPrice, desc, img,
// badge, badgeColor, category }. Keeping the UI-facing shape stable means the
// ProductCard/grid code needed almost no changes when we went from mock data
// to the real API.

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=800';

export function toProductCard(p) {
  const price = Number(p.salePrice ?? p.price ?? 0);
  const oldPrice = p.discount_percent > 0 ? Number(p.price) : null;
  const discount = p.discount_percent > 0;
  const outOfStock = p.stock === 0;

  return {
    id: p.id,
    title: p.name,
    price,
    oldPrice,
    desc: p.description || '',
    img: p.coverImage || FALLBACK_IMG,
    badge: discount ? `-${p.discount_percent}% OFF` : outOfStock ? 'SOLD OUT' : null,
    badgeColor: discount ? 'error' : 'secondary',
    category: p.category?.name ?? 'Uncategorized',
    stock: p.stock,
    status: p.status,
  };
}

export function toProductCardList(items = []) {
  return items.map(toProductCard);
}
