import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import WebGLBackground from "./components/WebGLBackground";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ProductDetails from "./pages/ProductDetails";
import AdminPanel from "./pages/AdminPanel";
import SellerHub from "./pages/SellerHub";
import SellerInventory from "./pages/SellerInventory";
import SellerProfile from "./pages/SellerProfile";
import UserProfile from "./pages/UserProfile";
import AdminProfile from "./pages/AdminProfile";
import Categories from "./pages/Categories";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import SearchResults from "./pages/SearchResults";
import SellerRequests from "./pages/SellerRequests";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children, allowedRoles }) {
  const { userRole } = useAuth();

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
  const { userRole, loading } = useAuth();
  const location = useLocation();
  const hideNavAndFooter =
    location.pathname === "/login" || location.pathname === "/signup";

  // While we restore an existing session, avoid rendering routes (a protected
  // route would otherwise bounce a logged-in user to /login on hard refresh).
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#170e03]">
        <div className="animate-pulse font-[Outfit] text-xl text-[#cbb89d]">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <>
      <WebGLBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        {!hideNavAndFooter && userRole !== "guest" && <NavBar />}

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

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
              <ProtectedRoute allowedRoles={['seller']}>
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
        </main>

        {!hideNavAndFooter && userRole !== "guest" && <Footer />}
      </div>
    </>
  );
}

export default App;
