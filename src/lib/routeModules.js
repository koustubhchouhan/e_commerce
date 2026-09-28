// Single source of truth for the lazy route chunks.
//
// App.jsx builds its React.lazy() components from `chunk`, and PrefetchLink uses
// `prefetchRoute` to warm the same loader on hover, focus or when a link scrolls
// into view. The browser and bundler memoise `import()`, so a prefetch never
// downloads a chunk twice — following the link afterwards just resolves against
// the already-fetched module.
export const chunk = {
  home: () => import('../pages/Home'),
  login: () => import('../pages/Login'),
  signup: () => import('../pages/SignUp'),
  authCallback: () => import('../pages/AuthCallback'),
  productDetails: () => import('../pages/ProductDetails'),
  adminPanel: () => import('../pages/AdminPanel'),
  sellerHub: () => import('../pages/SellerHub'),
  sellerInventory: () => import('../pages/SellerInventory'),
  sellerProfile: () => import('../pages/SellerProfile'),
  userProfile: () => import('../pages/UserProfile'),
  adminProfile: () => import('../pages/AdminProfile'),
  categories: () => import('../pages/Categories'),
  about: () => import('../pages/About'),
  contact: () => import('../pages/Contact'),
  messages: () => import('../pages/MyMessages'),
  cart: () => import('../pages/Cart'),
  checkout: () => import('../pages/Checkout'),
  orderConfirmation: () => import('../pages/OrderConfirmation'),
  orderDetails: () => import('../pages/OrderDetails'),
  searchResults: () => import('../pages/SearchResults'),
  sellerRequests: () => import('../pages/SellerRequests'),
  notFound: () => import('../pages/NotFound'),
  terms: () => import('../pages/legal/TermsAndConditions'),
  privacy: () => import('../pages/legal/PrivacyPolicy'),
  refundPolicy: () => import('../pages/legal/RefundPolicy'),
  shippingPolicy: () => import('../pages/legal/ShippingPolicy'),
  contactUs: () => import('../pages/legal/ContactUs'),
};

// Path prefix -> chunk. Ordered longest/most-specific first so a prefix never
// swallows a sibling route (e.g. '/seller-requests' before '/seller', and
// '/admin-profile' before '/admin'). Trailing slashes cover the parameterised
// routes (/product/:id, /orders/:id).
const PATH_CHUNKS = [
  ['/auth/callback', chunk.authCallback],
  ['/admin-profile', chunk.adminProfile],
  ['/admin', chunk.adminPanel],
  ['/seller-requests', chunk.sellerRequests],
  ['/seller-profile', chunk.sellerProfile],
  ['/inventory', chunk.sellerInventory],
  ['/seller', chunk.sellerHub],
  ['/order-confirmation', chunk.orderConfirmation],
  ['/orders/', chunk.orderDetails],
  ['/product/', chunk.productDetails],
  ['/contact-us', chunk.contactUs],
  ['/contact', chunk.contact],
  ['/messages', chunk.messages],
  ['/categories', chunk.categories],
  ['/checkout', chunk.checkout],
  ['/search', chunk.searchResults],
  ['/profile', chunk.userProfile],
  ['/cart', chunk.cart],
  ['/about', chunk.about],
  ['/home', chunk.home],
  ['/login', chunk.login],
  ['/signup', chunk.signup],
  ['/terms', chunk.terms],
  ['/privacy', chunk.privacy],
  ['/refund-policy', chunk.refundPolicy],
  ['/shipping-policy', chunk.shippingPolicy],
];

// Best-effort warm-up of the chunk behind a path. Failures are swallowed: the
// real navigation will retry the import and surface any error properly.
export function prefetchRoute(path) {
  if (!path) return;
  const entry = PATH_CHUNKS.find(([prefix]) => path === prefix || path.startsWith(prefix));
  if (entry) entry[1]().catch(() => {});
}
