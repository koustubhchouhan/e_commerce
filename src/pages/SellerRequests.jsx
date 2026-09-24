import { useEffect, useState } from 'react';
import { CheckCircle, Clock, XCircle, Store, PackageX, FileText, Send } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';

const STATUS_META = {
  pending: { label: 'Pending Review', icon: <Clock size={16} />, badge: 'bg-[#B8860B]/20 text-[#C8901A] border-[#C8901A]/30' },
  approved: { label: 'Approved', icon: <CheckCircle size={16} />, badge: 'bg-[#B7322A]/10 text-[#B7322A] border-[#B7322A]/30' },
  rejected: { label: 'Rejected', icon: <XCircle size={16} />, badge: 'bg-[#FBE3E1]/20 text-[#B3261E] border-[#B3261E]/30' },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function SellerRequests() {
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storeName, setStoreName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.mySellerApplications();
      setApplications(res.items ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A user may apply when they have no pending or approved application.
  const hasActiveApplication = applications.some(
    (a) => a.status === 'pending' || a.status === 'approved',
  );
  const canApply = !loading && !hasActiveApplication;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = storeName.trim();
    const email = contactEmail.trim();
    if (!name || !email || submitting) return;
    setSubmitting(true);
    try {
      await api.createSellerApplication({ store_name: name, contact_email: email });
      setStoreName('');
      addToast('Application submitted! It is now pending review.', 'success');
      await loadApplications();
    } catch (err) {
      addToast(err.message || 'Failed to submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pending = applications.filter((a) => a.status === 'pending').length;
  const approved = applications.filter((a) => a.status === 'approved').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up flex flex-col gap-8">
      <header>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">My Seller Applications</h1>
        <p className="text-[#7A6A5B]">Track the status of your requests to open a storefront.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Application List */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Become a Seller form */}
          {canApply && (
            <GlassCard className="p-8 border-t-4 border-t-[#B7322A]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#B7322A]/10 rounded-full border border-[#B7322A]/20">
                  <Store className="text-[#B7322A]" size={22} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#231A16]">Become a Seller</h2>
                  <p className="text-[#7A6A5B] text-sm">Set up your storefront and start listing products.</p>
                </div>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Store Name <span className="text-[#B3261E]">*</span></label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. NeonTech Store"
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                  />
                </div>
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Contact Email <span className="text-[#B3261E]">*</span></label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!storeName.trim() || !contactEmail.trim() || submitting}
                  className={`w-full py-3 rounded-xl font-display text-base font-semibold flex items-center justify-center gap-2 transition-all ${
                    storeName.trim() && contactEmail.trim() && !submitting
                      ? 'bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)]'
                      : 'bg-[#F0E7DA]/50 text-[#8A7B6B] cursor-not-allowed'
                  }`}
                >
                  <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </GlassCard>
          )}

          {loading && (
            <GlassCard className="p-8 text-center text-[#7A6A5B] text-sm">Loading applications...</GlassCard>
          )}

          {!loading && error && (
            <GlassCard className="p-8 text-center text-[#B3261E] text-sm">{error}</GlassCard>
          )}

          {!loading && !error && applications.length === 0 && (
            <GlassCard className="p-10 flex flex-col items-center gap-3 text-center">
              <FileText size={36} className="text-[#C4B5A2]" />
              <p className="text-[#2A211B] font-display text-lg font-semibold">No applications yet</p>
              <p className="text-[#7A6A5B] text-sm">Fill in the form above to start selling on the platform.</p>
            </GlassCard>
          )}

          {applications.map((app) => {
            const meta = STATUS_META[app.status] ?? { label: app.status, icon: null, badge: 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10' };
            return (
              <GlassCard key={app.id} className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-[#B7322A]/10 rounded-full border border-[#B7322A]/20 shrink-0">
                      <Store className="text-[#B7322A]" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="font-display text-xl font-semibold text-[#231A16]">{app.storeName}</h2>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.badge}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p className="text-[#7A6A5B] text-sm mt-1">Contact: <span className="text-[#2A211B]">{app.contactEmail}</span></p>
                      <p className="text-[#8A7B6B] text-xs mt-0.5">
                        Applied {formatDate(app.createdAt)}
                        {app.reviewedAt ? ` · Reviewed ${formatDate(app.reviewedAt)}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="bg-[#F5ECDE]/80 p-4 rounded-xl border border-[#C8901A]/20 text-[#C8901A] text-sm flex items-start gap-2">
                    <Clock size={16} className="shrink-0 mt-0.5" />
                    <p>Your application is under review. You will be notified once an administrator makes a decision.</p>
                  </div>
                )}
                {app.status === 'approved' && (
                  <div className="bg-[#F5ECDE]/80 p-4 rounded-xl border border-[#B7322A]/20 text-[#2A211B] text-sm flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#B7322A] shrink-0 mt-0.5" />
                    <p>Congratulations! Your storefront has been approved. Head to the seller dashboard to start selling.</p>
                  </div>
                )}
                {app.status === 'rejected' && (
                  <div className="bg-[#F5ECDE]/80 p-4 rounded-xl border border-[#B3261E]/20 text-[#2A211B] text-sm flex items-start gap-2">
                    <PackageX size={16} className="text-[#B3261E] shrink-0 mt-0.5" />
                    <p>Unfortunately your application was rejected. You may submit a new application at any time.</p>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>

        {/* Right Column: Status Summary */}
        <div className="lg:col-span-1">
          <GlassCard className="p-8 sticky top-28">
            <h2 className="font-display text-2xl font-semibold text-[#231A16] mb-6">Application Overview</h2>

            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-[#231a16]/10 pb-4">
                <span className="text-[#7A6A5B] text-sm">Pending Review</span>
                <span className="font-display text-2xl font-bold text-[#C8901A]">{loading ? '—' : pending}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#231a16]/10 pb-4">
                <span className="text-[#7A6A5B] text-sm">Approved</span>
                <span className="font-display text-2xl font-bold text-[#B7322A]">{loading ? '—' : approved}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-[#7A6A5B] text-sm">Rejected</span>
                <span className="font-display text-2xl font-bold text-[#B3261E]">{loading ? '—' : rejected}</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#B8860B]/10 border border-[#C8901A]/20 rounded-xl">
              <div className="flex gap-3">
                <Store className="text-[#C8901A] shrink-0" size={20} />
                <p className="text-[#2A211B] text-sm leading-relaxed">
                  {pending > 0
                    ? `You have ${pending} pending application${pending === 1 ? '' : 's'}. Decisions are typically made within a few days.`
                    : approved > 0
                      ? 'Your storefront is live. Manage products and orders from the seller dashboard.'
                      : 'Submit a seller application to start selling on the platform.'}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
