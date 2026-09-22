import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Shield, MapPin, CreditCard, ChevronRight, Lock, ShieldCheck, PackageX, Store, Clock, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { inr } from '../lib/money';
import { useAuth } from '../context/AuthContext';
import AccountSettingsModal from '../components/AccountSettingsModal';
import SellerApplicationModal from '../components/SellerApplicationModal';

const STATUS_BADGES = {
  pending: 'bg-[#C8901A]/20 text-[#C8901A] border-[#C8901A]/30',
  paid: 'bg-[#B7322A]/20 text-[#E0A11C] border-[#B7322A]/30',
  shipped: 'bg-[#B7322A]/20 text-[#B7322A] border-[#B7322A]/30',
  delivered: 'bg-[#E0A11C]/20 text-[#E0A11C] border-[#E0A11C]/30',
  cancelled: 'bg-[#B3261E]/20 text-[#B3261E] border-[#B3261E]/30',
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

export default function UserProfile() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [sellerOpen, setSellerOpen] = useState(false);
  const [sellerApp, setSellerApp] = useState(null);

  const loadSellerApp = async () => {
    try {
      const res = await api.mySellerApplications();
      const apps = res.items ?? [];
      setSellerApp(apps.find((a) => a.status === 'pending' || a.status === 'approved') ?? null);
    } catch {
      // Non-fatal: the customer can still open the application modal.
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.mySellerApplications();
        const apps = res.items ?? [];
        const current =
          apps.find((a) => a.status === 'pending' || a.status === 'approved') ?? null;
        if (active) setSellerApp(current);
      } catch {
        // Non-fatal: the customer can still open the application modal.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openSettings = (tab = 'profile') => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.myOrders();
        if (active) setOrders(res.items ?? []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load orders.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-20 flex flex-col gap-20 animate-fade-in-up">

      {/* ═══ Profile Header Section ═══ */}
      <section className="w-full flex flex-col md:flex-row items-start md:items-center gap-6 glass-panel p-6 rounded-xl">
        <div className="w-24 h-24 rounded-full bg-[#F0E7DA] border border-[#C4B5A2] flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            <img
              className="w-full h-full object-cover"
              src={user.avatarUrl}
              alt="User avatar"
            />
          ) : (
            <span className="font-[Outfit] text-4xl font-bold text-[#B7322A]">
              {(user?.fullName || 'N').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-grow">
          <h1 className="font-[Outfit] text-4xl md:text-5xl font-bold text-[#231A16] tracking-tight">{user?.fullName || 'Customer'}</h1>
          <p className="font-[Inter] text-lg text-[#7A6A5B]">{user?.email || 'NovaMarket member'}</p>
        </div>
        <button
          onClick={() => openSettings('profile')}
          className="px-6 py-3 bg-gradient-to-r from-[#7A1F1A] to-[#B7322A] text-[#FDF8F0] font-[Inter] text-xs font-semibold tracking-[0.05em] uppercase rounded-lg hover:shadow-[0_0_9px_rgba(183,50,42,0.17)] transition-all duration-300 whitespace-nowrap"
        >
          Edit Profile
        </button>
      </section>

      {/* ═══ Bento Grid Layout ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* Your Orders — 8 cols */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3 text-[#231A16]">
              <Package size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold">Your Orders</h2>
            </div>
            <span className="text-xs text-[#8A7B6B] font-[Inter]">{loading ? '' : `${orders.length} order${orders.length === 1 ? '' : 's'}`}</span>
          </div>

          {loading && (
            <div className="bg-[#F0E7DA]/30 p-4 rounded-lg border border-dashed border-[#231a16]/10 text-center text-[#8A7B6B] text-sm">
              Loading orders...
            </div>
          )}

          {!loading && error && (
            <div className="bg-[#F0E7DA]/30 p-4 rounded-lg border border-dashed border-[#231a16]/10 text-center text-[#B3261E] text-sm">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="bg-[#F0E7DA]/30 p-6 rounded-lg border border-dashed border-[#231a16]/10 text-center flex flex-col items-center gap-2">
              <PackageX size={28} className="text-[#C4B5A2]" />
              <p className="text-[#8A7B6B] text-sm">No orders yet. Head to the storefront to place your first order.</p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="flex flex-col gap-3">
              {orders.slice(0, 3).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="bg-[#F0E7DA]/50 p-4 rounded-lg border border-[#231a16]/5 hover:bg-[#F0E7DA] hover:border-[#B7322A]/30 transition-colors group"
                >
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#7A6A5B] uppercase">ORDER #{shortId(order.id)}</span>
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${STATUS_BADGES[order.status] ?? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[#2A211B] text-sm font-semibold truncate">
                        {order.items?.map((i) => i.productName).join(', ') || 'Order items'}
                      </p>
                      <p className="text-[#7A6A5B] text-xs mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#B7322A] font-[Outfit] text-base font-bold">{inr(order.total)}</span>
                      <ChevronRight size={18} className="text-[#7A6A5B] group-hover:text-[#B7322A] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Login & Security — 4 cols */}
        <button type="button" onClick={() => openSettings('security')} className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px] w-full text-left">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2 text-[#C8901A]">
              <Shield size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold mt-2">Login & Security</h2>
            </div>
            <ChevronRight size={24} className="text-[#7A6A5B] group-hover:text-[#C8901A] transition-colors" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#7A6A5B]">
              <Lock size={16} />
              <span className="font-[Inter] text-sm">Signed in via email / Google</span>
            </div>
            <div className="flex items-center gap-3 text-[#7A6A5B]">
              <ShieldCheck size={16} />
              <span className="font-[Inter] text-sm">Manage email & password</span>
            </div>
          </div>
        </button>

        {/* Addresses — 6 cols */}
        <button type="button" onClick={() => openSettings('profile')} className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px] w-full text-left">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#8F2620]">
              <MapPin size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Addresses</h2>
            </div>
            <ChevronRight size={24} className="text-[#7A6A5B] group-hover:text-[#8F2620] transition-colors" />
          </div>
          <div className="bg-[#F0E7DA]/30 p-3 rounded-lg border border-[#231a16]/5">
            <p className="font-[Inter] text-sm text-[#2A211B]">
              {user?.shippingAddress?.address
                ? `${user.shippingAddress.firstName ?? ''} ${user.shippingAddress.address}, ${user.shippingAddress.city ?? ''}`
                : 'No default shipping address saved yet.'}
            </p>
            <p className="text-[#7A6A5B] text-xs mt-1">Click to set your default shipping address.</p>
          </div>
        </button>

        {/* Payment Options — 6 cols */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#231A16]">
              <CreditCard size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Payment Options</h2>
            </div>
            <ChevronRight size={24} className="text-[#7A6A5B]" />
          </div>
          <div className="bg-[#F0E7DA]/30 p-3 rounded-lg border border-[#231a16]/5">
            <p className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#7A6A5B] uppercase mb-1.5">PAYMENT METHOD</p>
            <p className="font-[Inter] text-sm text-[#2A211B]">Pay by card at checkout.</p>
            <p className="text-[#7A6A5B] text-xs mt-1">No wallet balance on this account.</p>
          </div>
        </div>

        {/* Become a Seller — 12 cols */}
        <div className="lg:col-span-12 glass-panel p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#B7322A]/10 rounded-full border border-[#B7322A]/20 text-[#B7322A] shrink-0">
              {sellerApp?.status === 'pending' ? <Clock size={26} /> : sellerApp?.status === 'approved' ? <CheckCircle size={26} /> : <Store size={26} />}
            </div>
            <div>
              <h2 className="font-[Outfit] text-xl font-semibold text-[#231A16]">Become a Seller</h2>
              <p className="font-[Inter] text-sm text-[#7A6A5B] mt-1 max-w-2xl">
                {sellerApp?.status === 'pending'
                  ? `Your application for "${sellerApp.storeName}" is under review by an admin.`
                  : sellerApp?.status === 'approved'
                    ? `Your storefront "${sellerApp.storeName}" is approved.`
                    : 'Open your own storefront and start listing products on NovaMarket.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSellerOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#7A1F1A] to-[#B7322A] text-[#FDF8F0] font-[Inter] text-xs font-semibold tracking-[0.05em] uppercase rounded-lg hover:shadow-[0_0_9px_rgba(183,50,42,0.17)] transition-all duration-300 whitespace-nowrap self-start md:self-auto"
          >
            {sellerApp ? 'View Application' : 'Apply to Sell'}
          </button>
        </div>

      </section>

      <AccountSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialTab={settingsTab} />
      {sellerOpen && (
        <SellerApplicationModal
          onClose={() => setSellerOpen(false)}
          onChange={loadSellerApp}
        />
      )}
    </div>
  );
}
