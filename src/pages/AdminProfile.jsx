import { useEffect, useState } from 'react';
import { Shield, Users, UserCheck, Store, Check, X, Clock, CheckCircle, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';

const timeAgo = (iso) => {
  if (!iso) return 'recently';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const formatSince = (iso) => {
  if (!iso) return 'recently';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export default function AdminProfile() {
  const [requests, setRequests] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqs, sellers] = await Promise.all([
        api.adminApplications('pending'),
        api.adminSellers(),
      ]);
      setRequests(
        (reqs ?? []).map((r) => ({
          id: r.id,
          store: r.storeName,
          name: r.applicant ?? '—',
          email: r.contactEmail,
          date: timeAgo(r.createdAt),
        })),
      );
      setApproved(
        (sellers ?? []).map((s) => ({
          id: s.id,
          store: s.store?.name ?? 'Store',
          name: s.fullName ?? '—',
          email: s.store?.id ? '' : '',
          since: formatSince(s.joinedAt),
        })),
      );
    } catch (err) {
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveSeller = async (id) => {
    const req = requests.find((r) => r.id === id);
    setBusy(true);
    try {
      await api.reviewApplication(id, 'approve');
      addToast(`"${req?.store ?? 'Store'}" approved as a verified seller!`, 'success');
      await loadAll();
    } catch (err) {
      addToast(err.message || 'Failed to approve seller.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const rejectSeller = async (id) => {
    const req = requests.find((r) => r.id === id);
    setBusy(true);
    try {
      await api.reviewApplication(id, 'reject');
      addToast(`"${req?.store ?? 'Request'}" application rejected.`, 'error');
      await loadAll();
    } catch (err) {
      addToast(err.message || 'Failed to reject application.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revokeSeller = async (id) => {
    const s = approved.find((a) => a.id === id);
    setBusy(true);
    try {
      await api.revokeSeller(id);
      addToast(`"${s?.store ?? 'Seller'}" access revoked.`, 'error');
      await loadAll();
    } catch (err) {
      addToast(err.message || 'Failed to revoke seller.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-20 flex flex-col gap-10 animate-fade-in-up">

      <section className="w-full flex flex-col md:flex-row items-start md:items-center gap-6 glass-panel p-6 rounded-xl border-t-4 border-t-[#ffb4ab]">
        <div className="w-24 h-24 rounded-full bg-[#1c0005] border-2 border-[#ffb4ab]/50 flex items-center justify-center shrink-0 shadow-[0_0_7px_rgba(255,180,171,0.11)] text-[#ffb4ab]">
          <Shield size={40} />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-3">
            <h1 className="font-[Outfit] text-4xl md:text-5xl font-bold text-[#fff4e6] tracking-tight">System Administrator</h1>
            <span className="px-3 py-1 bg-[#ffb4ab]/20 text-[#ffb4ab] text-xs font-bold uppercase tracking-wider rounded-full border border-[#ffb4ab]/30">Level 5 Access</span>
          </div>
          <p className="font-[Inter] text-lg text-[#cbb89d] mt-1">Global Platform Settings & Security</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* ═══ Seller Management ═══ */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col transition-all duration-300 min-h-[280px]">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[#ff9933]">
              <Users size={28} />
              <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6]">Seller Management</h2>
            </div>
            <span className="text-xs text-[#9e8c73] font-[Inter]">{requests.length} pending · {approved.length} active</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading seller data...</div>
          )}
          {error && !loading && (
            <div className="flex items-center justify-center h-40 text-[#ffb4ab]">{error}</div>
          )}
          {!loading && !error && (
          <>
          {/* Seller Requests */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-[#ffd27a]" />
              <h3 className="font-[Outfit] text-xs font-bold uppercase tracking-wider text-[#ffd27a]">Seller Requests</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#c98a12]/20 text-[#ffd27a] text-[10px] font-bold border border-[#ffd27a]/30">{requests.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              {requests.length === 0 && (
                <div className="bg-[#34250f]/30 p-5 rounded-lg border border-dashed border-white/10 text-center text-[#9e8c73] text-sm">
                  No pending requests — you're all caught up.
                </div>
              )}
              {requests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#34250f]/40 p-3 rounded-lg border border-white/5 hover:border-[#ffd27a]/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#c98a12]/15 text-[#ffd27a] flex items-center justify-center shrink-0 border border-[#ffd27a]/20">
                      <Store size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-[Outfit] font-semibold text-[#fff4e6] truncate">{req.store}</p>
                      <p className="text-[#cbb89d] text-xs truncate">{req.name} • {req.email}</p>
                      <p className="text-[#9e8c73] text-[11px] mt-0.5">Applied {req.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => approveSeller(req.id)} disabled={busy} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#9c5214]/50 hover:bg-[#ff9933]/20 border border-[#ff9933]/30 text-[#fff4e6] text-xs font-semibold transition-all disabled:opacity-50">
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => rejectSeller(req.id)} disabled={busy} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#690005]/40 hover:bg-[#ffb4ab]/20 border border-[#ffb4ab]/30 text-[#ffdad6] text-xs font-semibold transition-all disabled:opacity-50">
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approved Sellers */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={15} className="text-[#ff9933]" />
              <h3 className="font-[Outfit] text-xs font-bold uppercase tracking-wider text-[#ff9933]">Approved Sellers</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#ff9933]/10 text-[#ffbf66] text-[10px] font-bold border border-[#ff9933]/30">{approved.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              {approved.length === 0 && (
                <div className="bg-[#34250f]/30 p-5 rounded-lg border border-dashed border-white/10 text-center text-[#9e8c73] text-sm">
                  No approved sellers yet.
                </div>
              )}
              {approved.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-[#34250f]/40 p-3 rounded-lg border border-white/5 hover:border-[#ff9933]/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#ff9933]/10 text-[#ff9933] flex items-center justify-center shrink-0 border border-[#ff9933]/20">
                      <Store size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-[Outfit] font-semibold text-[#fff4e6] truncate flex items-center gap-1.5">
                        {s.store} <CheckCircle size={13} className="text-[#ff9933] shrink-0" />
                      </p>
                      <p className="text-[#cbb89d] text-xs truncate">{s.name}{s.email ? ` • ${s.email}` : ''}</p>
                      <p className="text-[#9e8c73] text-[11px] mt-0.5">Seller since {s.since}</p>
                    </div>
                  </div>
                  <button onClick={() => revokeSeller(s.id)} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-[#ffb4ab]/20 border border-white/10 hover:border-[#ffb4ab]/30 text-[#cbb89d] hover:text-[#ffdad6] text-xs font-semibold transition-all shrink-0 disabled:opacity-50" title="Revoke seller access">
                    <Trash2 size={14} /> <span className="hidden sm:inline">{busy ? 'Working...' : 'Revoke'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
          </>
          )}
        </div>

        {/* ═══ Security ═══ */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col group transition-all duration-300 min-h-[280px]">
          <div className="flex items-center gap-3 text-[#ffb4ab] mb-6">
            <Lock size={28} className="group-hover:scale-110 transition-transform" />
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6]">Security</h2>
          </div>

          <div className="space-y-4">
            <button className="w-full text-left bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 p-3 rounded-lg transition-colors border border-[#ffb4ab]/20">
              <span className="font-[Inter] text-sm text-[#ffb4ab] block">Force Global Password Reset</span>
            </button>
            <button className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors border border-white/5">
              <span className="font-[Inter] text-sm text-[#f1e7d7] block">Update Admin Credentials</span>
            </button>
            <button className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors border border-white/5">
              <span className="font-[Inter] text-sm text-[#f1e7d7] block">Review IP Blacklists</span>
            </button>
          </div>

          <div className="mt-auto pt-4 flex items-start gap-2 text-[#ffb4ab] text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <p>Admin actions are permanently logged and audited.</p>
          </div>
        </div>

      </section>
    </div>
  );
}
