import { useState, useEffect } from 'react';
import { ShoppingCart, Mail, Lock, EyeOff, Eye, ArrowRight, Globe, Smartphone, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { startGoogleOAuth, isGoogleOAuthConfigured } from '../lib/googleAuth';

// Role the person intends to sign in as. This is only a UX guard — the real
// role still comes from the server. If the selection mismatches the account,
// we say so instead of silently dropping them somewhere unexpected.
const LOGIN_ROLES = [
  { key: 'customer', label: 'Customer' },
  { key: 'seller', label: 'Seller' },
  { key: 'admin', label: 'Admin' },
];
const ROLE_LABELS = { admin: 'Admin', seller: 'Seller', customer: 'Customer' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const { login, logout, user } = useAuth();
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
      const account = await login(email.trim(), password);
      // Optional "signing in as" guard: if the chosen role doesn't match the
      // account's real role, refuse rather than bounce them into the wrong area.
      if (selectedRole && account?.role && account.role !== selectedRole) {
        logout();
        setSubmitting(false);
        setError(
          `There is no ${ROLE_LABELS[selectedRole] ?? selectedRole} account for this email — it is registered as ${ROLE_LABELS[account.role] ?? account.role}. Select the correct option, or sign up with this role using a different email.`
        );
        return;
      }
      // Navigation is handled by the effect above once `user` is set.
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      await startGoogleOAuth({ mode: 'login', role: selectedRole || undefined });
      // The browser is about to leave for Google's consent screen.
    } catch (err) {
      setGoogleBusy(false);
      setError(err?.message || 'Could not start Google sign-in.');
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:py-10">
      {/* Ambient glows, clipped to the page so they never widen the viewport */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-[#ff9933]/5 rounded-full blur-[80px] top-[10%] left-[10%] mix-blend-screen animate-pulse" />
        <div className="absolute w-[600px] h-[600px] bg-[#c98a12]/5 rounded-full blur-[80px] bottom-[10%] right-[10%] mix-blend-screen" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-glow font-[Outfit] text-4xl sm:text-5xl font-bold text-[#fff4e6] flex items-center justify-center gap-2">
            <ShoppingCart size={36} className="sm:hidden" />
            <ShoppingCart size={40} className="hidden sm:block" />
            NovaMarket
          </h1>
          <p className="text-[#cbb89d] mt-2">Future-Ready Commerce Portal</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-10 relative overflow-hidden">
          {/* Top edge glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff9933]/50 to-transparent" />

          <div className="mb-6">
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
            <div className="relative mb-4 sm:mb-6">
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

            <div className="relative mb-4 sm:mb-6">
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

            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[#ff9933] w-4 h-4" />
                <span className="text-[#cbb89d] text-sm">Remember me</span>
              </label>
              <a href="#" className="text-[#ff9933] text-sm hover:text-[#ffbf66] transition-colors">Forgot Password?</a>
            </div>

            {/* Optional role guard: verify the account is the role they expect */}
            <div className="mb-5">
              <p className="text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2">
                Signing in as
              </p>
              <div className="flex flex-wrap gap-2">
                {LOGIN_ROLES.map((r) => {
                  const active = selectedRole === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedRole(active ? '' : r.key)}
                      className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase border transition-all ${
                        active
                          ? 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/40'
                          : 'bg-white/5 text-[#cbb89d] border-white/10 hover:bg-white/10 hover:text-[#f1e7d7]'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[#9e8c73] text-xs mt-2">
                {selectedRole
                  ? `We'll check this account actually is a ${ROLE_LABELS[selectedRole]} before signing you in.`
                  : 'Optional — leave unselected to go straight to your account.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 sm:py-3.5 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-lg sm:text-xl font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">{submitting ? 'Authenticating…' : 'Authenticate'}</span>
              {!submitting && <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute w-full h-[1px] bg-white/10" />
            <span className="relative px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider text-[#cbb89d] uppercase bg-[#2a2212]">
              Or continue with
            </span>
          </div>

          {/* Social */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleBusy || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[#f1e7d7] text-sm hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Globe size={18} /> {googleBusy ? 'Redirecting…' : 'Google'}
            </button>
            <button
              type="button"
              disabled
              title="Apple sign-in is not available yet"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[#f1e7d7]/40 text-sm cursor-not-allowed"
            >
              <Smartphone size={18} /> Apple
            </button>
          </div>
          {!isGoogleOAuthConfigured && (
            <p className="text-[10px] text-[#c98a12] mt-3 leading-relaxed">
              Google sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, plus the
              provider enabled in Supabase.
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-[#cbb89d] text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#ff9933] font-semibold underline decoration-[#ff9933]/30 hover:decoration-[#ff9933] transition-all">
            Request Access
          </Link>
        </p>
      </div>
    </div>
  );
}
