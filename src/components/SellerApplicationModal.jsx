import { useEffect, useState } from 'react';
import { Store, X, Send, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';

const inputClass =
  'w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all placeholder:text-[#6f6048]';
const labelClass = 'block text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2';

// Customer-facing "Become a Seller" flow. Opened from the customer profile;
// submits a seller_application which an admin reviews in Seller Approvals.
// Mounted only while open, so initial state comes straight from the user.
export default function SellerApplicationModal({ onClose, onChange }) {
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);

  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.mySellerApplications();
        const apps = res.items ?? [];
        const activeApp =
          apps.find((a) => a.status === 'pending' || a.status === 'approved') ?? null;
        if (active) setExisting(activeApp);
      } catch {
        // Non-fatal: the form can still be shown.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = storeName.trim();
    const email = contactEmail.trim();
    if (!name || !email || submitting) return;
    setSubmitting(true);
    try {
      await api.createSellerApplication({ store_name: name, contact_email: email });
      addToast('Application submitted! An admin will review it shortly.', 'success');
      onChange?.();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Seller application"
    >
      <div
        className="glass-panel rounded-xl w-full max-w-lg animate-scale-in overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] flex items-center gap-2">
              <Store className="text-[#ff9933]" size={24} /> Become a Seller
            </h2>
            <p className="text-[#cbb89d] text-xs mt-1">
              Open your storefront and start listing products.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#cbb89d] text-sm">
              <Loader2 size={18} className="animate-spin" /> Checking your applications...
            </div>
          ) : existing ? (
            <div className="flex flex-col gap-4">
              <div
                className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
                  existing.status === 'approved'
                    ? 'border-[#ff9933]/30 bg-[#ff9933]/10 text-[#f1e7d7]'
                    : 'border-[#ffd27a]/30 bg-[#c98a12]/10 text-[#f1e7d7]'
                }`}
              >
                {existing.status === 'approved' ? (
                  <CheckCircle size={18} className="text-[#ff9933] shrink-0 mt-0.5" />
                ) : (
                  <Clock size={18} className="text-[#ffd27a] shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{existing.storeName}</p>
                  <p className="text-[#cbb89d] text-xs mt-1">
                    {existing.status === 'approved'
                      ? 'Approved. Your storefront is live.'
                      : 'Under review. An admin will approve your storefront shortly.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <label className={labelClass}>
                  Store Name <span className="text-[#ffb4ab]">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. NeonTech Store"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Contact Email <span className="text-[#ffb4ab]">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              <p className="text-[#9e8c73] text-xs -mt-1">
                Seller accounts need admin approval before you can list products.
              </p>
              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!storeName.trim() || !contactEmail.trim() || submitting}
                  className={`px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold flex items-center gap-2 transition-all ${
                    storeName.trim() && contactEmail.trim() && !submitting
                      ? 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)]'
                      : 'bg-[#34250f]/50 text-[#6f6048] cursor-not-allowed'
                  }`}
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
