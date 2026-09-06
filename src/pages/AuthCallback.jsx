import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';
import { finishGoogleOAuth } from '../lib/googleAuth';
import { ShoppingCart } from 'lucide-react';

const ROLE_LABELS = { admin: 'Admin', seller: 'Seller', customer: 'Customer' };

const routeForRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'seller') return '/seller';
  return '/home';
};

// Landing page for the OAuth redirect (Google). Reads the session the Supabase
// client recovered, swaps it for our app session through the backend, then
// routes by the real role — or surfaces an error and sends the user back.
export default function AuthCallback() {
  const { loginWithGoogle, logout } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    (async () => {
      const { intent, session, error } = await finishGoogleOAuth();
      if (!active) return;

      if (error || !session) {
        addToast(error?.message || 'Google sign-in could not be completed.', 'error');
        navigate(intent.mode === 'signup' ? '/signup' : '/login', { replace: true });
        return;
      }

      try {
        const data = await loginWithGoogle(
          {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at ?? null,
          },
          { mode: intent.mode === 'signup' ? 'signup' : 'login', role: intent.role ?? undefined }
        );

        if (!active) return;

        // Login page had "I'm signing in as X" selected, but Google resolved to
        // an account with a different role — treat it like the password login.
        if (intent.mode !== 'signup' && intent.role && data.user?.role !== intent.role) {
          logout();
          addToast(
            `No ${ROLE_LABELS[intent.role] ?? intent.role} account for this Google email — it is a ${ROLE_LABELS[data.user?.role] ?? 'different'} account.`,
            'error'
          );
          navigate('/login', { replace: true });
          return;
        }

        if (data.sellerApplication?.status === 'pending') {
          addToast(
            `Your store "${data.sellerApplication.storeName}" is pending admin approval. You'll get seller access once it's approved.`
          );
        }

        navigate(routeForRole(data.user?.role), { replace: true });
      } catch (err) {
        if (!active) return;
        addToast(err?.message || 'Could not finish Google sign-in.', 'error');
        navigate(intent.mode === 'signup' ? '/signup' : '/login', { replace: true });
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <ShoppingCart size={32} className="text-[#ff9933]" />
          <span className="text-glow font-[Outfit] text-3xl font-bold text-[#fff4e6]">NovaMarket</span>
        </div>
        <p className="text-[#cbb89d] animate-pulse">Completing Google sign-in…</p>
      </div>
    </div>
  );
}
