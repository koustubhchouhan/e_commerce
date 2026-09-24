import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Shield, MapPin, CreditCard, ChevronRight, Lock, ShieldCheck,
  PackageX, Store, Clock, CheckCircle, LogOut, MessageCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { inr } from '../lib/money';
import { useAuth } from '../context/AuthContext';
import AccountSettingsModal from '../components/AccountSettingsModal';
import SellerApplicationModal from '../components/SellerApplicationModal';

const STATUS_BADGES = {
  pending: 'bg-[#C8901A]/20 text-[#8A5A00] border-[#C8901A]/40',
  paid: 'bg-[#B7322A]/15 text-[#8F2620] border-[#B7322A]/30',
  shipped: 'bg-[#B7322A]/15 text-[#B7322A] border-[#B7322A]/30',
  delivered: 'bg-[#2E7D32]/15 text-[#2E7D32] border-[#2E7D32]/30',
  cancelled: 'bg-[#B3261E]/15 text-[#B3261E] border-[#B3261E]/30',
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

export default function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [sellerOpen, setSellerOpen] = useState(false);
  const [sellerApp, setSellerApp] = useState(null);
  const [active, setActive] = useState('orders');

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
    let mounted = true;
    (async () => {
      try {
        const res = await api.mySellerApplications();
        const apps = res.items ?? [];
        const current =
          apps.find((a) => a.status === 'pending' || a.status === 'approved') ?? null;
        if (mounted) setSellerApp(current);
      } catch {
        // Non-fatal: the customer can still open the application modal.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const openSettings = (tab = 'profile') => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.myOrders();
        if (mounted) setOrders(res.items ?? []);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load orders.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { key: 'orders', label: 'Orders', icon: Package },
    { key: 'addresses', label: 'Addresses', icon: MapPin },
    { key: 'payment', label: 'Payment methods', icon: CreditCard },
    { key: 'security', label: 'Login & security', icon: Shield },
    { key: 'seller', label: 'Become a seller', icon: Store },
  ];

  const displayName = user?.fullName || 'Customer';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12 animate-fade-in-up">
      <div className="grid md:grid-cols-[250px_1fr] gap-6 md:gap-8">

        {/* ═══ Account sidebar ═══ */}
        <aside className="glass-panel p-5 h-fit md:sticky md:top-24">
          <div className="flex items-center gap-3 pb-5 border-b border-[#E7DAC8]">
            <div className="w-12 h-12 rounded-full bg-[#F0E7DA] border border-[#C4B5A2] flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img className="w-full h-full object-cover" src={user.avatarUrl} alt="User avatar" />
              ) : (
                <span className="font-display text-xl font-bold text-[#B7322A]">{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-[#231A16] truncate">{displayName}</p>
              <p className="text-xs text-[#8A7B6B] truncate">{user?.email || 'NovaMarket member'}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 py-4">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => (key === 'security' ? openSettings('security') : scrollTo(key))}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm text-left transition-colors ${
                  active === key
                    ? 'bg-[#B7322A] text-[#FDF8F0] font-semibold'
                    : 'text-[#4A3B30] hover:bg-[#231a16]/5'
                }`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
            <Link
              to="/messages"
              className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm text-[#4A3B30] hover:bg-[#231a16]/5 transition-colors"
            >
              <MessageCircle size={17} /> Messages
            </Link>
          </nav>

          <button
            onClick={() => openSettings('profile')}
            className="btn btn-outline w-full py-2.5 text-sm mb-2"
          >
            Edit profile
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm text-[#B3261E] hover:bg-[#B3261E]/8 transition-colors w-full"
          >
            <LogOut size={17} /> Sign out
          </button>
        </aside>

        {/* ═══ Main content ═══ */}
        <div className="flex flex-col gap-8 min-w-0">
          <header>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#231A16]">
              Hello, {displayName.split(' ')[0]}
            </h1>
            <p className="text-[#7A6A5B] mt-1">Manage your orders, addresses and account preferences.</p>
          </header>

          {/* Orders */}
          <section id="orders" className="glass-panel p-6 scroll-mt-24">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3 text-[#231A16]">
                <Package size={24} />
                <h2 className="font-display text-xl font-semibold">Orders</h2>
              </div>
              <span className="micro-label">{loading ? '' : `${orders.length} total`}</span>
            </div>

            {loading && (
              <div className="p-4 rounded-2xl border border-dashed border-[#E3D5C1] text-center text-[#8A7B6B] text-sm">
                Loading orders…
              </div>
            )}

            {!loading && error && (
              <div className="p-4 rounded-2xl border border-dashed border-[#E3D5C1] text-center text-[#B3261E] text-sm">
                {error}
              </div>
            )}

            {!loading && !error && orders.length === 0 && (
              <div className="p-8 rounded-2xl border border-dashed border-[#E3D5C1] text-center flex flex-col items-center gap-2">
                <PackageX size={28} className="text-[#C4B5A2]" />
                <p className="text-[#8A7B6B] text-sm">No orders yet. Head to the storefront to place your first order.</p>
                <Link to="/home" className="btn btn-primary px-5 py-2 text-sm mt-2">Start shopping</Link>
              </div>
            )}

            {!loading && !error && orders.length > 0 && (
              <div className="flex flex-col gap-3">
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="bg-[#FBF3E7] p-4 rounded-2xl border border-[#E7DAC8] hover:border-[#B7322A]/40 transition-colors group"
                  >
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <span className="micro-label">Order #{shortId(order.id)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${STATUS_BADGES[order.status] ?? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[#2A211B] text-sm font-medium truncate">
                          {order.items?.map((i) => i.productName).join(', ') || 'Order items'}
                        </p>
                        <p className="text-[#8A7B6B] text-xs mt-0.5">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#B7322A] font-display text-base font-bold">{inr(order.total)}</span>
                        <ChevronRight size={18} className="text-[#8A7B6B] group-hover:text-[#B7322A] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Addresses + Payment */}
          <div className="grid md:grid-cols-2 gap-6">
            <section id="addresses" className="glass-panel p-6 scroll-mt-24 flex flex-col">
              <div className="flex items-center gap-3 text-[#8F2620] mb-4">
                <MapPin size={22} />
                <h2 className="font-display text-lg font-semibold text-[#231A16]">Addresses</h2>
              </div>
              <div className="bg-[#FBF3E7] p-4 rounded-2xl border border-[#E7DAC8] flex-1">
                <p className="text-sm text-[#2A211B]">
                  {user?.shippingAddress?.address
                    ? `${user.shippingAddress.firstName ?? ''} ${user.shippingAddress.address}, ${user.shippingAddress.city ?? ''}`
                    : 'No default shipping address saved yet.'}
                </p>
                <p className="text-xs text-[#8A7B6B] mt-1">Set your default shipping address.</p>
              </div>
              <button onClick={() => openSettings('profile')} className="btn btn-outline w-full py-2.5 text-sm mt-4">
                Manage addresses
              </button>
            </section>

            <section id="payment" className="glass-panel p-6 scroll-mt-24 flex flex-col">
              <div className="flex items-center gap-3 text-[#231A16] mb-4">
                <CreditCard size={22} />
                <h2 className="font-display text-lg font-semibold">Payment methods</h2>
              </div>
              <div className="bg-[#FBF3E7] p-4 rounded-2xl border border-[#E7DAC8] flex-1">
                <p className="micro-label mb-1.5">Default method</p>
                <p className="text-sm text-[#2A211B]">Pay by card or UPI at checkout.</p>
                <p className="text-xs text-[#8A7B6B] mt-1">No saved wallet balance on this account.</p>
              </div>
              <button onClick={() => openSettings('security')} className="btn btn-outline w-full py-2.5 text-sm mt-4">
                Manage security
              </button>
            </section>
          </div>

          {/* Security */}
          <section id="security" className="glass-panel p-6 scroll-mt-24">
            <div className="flex items-center gap-3 text-[#C8901A] mb-4">
              <Shield size={22} />
              <h2 className="font-display text-lg font-semibold text-[#231A16]">Login & security</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#7A6A5B]">
                <Lock size={16} />
                <span className="text-sm">Signed in via email / Google</span>
              </div>
              <div className="flex items-center gap-3 text-[#7A6A5B]">
                <ShieldCheck size={16} />
                <span className="text-sm">Manage your email & password</span>
              </div>
            </div>
            <button onClick={() => openSettings('security')} className="btn btn-outline px-6 py-2.5 text-sm mt-4">
              Update credentials
            </button>
          </section>

          {/* Become a seller */}
          <section id="seller" className="glass-panel p-6 scroll-mt-24 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#B7322A]/10 rounded-full border border-[#B7322A]/20 text-[#B7322A] shrink-0">
                {sellerApp?.status === 'pending' ? <Clock size={24} /> : sellerApp?.status === 'approved' ? <CheckCircle size={24} /> : <Store size={24} />}
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-[#231A16]">Become a seller</h2>
                <p className="text-sm text-[#7A6A5B] mt-1 max-w-2xl">
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
              className="btn btn-primary px-6 py-3 text-sm self-start md:self-auto"
            >
              {sellerApp ? 'View application' : 'Apply to sell'}
            </button>
          </section>
        </div>
      </div>

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
