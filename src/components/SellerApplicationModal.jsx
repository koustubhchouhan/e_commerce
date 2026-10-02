import { useEffect, useRef, useState } from 'react';
import { Store, X, Send, Clock, CheckCircle, Loader2, Phone, ImagePlus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';

const inputClass =
  'w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]';
const labelClass = 'block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2';

// Customer-facing "Become a Seller" flow. Opened from the customer profile;
// submits a seller_application which an admin reviews in Seller Approvals.
// Mounted only while open, so initial state comes straight from the user.
export default function SellerApplicationModal({ onClose, onChange }) {
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);

  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [storefrontFile, setStorefrontFile] = useState(null);
  const [storefrontPreview, setStorefrontPreview] = useState('');
  const [storefrontUrl, setStorefrontUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(null);
  const previewRef = useRef('');

  const setPreview = (url) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setStorefrontPreview(url);
  };

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const handleStorefrontChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setStorefrontFile(file);
    setStorefrontUrl('');
    setPreview(file ? URL.createObjectURL(file) : '');
  };

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

  const canSubmit =
    storeName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    contactPhone.trim().length > 0 &&
    Boolean(storefrontFile);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting || uploading) return;
    const name = storeName.trim();
    const email = contactEmail.trim();
    const phone = contactPhone.trim();
    setSubmitting(true);
    try {
      let imageUrl = storefrontUrl;
      if (!imageUrl) {
        setUploading(true);
        const uploaded = await api.uploadStorefrontImage(storefrontFile);
        imageUrl = uploaded.url;
        setStorefrontUrl(imageUrl);
      }
      await api.createSellerApplication({
        store_name: name,
        contact_email: email,
        contact_phone: phone,
        storefront_image_url: imageUrl,
      });
      addToast('Application submitted! An admin will review it shortly.', 'success');
      onChange?.();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit application.', 'error');
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 animate-fade-in"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Seller application"
    >
      <div
        className="glass-panel rounded-xl w-full max-w-lg animate-scale-in max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#231a16]/10 shrink-0">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#231A16] flex items-center gap-2">
              <Store className="text-[#B7322A]" size={24} /> Become a Seller
            </h2>
            <p className="text-[#7A6A5B] text-xs mt-1">
              Open your storefront and start listing products.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 transition-colors"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[#7A6A5B] text-sm">
              <Loader2 size={18} className="animate-spin" /> Checking your applications...
            </div>
          ) : existing ? (
            <div className="flex flex-col gap-4">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  existing.status === 'approved'
                    ? 'border-[#B7322A]/30 bg-[#B7322A]/10 text-[#2A211B]'
                    : 'border-[#C8901A]/30 bg-[#B8860B]/10 text-[#2A211B]'
                }`}
              >
                {existing.status === 'approved' ? (
                  <CheckCircle size={18} className="text-[#B7322A] shrink-0 mt-0.5" />
                ) : (
                  <Clock size={18} className="text-[#C8901A] shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{existing.storeName}</p>
                  <p className="text-[#7A6A5B] text-xs mt-1">
                    {existing.status === 'approved'
                      ? 'Approved. Your storefront is live.'
                      : 'Under review. An admin will approve your storefront shortly.'}
                  </p>
                  {existing.contactPhone && (
                    <p className="text-[#7A6A5B] text-xs mt-1 flex items-center gap-1">
                      <Phone size={12} /> {existing.contactPhone}
                    </p>
                  )}
                  {existing.storefrontImageUrl && (
                    <img
                      src={existing.storefrontImageUrl}
                      alt="Storefront"
                      loading="lazy"
                      decoding="async"
                      className="mt-3 w-full h-32 object-cover rounded-lg border border-[#231a16]/10"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <label className={labelClass}>
                  Store Name <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Shubh Puja Store"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Contact Email <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Mobile Number <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Storefront Photo <span className="text-[#B3261E]">*</span>
                </label>
                <p className="text-[#8A7B6B] text-xs mb-2 -mt-1">
                  A clear photo of your shop or stall, so an admin can verify it exists.
                </p>
                {storefrontPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#231a16]/10">
                    <img src={storefrontPreview} alt="Storefront preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview('');
                        setStorefrontFile(null);
                        setStorefrontUrl('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-[#FDF8F0] hover:bg-black/80 transition-colors"
                      aria-label="Remove storefront photo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-6 rounded-xl border border-dashed border-[#231a16]/20 bg-[#F5ECDE]/50 text-[#7A6A5B] text-sm cursor-pointer hover:border-[#B7322A]/40 transition-colors">
                    <ImagePlus size={22} className="text-[#B7322A]" />
                    Tap to upload a storefront photo
                    <input type="file" accept="image/*" onChange={handleStorefrontChange} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-[#8A7B6B] text-xs -mt-1">
                Seller accounts need admin approval before you can list products.
              </p>
              <div className="flex items-center justify-end gap-3 border-t border-[#231a16]/10 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting || uploading}
                  className={`px-6 py-2.5 rounded-xl font-display text-sm font-bold flex items-center gap-2 transition-all ${
                    canSubmit && !submitting && !uploading
                      ? 'bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)]'
                      : 'bg-[#F0E7DA]/50 text-[#8A7B6B] cursor-not-allowed'
                  }`}
                >
                  {submitting || uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {uploading ? 'Uploading photo...' : submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
