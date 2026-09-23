import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import WebGLBackground from "./components/WebGLBackground";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import PolicyLayout from "./components/PolicyLayout";

// Pages are split into per-route chunks so a visitor only downloads the code
// for the screen they open. Admin and seller tooling is the heaviest part of
// the app and most visitors never reach it.
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const SellerHub = lazy(() => import("./pages/SellerHub"));
const SellerInventory = lazy(() => import("./pages/SellerInventory"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const Categories = lazy(() => import("./pages/Categories"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const MyMessages = lazy(() => import("./pages/MyMessages"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const SellerRequests = lazy(() => import("./pages/SellerRequests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermsAndConditions = lazy(() => import("./pages/legal/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/legal/ShippingPolicy"));
const ContactUs = lazy(() => import("./pages/legal/ContactUs"));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse font-[Outfit] text-lg text-[#7A6A5B]">
        Loading…
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { userRole, loading } = useAuth();

  // Session still being restored. Don't redirect yet: userRole reads "guest"
  // until the check resolves, so redirecting here would bounce a signed-in user
  // to /login on every hard refresh. Render a placeholder and wait instead.
  if (loading) return <RouteFallback />;

  if (userRole === "guest") {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If they try to access something they shouldn't, kick them back to their default
    if (userRole === "admin") return <Navigate to="/admin" replace />;
    if (userRole === "seller") return <Navigate to="/seller" replace />;
    return <Navigate to="/home" replace />;
  }

  return children;
}

function App() {
  const { userRole } = useAuth();
  const location = useLocation();
  const hideNavAndFooter =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/auth/callback";

  return (
    <>
      <WebGLBackground />
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        {!hideNavAndFooter && userRole !== "guest" && <NavBar />}

        <main className="flex-grow">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public legal pages — reachable without signing in so buyers and
                payment-gateway reviewers can always read our policies. */}
            <Route element={<PolicyLayout />}>
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/contact-us" element={<ContactUs />} />
            </Route>

            <Route
              path="/home"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/categories"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Categories />
                </ProtectedRoute>
              }
            />

            <Route
              path="/about"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <About />
                </ProtectedRoute>
              }
            />

            <Route
              path="/contact"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Contact />
                </ProtectedRoute>
              }
            />

            <Route
              path="/messages"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <MyMessages />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cart"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Cart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <Checkout />
                </ProtectedRoute>
              }
            />

            <Route
              path="/order-confirmation"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <OrderConfirmation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <OrderDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/search"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <SearchResults />
                </ProtectedRoute>
              }
            />

            <Route
              path="/product/:id"
              element={
                <ProtectedRoute>
                  <ProductDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />

            <Route
              path="/seller"
              element={
                <ProtectedRoute allowedRoles={["seller"]}>
                  <SellerHub />
                </ProtectedRoute>
              }
            />

            <Route path="/inventory" element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <SellerInventory />
              </ProtectedRoute>
            } />

            <Route path="/seller-requests" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerRequests />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <UserProfile />
              </ProtectedRoute>
            } />

            <Route path="/seller-profile" element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerProfile />
              </ProtectedRoute>
            } />



            <Route path="/admin-profile" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminProfile />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        {!hideNavAndFooter && userRole !== "guest" && <Footer />}
      </div>
    </>
  );
}

export default App;
