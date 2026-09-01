import { useEffect, useState } from 'react';
import { Store, Shield, MapPin, ChevronRight, CheckCircle, Wallet, X, Save } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

const formatSince = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const slugify = (name = '') =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function SellerProfile() {
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStore = async () => {
    setLoading(true);
    setError('');
    try {
      setStore(await api.getSellerStore());
    } catch (err) {
      setError(err.message || 'Failed to load your store.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = () => {
    setEditName(store?.name ?? '');
    setEditDesc(store?.description ?? '');
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const updated = await api.updateSellerStore({
        name,
        description: editDesc.trim(),
      });
      setStore(updated);
      setEditOpen(false);
      addToast('Store profile updated!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update store.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all placeholder:text-[#6f6048]';
  const labelClass = 'block text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2';

  return (
    <div className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-20 flex flex-col gap-10 animate-fade-in-up">

      <section className="w-full flex flex-col md:flex-row items-start md:items-center gap-6 glass-panel p-6 rounded-xl border-t-4 border-t-[#ff9933]">
        <div className="w-24 h-24 rounded-full bg-[#170e03] border-2 border-[#ff9933]/50 overflow-hidden shrink-0 shadow-[0_0_7px_rgba(255,153,51,0.11)] flex items-center justify-center">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Seller Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-[Outfit] text-4xl font-bold text-[#ff9933]">
              {(user?.fullName || 'S').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-3">
            <h1 className="font-[Outfit] text-4xl md:text-5xl font-bold text-[#fff4e6] tracking-tight">
              {user?.fullName || 'Seller'}
            </h1>
            <CheckCircle className="text-[#ff9933]" size={24} />
          </div>
          <p className="font-[Inter] text-lg text-[#ff9933] mt-1">
            {store?.name || (loading ? 'Loading store...' : 'Verified Seller')}
            {store && <span className="text-[#cbb89d] text-sm"> • Seller since {formatSince(store.createdAt)}</span>}
          </p>
        </div>
        <button
          onClick={openEdit}
          disabled={!store}
          className="px-6 py-3 bg-gradient-to-r from-[#9c5214] to-[#ff9933] text-[#2e1800] font-[Inter] text-xs font-semibold tracking-[0.05em] uppercase rounded-lg hover:shadow-[0_0_9px_rgba(255,153,51,0.17)] transition-all duration-300 disabled:opacity-50"
        >
          Edit Store Profile
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3 text-[#fff4e6]">
              <Store size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold">Store Details</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading store details...</div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-[#ffb4ab]">{error}</div>
          ) : (
            <div className="bg-[#34250f]/50 p-4 rounded-lg border border-white/5 space-y-4">
              <div>
                <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Store URL</span>
                <p className="text-[#ff9933]">novamarket.com/store/{slugify(store.name) || shortId(store.id)}</p>
              </div>
              <div>
                <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Business Description</span>
                <p className="text-[#f1e7d7] text-sm leading-relaxed">
                  {store.description || 'No description yet — click "Edit Store Profile" to tell customers what you sell.'}
                </p>
              </div>
              <div className="flex gap-6 border-t border-white/10 pt-4 mt-2">
                <div>
                  <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Store ID</span>
                  <p className="text-[#f1e7d7]">{shortId(store.id)}</p>
                </div>
                <div>
                  <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Member Since</span>
                  <p className="text-[#f1e7d7]">{formatSince(store.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2 text-[#ffd27a]">
              <Shield size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold mt-2">Account Security</h2>
            </div>
          </div>
          <div className="space-y-4">
            <button className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors border border-white/5">
              <span className="font-[Inter] text-sm text-[#f1e7d7] block">Change Password</span>
            </button>
            <button className="w-full text-left bg-[#34250f]/30 p-3 rounded-lg border border-white/5">
              <span className="font-[Inter] text-sm text-[#cbb89d] block">2-Step Verification Not Configured</span>
            </button>
            <button className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors border border-white/5">
              <span className="font-[Inter] text-sm text-[#f1e7d7] block">Active Sessions</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#ff7418]">
              <MapPin size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Warehouse / Return Address</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#ff7418] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5 flex items-center justify-center h-24">
            <p className="text-[#9e8c73] text-sm">No return address configured yet.</p>
          </div>
        </div>

        <div className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#fffaf0]">
              <Wallet size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Payout Methods</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#fffaf0] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5 flex items-center justify-center h-24">
            <p className="text-[#9e8c73] text-sm">Payout methods are coming soon.</p>
          </div>
        </div>

      </section>

      {editOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onMouseDown={() => setEditOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit store profile"
        >
          <div className="glass-panel rounded-xl w-full max-w-lg animate-scale-in p-0 overflow-hidden">
            <form onSubmit={handleSave} onMouseDown={(e) => e.stopPropagation()} className="flex flex-col">
              <div className="flex items-start justify-between px-6 md:px-8 py-5 border-b border-white/10">
                <div>
                  <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] flex items-center gap-2">
                    <Store className="text-[#ff9933]" size={24} /> Edit Store Profile
                  </h2>
                  <p className="text-[#cbb89d] text-xs mt-1">Update how your storefront appears to customers.</p>
                </div>
                <button type="button" onClick={() => setEditOpen(false)} className="p-2 -mr-2 rounded-lg text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 transition-colors" aria-label="Close">
                  <X size={22} />
                </button>
              </div>

              <div className="px-6 md:px-8 py-6 flex flex-col gap-5">
                <div>
                  <label className={labelClass}>Store Name</label>
                  <input type="text" className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your store name" />
                </div>
                <div>
                  <label className={labelClass}>Business Description</label>
                  <textarea
                    rows={4}
                    className={`${inputClass} resize-none`}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Describe the products you sell..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-4 border-t border-white/10 bg-[#100901]/30">
                <button type="button" onClick={() => setEditOpen(false)} className="px-6 py-2.5 rounded-lg border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim() || busy}
                  className={`px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold flex items-center gap-2 transition-all ${editName.trim() && !busy ? 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)]' : 'bg-[#34250f]/50 text-[#6f6048] cursor-not-allowed'}`}
                >
                  <Save size={18} /> {busy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
