import { useEffect, useState } from 'react';
import { CheckCircle, Clock, XCircle, Store, PackageX, FileText } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

const STATUS_META = {
  pending: { label: 'Pending Review', icon: <Clock size={16} />, badge: 'bg-[#c98a12]/20 text-[#ffd27a] border-[#ffd27a]/30' },
  approved: { label: 'Approved', icon: <CheckCircle size={16} />, badge: 'bg-[#ff9933]/10 text-[#ff9933] border-[#ff9933]/30' },
  rejected: { label: 'Rejected', icon: <XCircle size={16} />, badge: 'bg-[#93000a]/20 text-[#ffb4ab] border-[#ffb4ab]/30' },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function SellerRequests() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.mySellerApplications();
        if (active) setApplications(res.items ?? []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load applications.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const pending = applications.filter((a) => a.status === 'pending').length;
  const approved = applications.filter((a) => a.status === 'approved').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up flex flex-col gap-8">
      <header>
        <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">My Seller Applications</h1>
        <p className="text-[#cbb89d]">Track the status of your requests to open a storefront.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Application List */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {loading && (
            <GlassCard className="p-8 text-center text-[#cbb89d] text-sm">Loading applications...</GlassCard>
          )}

          {!loading && error && (
            <GlassCard className="p-8 text-center text-[#ffb4ab] text-sm">{error}</GlassCard>
          )}

          {!loading && !error && applications.length === 0 && (
            <GlassCard className="p-10 flex flex-col items-center gap-3 text-center">
              <FileText size={36} className="text-[#4b3d2a]" />
              <p className="text-[#f1e7d7] font-[Outfit] text-lg font-semibold">No applications yet</p>
              <p className="text-[#cbb89d] text-sm">Submit a seller application to start listing your products.</p>
            </GlassCard>
          )}

          {applications.map((app) => {
            const meta = STATUS_META[app.status] ?? { label: app.status, icon: null, badge: 'bg-white/10 text-[#cbb89d] border-white/10' };
            return (
              <GlassCard key={app.id} className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-[#ff9933]/10 rounded-full border border-[#ff9933]/20 shrink-0">
                      <Store className="text-[#ff9933]" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6]">{app.storeName}</h2>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.badge}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p className="text-[#cbb89d] text-sm mt-1">Contact: <span className="text-[#f1e7d7]">{app.contactEmail}</span></p>
                      <p className="text-[#9e8c73] text-xs mt-0.5">
                        Applied {formatDate(app.createdAt)}
                        {app.reviewedAt ? ` · Reviewed ${formatDate(app.reviewedAt)}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="bg-[#221708]/80 p-4 rounded-lg border border-[#ffd27a]/20 text-[#ffd27a] text-sm flex items-start gap-2">
                    <Clock size={16} className="shrink-0 mt-0.5" />
                    <p>Your application is under review. You will be notified once an administrator makes a decision.</p>
                  </div>
                )}
                {app.status === 'approved' && (
                  <div className="bg-[#221708]/80 p-4 rounded-lg border border-[#ff9933]/20 text-[#f1e7d7] text-sm flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#ff9933] shrink-0 mt-0.5" />
                    <p>Congratulations! Your storefront has been approved. Head to the seller dashboard to start selling.</p>
                  </div>
                )}
                {app.status === 'rejected' && (
                  <div className="bg-[#221708]/80 p-4 rounded-lg border border-[#ffb4ab]/20 text-[#f1e7d7] text-sm flex items-start gap-2">
                    <PackageX size={16} className="text-[#ffb4ab] shrink-0 mt-0.5" />
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
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6">Application Overview</h2>

            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-[#cbb89d] text-sm">Pending Review</span>
                <span className="font-[Outfit] text-2xl font-bold text-[#ffd27a]">{loading ? '—' : pending}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-[#cbb89d] text-sm">Approved</span>
                <span className="font-[Outfit] text-2xl font-bold text-[#ff9933]">{loading ? '—' : approved}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-[#cbb89d] text-sm">Rejected</span>
                <span className="font-[Outfit] text-2xl font-bold text-[#ffb4ab]">{loading ? '—' : rejected}</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#c98a12]/10 border border-[#ffd27a]/20 rounded-lg">
              <div className="flex gap-3">
                <Store className="text-[#ffd27a] shrink-0" size={20} />
                <p className="text-[#f1e7d7] text-sm leading-relaxed">
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
