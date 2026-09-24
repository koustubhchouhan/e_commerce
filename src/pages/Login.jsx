import { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isGoogleOAuthConfigured } from '../lib/googleAuthConfig';
import { POLICY_LINKS } from '../lib/business';

// Role the person intends to sign in as. This is only a UX guard — the real
// role still comes from the server. If the selection mismatches the account,
// we say so instead of silently dropping them somewhere unexpected.
const LOGIN_ROLES = [
  { key: 'customer', label: 'Customer' },
  { key: 'seller', label: 'Seller' },
  { key: 'admin', label: 'Admin' },
];
const ROLE_LABELS = { admin: 'Admin', seller: 'Seller', customer: 'Customer' };

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

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
      // Loaded on demand so the Supabase client stays out of the first-load
      // bundle; it is only needed once the user actually chooses Google.
      const { startGoogleOAuth } = await import('../lib/googleAuth');
      await startGoogleOAuth({ mode: 'login', role: selectedRole || undefined });
      // The browser is about to leave for Google's consent screen.
    } catch (err) {
      setGoogleBusy(false);
      setError(err?.message || 'Could not start Google sign-in.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FDF8F0] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-5xl">
        <div className="grid md:grid-cols-2 rounded-[2rem] overflow-hidden border border-[#E7DAC8] shadow-[0_24px_60px_rgba(60,40,25,0.12)]">

          {/* ── Left: brand panel ── */}
          <div className="relative bg-[#B7322A] text-[#FDF8F0] p-8 sm:p-12 flex flex-col justify-between min-h-[260px] md:min-h-[560px]">
            <div
              className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#8F2620]/40"
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-2">
              <span className="w-9 h-9 rounded-full bg-[#E0A11C] text-[#231A16] flex items-center justify-center font-display font-bold">
                N
              </span>
              <span className="font-display text-xl font-semibold">Arghya</span>
            </div>

            <div className="relative mt-8">
              <p className="font-display text-2xl text-[#E0A11C] mb-3">नमस्ते</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold leading-tight max-w-sm">
                Everything the everyday asks for.
              </h2>
              <p className="text-[#FDF8F0]/80 text-sm mt-4 max-w-sm leading-relaxed">
                Verified sellers, secure payments and honest pricing — from daily essentials to
                festival specials, delivered to your door.
              </p>
            </div>

            <div className="relative mt-8 hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#FDF8F0]/75">
              <span>Verified sellers</span>
              <span className="w-1 h-1 rounded-full bg-[#FDF8F0]/40" />
              <span>Secure payments</span>
              <span className="w-1 h-1 rounded-full bg-[#FDF8F0]/40" />
              <span>Pan-India delivery</span>
            </div>
          </div>

          {/* ── Right: form panel ── */}
          <div className="bg-[#FDF8F0] p-8 sm:p-12">
            <h1 className="font-display text-3xl font-semibold text-[#231A16]">Sign in</h1>
            <p className="text-sm text-[#7A6A5B] mt-2">
              New here?{' '}
              <Link to="/signup" className="text-[#B7322A] font-semibold underline decoration-[#B7322A]/30 hover:decoration-[#B7322A] transition-all">
                Create an account
              </Link>
            </p>

            {error && (
              <div className="flex items-start gap-2 mt-6 rounded-2xl border border-[#B3261E]/30 bg-[#FBE3E1]/40 px-4 py-3 text-sm text-[#B3261E]">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6">
              <div className="mb-4">
                <label htmlFor="login-email" className="micro-label block mb-2">Email or mobile</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="login-password" className="micro-label block mb-2">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B7322A] text-sm font-semibold hover:text-[#8F2620] transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#B7322A] w-4 h-4 rounded" />
                  <span className="text-[#7A6A5B] text-sm">Keep me signed in</span>
                </label>
                <a href="#" className="text-[#B7322A] text-sm font-medium hover:text-[#8F2620] transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Optional role guard: verify the account is the role they expect */}
              <div className="mb-6">
                <p className="micro-label mb-2">Signing in as</p>
                <div className="flex flex-wrap gap-2">
                  {LOGIN_ROLES.map((r) => {
                    const active = selectedRole === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setSelectedRole(active ? '' : r.key)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                          active
                            ? 'bg-[#B7322A] text-[#FDF8F0] border-[#B7322A]'
                            : 'bg-transparent text-[#7A6A5B] border-[#E3D5C1] hover:border-[#B7322A]/40 hover:text-[#2A211B]'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[#A79684] text-xs mt-2">
                  {selectedRole
                    ? `We'll check this account actually is a ${ROLE_LABELS[selectedRole]} before signing you in.`
                    : 'Optional — leave unselected to go straight to your account.'}
                </p>
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3.5 text-base">
                {submitting ? 'Signing in…' : 'Sign in'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute w-full h-px bg-[#E3D5C1]" />
              <span className="relative px-3 text-[11px] font-medium tracking-wide text-[#A79684] uppercase bg-[#FDF8F0]">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleBusy || submitting}
              className="btn w-full py-3 border-[1.5px] border-[#E3D5C1] bg-transparent text-[#2A211B] text-sm hover:border-[#B7322A]/40 hover:bg-[#FBF3E7]"
            >
              <GoogleMark /> {googleBusy ? 'Redirecting…' : 'Continue with Google'}
            </button>
            {!isGoogleOAuthConfigured && (
              <p className="text-[10px] text-[#B8860B] mt-3 leading-relaxed">
                Google sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, plus the
                provider enabled in Supabase.
              </p>
            )}

            <p className="text-center text-[11px] text-[#A79684] mt-6 leading-relaxed">
              By continuing you accept the{' '}
              <Link to="/terms" className="text-[#B7322A] hover:underline">Terms</Link> and{' '}
              <Link to="/privacy" className="text-[#B7322A] hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {POLICY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-[#A79684] text-xs hover:text-[#B7322A] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
