import { useState, useEffect } from 'react';
import { ShoppingCart, Mail, Lock, EyeOff, Eye, ArrowRight, Globe, Smartphone, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Development convenience only. `import.meta.env.DEV` is false in production
// builds, so Vite strips this list and the buttons below out of the bundle.
// Accounts come from `npm run seed:users` in the server directory.
const DEV_PASSWORD = 'password123';
const DEV_ACCOUNTS = [
  { label: 'Customer', email: 'customer@novamarket.test' },
  { label: 'Seller', email: 'seller@novamarket.test' },
  { label: 'Admin', email: 'admin@novamarket.test' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const routeForRole = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'seller') return '/seller';
    return '/home';
  };

  // Redirect only once auth state has committed. Navigating imperatively right
  // after login() races ProtectedRoute, which can read a stale "guest" role and
  // bounce us straight back to /login.
  useEffect(() => {
    if (user) navigate(routeForRole(user.role), { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Navigation is handled by the effect above once `user` is set.
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
      setSubmitting(false);
    }
  };

  // Dev-only: sign in as a seeded role account.
  const quickLogin = async (devEmail) => {
    setError('');
    setSubmitting(true);
    try {
      await login(devEmail, DEV_PASSWORD);
    } catch (err) {
      setError(
        err?.message ||
          'Quick login failed. Run "npm run seed:users" in the server directory first.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      {/* Ambient glows inside the page context */}
      <div className="absolute w-[500px] h-[500px] bg-[#ff9933]/5 rounded-full blur-[80px] top-[10%] left-[10%] mix-blend-screen pointer-events-none animate-pulse" />
      <div className="absolute w-[600px] h-[600px] bg-[#c98a12]/5 rounded-full blur-[80px] bottom-[10%] right-[10%] mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-glow font-[Outfit] text-5xl font-bold text-[#fff4e6] flex items-center justify-center gap-2">
            <ShoppingCart size={40} />
            NovaMarket
          </h1>
          <p className="text-[#cbb89d] mt-2">Future-Ready Commerce Portal</p>
        </div>

        <div className="glass-panel rounded-2xl p-10 relative overflow-hidden">
          {/* Top edge glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff9933]/50 to-transparent" />

          <div className="mb-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6]">Sign In</h2>
            <p className="text-[#cbb89d] text-sm mt-1">Welcome back — enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 mb-6 rounded-lg border border-[#ffb4ab]/30 bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="relative mb-6">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-[#1a1307] border border-white/20 rounded-lg py-3 pl-12 pr-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] focus:shadow-[0_0_5px_rgba(255,153,51,0.11)] transition-all"
              />
            </div>

            <div className="relative mb-6">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#1a1307] border border-white/20 rounded-lg py-3 pl-12 pr-12 text-[#f1e7d7] outline-none focus:border-[#ff9933] focus:shadow-[0_0_5px_rgba(255,153,51,0.11)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#cbb89d] hover:text-[#ff9933] transition-colors"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            <div className="flex justify-between items-center mb-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[#ff9933] w-4 h-4" />
                <span className="text-[#cbb89d] text-sm">Remember me</span>
              </label>
              <a href="#" className="text-[#ff9933] text-sm hover:text-[#ffbf66] transition-colors">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-xl font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">{submitting ? 'Authenticating…' : 'Authenticate'}</span>
              {!submitting && <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-8">
            <div className="absolute w-full h-[1px] bg-white/10" />
            <span className="relative px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider text-[#cbb89d] uppercase bg-[#2a2212]">
              Or continue with
            </span>
          </div>

          {/* Social */}
          <div className="flex gap-4">
            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[#f1e7d7] text-sm hover:bg-white/10 transition-colors">
              <Globe size={18} /> Google
            </button>
            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[#f1e7d7] text-sm hover:bg-white/10 transition-colors">
              <Smartphone size={18} /> Apple
            </button>
          </div>

          {/* Dev-only role shortcuts — removed from production builds */}
          {import.meta.env.DEV && (
            <div className="mt-8 rounded-lg border border-dashed border-[#ff9933]/25 bg-[#ff9933]/[0.03] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#ff9933]/70 mb-3">
                Dev quick login
              </p>
              <div className="flex gap-2">
                {DEV_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => quickLogin(account.email)}
                    className="flex-1 py-2 rounded-md bg-white/5 border border-white/10 text-[#cbb89d] text-xs font-medium hover:bg-[#ff9933]/10 hover:text-[#ff9933] hover:border-[#ff9933]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-8 text-[#cbb89d] text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#ff9933] font-semibold underline decoration-[#ff9933]/30 hover:decoration-[#ff9933] transition-all">
            Request Access
          </Link>
        </p>
      </div>
    </div>
  );
}
