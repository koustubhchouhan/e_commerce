import { useEffect, useState } from 'react';
import { Package, Shield, MapPin, CreditCard, ChevronRight, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const statusBadge = (status) => {
  const map = {
    pending: ['bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30', 'Pending'],
    processing: ['bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30', 'Processing'],
    shipped: ['bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30', 'Shipped'],
    delivered: ['bg-[#ffbf66]/20 text-[#ffbf66] border-[#ffbf66]/30', 'Delivered'],
    cancelled: ['bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30', 'Cancelled'],
  };
  return map[status] ?? ['bg-white/10 text-[#cbb89d] border-white/10', status];
};

export default function UserProfile() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.myOrders();
        if (!cancelled) setOrders(res.items ?? []);
      } catch {
        // non-fatal: leave the card in its empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = orders[0];
  const [colorClass, statusLabel] = statusBadge(latest?.status);

  return (
    <div className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-20 flex flex-col gap-20 animate-fade-in-up">

      {/* ═══ Profile Header Section ═══ */}
      <section className="w-full flex flex-col md:flex-row items-start md:items-center gap-6 glass-panel p-6 rounded-xl">
        <div className="w-24 h-24 rounded-full bg-[#2b1d0d] border border-[#4b3d2a] flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            <img className="w-full h-full object-cover" src={user.avatarUrl} alt="User avatar" />
          ) : (
            <span className="font-[Outfit] text-4xl font-bold text-[#ff9933]">
              {(user?.fullName || 'A').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-grow">
          <h1 className="font-[Outfit] text-4xl md:text-5xl font-bold text-[#fff4e6] tracking-tight">{user?.fullName || 'Customer'}</h1>
          <p className="font-[Inter] text-lg text-[#cbb89d]">{user?.email}</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-[#9c5214] to-[#ff9933] text-[#2e1800] font-[Inter] text-xs font-semibold tracking-[0.05em] uppercase rounded-lg hover:shadow-[0_0_9px_rgba(255,153,51,0.17)] transition-all duration-300 whitespace-nowrap">
          Edit Profile
        </button>
      </section>

      {/* ═══ Bento Grid Layout ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* Your Orders — 8 cols */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3 text-[#fff4e6]">
              <Package size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold">Your Orders</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#ff9933]/10 text-[#ffbf66] text-[10px] font-bold border border-[#ff9933]/30">{orders.length}</span>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#fff4e6] transition-colors" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-24 text-[#9e8c73] text-sm">Loading your orders...</div>
          ) : latest ? (
            <div className="bg-[#34250f]/50 p-4 rounded-lg border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase">
                  ORDER #{latest.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${colorClass}`}>{statusLabel}</span>
              </div>
              <div className="flex gap-4 items-center">
                {latest.items?.[0]?.coverImage ? (
                  <div className="w-16 h-16 rounded bg-[#170e03] border border-white/10 overflow-hidden shrink-0">
                    <img className="w-full h-full object-cover" src={latest.items[0].coverImage} alt={latest.items[0].productName} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded bg-[#170e03] border border-white/10 flex items-center justify-center shrink-0">
                    <Package size={20} className="text-[#4b3d2a]" />
                  </div>
                )}
                <div>
                  <h3 className="font-[Outfit] text-xl font-semibold text-[#f1e7d7]">{latest.items?.[0]?.productName ?? 'Order'}</h3>
                  <p className="font-[Inter] text-sm text-[#cbb89d]">
                    ${Number(latest.total).toFixed(2)} · {new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#34250f]/30 p-4 rounded-lg border border-dashed border-white/10 text-center text-[#9e8c73] text-sm">
              No orders yet. <a href="/home" className="text-[#ff9933] hover:underline">Start shopping →</a>
            </div>
          )}
        </div>

        {/* Login & Security — 4 cols */}
        <a href="#" className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2 text-[#ffd27a]">
              <Shield size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold mt-2">Login & Security</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#ffd27a] transition-colors" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#cbb89d]">
              <Lock size={16} />
              <span className="font-[Inter] text-sm">Change Password</span>
            </div>
            <div className="flex items-center gap-3 text-[#cbb89d]">
              <ShieldCheck size={16} />
              <span className="font-[Inter] text-sm">2-Step Verification Active</span>
            </div>
          </div>
        </a>

        {/* Addresses — 6 cols */}
        <a href="#" className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#ff7418]">
              <MapPin size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Addresses</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#ff7418] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5">
            <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#ffbf66] block mb-1 uppercase">DEFAULT</span>
            <p className="font-[Inter] text-base text-[#f1e7d7]">1284 Neon Boulevard, Apt 404<br/>Neo-Angeles, CA 90210</p>
          </div>
        </a>

        {/* Payment Options — 6 cols */}
        <a href="#" className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#fffaf0]">
              <CreditCard size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Payment Options</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#fffaf0] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet size={20} className="text-[#f1e7d7]" />
              <span className="font-[Inter] text-base text-[#f1e7d7]">NovaWallet Balance</span>
            </div>
            <span className="font-[Outfit] text-xl font-semibold text-[#fff4e6]">$450.00</span>
          </div>
        </a>

      </section>
    </div>
  );
}
