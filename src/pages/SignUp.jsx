import { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';
import { isGoogleOAuthConfigured } from '../lib/googleAuthConfig';

// Account types offered at sign-up. Admin is never self-selectable — it is
// granted by the platform, not applied for.
const SIGNUP_ROLES = [
  { key: 'customer', label: 'Customer', hint: 'Shop the storefront' },
  { key: 'seller', label: 'Seller', hint: 'Sell your own products (reviewed)' },
];

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

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const { register, user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  // Redirect only once auth state has committed, to avoid racing ProtectedRoute
  // (which would otherwise read a stale "guest" role and bounce back to /login).
  useEffect(() => {
    if (user) {
      navigate(user.role === 'seller' ? '/seller' : user.role === 'admin' ? '/admin' : '/home', { replace: true });
    }
  }, [user, navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      });
      if (data.sellerApplication?.status === 'pending') {
        addToast(
          `Your store "${data.sellerApplication.storeName}" is pending admin approval. You'll get seller access once it's approved.`
        );
      }
      // Navigation is handled by the effect above once `user` is set.
    } catch (err) {
      setError(err?.message || 'Could not create your account. Please try again.');
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
      await startGoogleOAuth({ mode: 'signup', role });
      // The browser is about to leave for Google's consent screen.
    } catch (err) {
      setGoogleBusy(false);
      setError(err?.message || 'Could not start Google sign-up.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FDF8F0] flex items-center justify-center px-4 py-4 sm:py-12">
      <div className="w-full max-w-5xl">
        <div className="grid md:grid-cols-2 rounded-[2rem] overflow-hidden border border-[#E7DAC8] shadow-[0_24px_60px_rgba(60,40,25,0.12)]">

          {/* ── Left: brand panel ── */}
          <div className="relative bg-[#B7322A] text-[#FDF8F0] p-6 sm:p-12 flex flex-col justify-between md:min-h-[620px]">
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

            <div className="relative mt-5 sm:mt-8">
              <p className="font-display text-xl sm:text-2xl text-[#E0A11C] mb-2 sm:mb-3">स्वागत</p>
              <h2 className="font-display text-2xl sm:text-4xl font-semibold leading-tight max-w-sm">
                Join a market built on trust.
              </h2>
              <p className="hidden sm:block text-[#FDF8F0]/80 text-sm sm:mt-4 max-w-sm leading-relaxed">
                Create your account to track orders, save addresses and unlock member-only
                pricing across the storefront.
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
          <div className="bg-[#FDF8F0] p-6 sm:p-12">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#231A16]">Create account</h1>
            <p className="text-sm text-[#7A6A5B] mt-1.5 sm:mt-2">
              Already registered?{' '}
              <Link to="/login" className="text-[#B7322A] font-semibold underline decoration-[#B7322A]/30 hover:decoration-[#B7322A] transition-all">
                Sign in
              </Link>
            </p>

            {error && (
              <div className="flex items-start gap-2 mt-4 sm:mt-6 rounded-2xl border border-[#B3261E]/30 bg-[#FBE3E1]/40 px-4 py-3 text-sm text-[#B3261E]">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignUp} className="mt-4 sm:mt-6">
              <div className="mb-3 sm:mb-4">
                <label htmlFor="signup-name" className="micro-label block mb-2">Full name</label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="field"
                />
              </div>

              <div className="mb-3 sm:mb-4">
                <label htmlFor="signup-email" className="micro-label block mb-2">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field"
                />
              </div>

              <div className="mb-3 sm:mb-4">
                <label htmlFor="signup-password" className="micro-label block mb-2">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
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

              {/* Account type — admin is never offered here */}
              <div className="mb-4 sm:mb-6">
                <p className="micro-label mb-2">I want to sign up as</p>
                <div className="flex flex-col gap-2">
                  {SIGNUP_ROLES.map((r) => {
                    const active = role === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key)}
                        className={`flex items-center justify-between gap-3 px-4 py-2.5 sm:py-3 rounded-2xl border text-left transition-all ${
                          active
                            ? 'bg-[#FBE3E1]/40 border-[#B7322A] text-[#231A16]'
                            : 'bg-transparent border-[#E3D5C1] text-[#7A6A5B] hover:border-[#B7322A]/40'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 font-medium text-sm">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-[#B7322A]' : 'border-[#C4B5A2]'}`}>
                            {active && <span className="w-2 h-2 rounded-full bg-[#B7322A]" />}
                          </span>
                          {r.label}
                        </span>
                        <span className="text-[11px] text-[#A79684] text-right">{r.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {role === 'seller' && (
                  <p className="text-[#C8901A] text-xs mt-2">
                    Seller accounts need admin approval before you can list products.
                  </p>
                )}
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3.5 text-base">
                {submitting ? 'Creating account…' : 'Create account'}
                {!submitting && <ArrowRight size={18} />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4 sm:my-6">
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
            {role === 'seller' && (
              <p className="text-[10px] text-[#A79684] mt-3 leading-relaxed text-center">
                Signing up as a Seller with Google still requires admin approval before you can list products.
              </p>
            )}
            {!isGoogleOAuthConfigured && (
              <p className="text-[10px] text-[#B8860B] mt-2 leading-relaxed">
                Google sign-up needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, plus the provider
                enabled in Supabase.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
