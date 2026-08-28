import { useState, useEffect } from 'react';
import { User, Mail, Lock, EyeOff, Eye, ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register, user } = useAuth();
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
      await register({ email: email.trim(), password, fullName: fullName.trim() });
      // Navigation is handled by the effect above once `user` is set.
    } catch (err) {
      setError(err?.message || 'Could not create your account. Please try again.');
      setSubmitting(false);
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
