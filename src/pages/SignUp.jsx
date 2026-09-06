import { useState, useEffect } from 'react';
import { User, Mail, Lock, EyeOff, Eye, ArrowRight, AlertCircle, Globe, Smartphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';
import { startGoogleOAuth, isGoogleOAuthConfigured } from '../lib/googleAuth';

// Account types offered at sign-up. Admin is never self-selectable — it is
// granted by the platform, not applied for.
const SIGNUP_ROLES = [
  { key: 'customer', label: 'Customer', hint: 'Shop the storefront' },
  { key: 'seller', label: 'Seller', hint: 'Sell your own products (reviewed)' },
];

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
      await startGoogleOAuth({ mode: 'signup', role });
      // The browser is about to leave for Google's consent screen.
    } catch (err) {
      setGoogleBusy(false);
      setError(err?.message || 'Could not start Google sign-up.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
      {/* Ambient glows inside the page context */}
      <div className="absolute w-[500px] h-[500px] bg-[#ff9933]/5 rounded-full blur-[80px] top-[10%] right-[10%] mix-blend-screen pointer-events-none animate-pulse" />
      <div className="absolute w-[600px] h-[600px] bg-[#c98a12]/5 rounded-full blur-[80px] bottom-[10%] left-[10%] mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-glow font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2">
            Create Account
          </h1>
          <p className="text-[#cbb89d]">Join the Future-Ready Commerce Platform</p>
        </div>

        <div className="glass-panel rounded-2xl p-10 relative overflow-hidden">
          {/* Top edge glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff9933]/50 to-transparent" />

          {error && (
            <div className="flex items-start gap-2 mb-6 rounded-lg border border-[#ffb4ab]/30 bg-[#93000a]/20 px-4 py-3 text-sm text-[#ffb4ab]">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp}>
            <div className="relative mb-6">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={20} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-[#1a1307] border border-white/20 rounded-lg py-3 pl-12 pr-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] focus:shadow-[0_0_5px_rgba(255,153,51,0.11)] transition-all"
              />
            </div>

            <div className="relative mb-6">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-[#1a1307] border border-white/20 rounded-lg py-3 pl-12 pr-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] focus:shadow-[0_0_5px_rgba(255,153,51,0.11)] transition-all"
              />
            </div>

            <div className="relative mb-8">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
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

            {/* Account type — admin is never offered here */}
            <div className="mb-6">
              <p className="text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2">
                I want to sign up as
              </p>
              <div className="flex flex-col gap-2">
                {SIGNUP_ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                        active
                          ? 'bg-[#ff9933]/15 border-[#ff9933]/50 text-[#fff4e6]'
                          : 'bg-white/5 border-white/10 text-[#cbb89d] hover:bg-white/10 hover:text-[#f1e7d7]'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-[Outfit] font-semibold text-sm">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-[#ff9933]' : 'border-white/25'}`}>
                          {active && <span className="w-2 h-2 rounded-full bg-[#ff9933]" />}
                        </span>
                        {r.label}
                      </span>
                      <span className={`text-[11px] ${active ? 'text-[#cbb89d]' : 'text-[#9e8c73]'}`}>{r.hint}</span>
                    </button>
                  );
                })}
              </div>
              {role === 'seller' && (
                <p className="text-[#ffd27a] text-xs mt-2">
                  Seller accounts need admin approval before you can list products.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-xl font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">{submitting ? 'Creating…' : 'Create Account'}</span>
              {!submitting && <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-8">
            <div className="absolute w-full h-[1px] bg-white/10" />
            <span className="relative px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider text-[#cbb89d] uppercase bg-[#2a2212]">
              Or sign up with
            </span>
          </div>

          {/* Social — the account type chosen above is attached to the sign-up */}
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
          {role === 'seller' && (
            <p className="text-[10px] text-[#9e8c73] mt-3 leading-relaxed text-center">
              Signing up as a Seller with Google still requires admin approval before you can list products.
            </p>
          )}
          {!isGoogleOAuthConfigured && (
            <p className="text-[10px] text-[#c98a12] mt-2 leading-relaxed">
              Google sign-up needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, plus the provider
              enabled in Supabase.
            </p>
          )}
        </div>

        <p className="text-center mt-8 text-[#cbb89d] text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#ff9933] font-semibold underline decoration-[#ff9933]/30 hover:decoration-[#ff9933] transition-all">
            Authenticate Here
          </Link>
        </p>
      </div>
    </div>
  );
}
