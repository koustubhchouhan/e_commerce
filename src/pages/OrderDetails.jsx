import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CreditCard, Calendar, MapPin, PackageX, XCircle, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';

const STATUS_BADGES = {
  pending: 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30',
  paid: 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30',
  shipped: 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30',
  delivered: 'bg-[#ffbf66]/20 text-[#ffbf66] border-[#ffbf66]/30',
  cancelled: 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30',
};

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=800';

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const money = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrderDetails() {
  const { id } = useParams();
  const addToast = useToastStore((s) => s.addToast);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.order(id);
        if (active) setOrder(data);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load order.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const address = order?.shipping_address ?? null;
  const cancellable = order && ['pending', 'paid'].includes(order.status);

  const handleCancel = async () => {
    if (cancelling || !order) return;
    setCancelling(true);
    try {
      await api.cancelOrder(order.id);
      setOrder((prev) => ({ ...prev, status: 'cancelled' }));
      setConfirmingCancel(false);
      addToast('Order cancelled successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to cancel order.', 'error');
      setConfirmingCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up flex flex-col gap-8">
      <Link to="/profile" className="inline-flex items-center gap-2 text-[#cbb89d] hover:text-[#ff9933] transition-colors text-sm font-semibold w-fit">
        <ArrowLeft size={16} /> Back to My Profile
      </Link>

      {loading && (
        <GlassCard className="p-12 text-center text-[#cbb89d]">Loading order details...</GlassCard>
      )}

      {!loading && error && (
        <GlassCard className="p-12 text-center text-[#ffb4ab]">{error}</GlassCard>
      )}

      {!loading && !error && order && (
        <>
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">
                Order #{shortId(order.id)}
              </h1>
              <p className="text-[#cbb89d] flex items-center gap-2">
                <Calendar size={16} className="text-[#ff9933]" /> Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border w-fit ${STATUS_BADGES[order.status] ?? 'bg-white/10 text-[#cbb89d] border-white/10'}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Items */}
            <GlassCard className="lg:col-span-8 p-6 lg:p-8">
              <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
                <Package size={22} className="text-[#ff9933]" /> Items
              </h2>

              {order.items?.length === 0 && (
                <p className="text-[#9e8c73] text-sm">No items on this order.</p>
              )}

              <div className="flex flex-col">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-4 border-b border-white/5 last:border-b-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-[#1a1307]">
                      <img src={item.coverImage || FALLBACK_IMG} alt={item.productName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f1e7d7] font-semibold truncate">{item.productName}</p>
                      <p className="text-[#cbb89d] text-xs mt-0.5">
                        ${money(item.unitPrice)}
                        {item.discountPercent > 0 && <span className="text-[#ffbf66]"> · -{item.discountPercent}%</span>}
                        {' '}× {item.quantity}
                      </p>
                    </div>
                    <span className="text-[#fff4e6] font-[Outfit] font-bold shrink-0">${money(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Summary */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <GlassCard className="p-6">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-[#ffd27a]" /> Summary
                </h2>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between text-[#cbb89d]"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
                  <div className="flex justify-between text-[#fff4e6] font-bold text-lg pt-2 mt-1 border-t border-white/10">
                    <span>Total</span><span>${money(order.total)}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#ff7418]" /> Shipping Address
                </h2>
                {address ? (
                  <div className="text-[#f1e7d7] text-sm leading-relaxed">
                    <p className="font-semibold">
                      {[address.firstName, address.lastName].filter(Boolean).join(' ') || 'Recipient'}
                    </p>
                    <p className="text-[#cbb89d] mt-1">{address.address}</p>
                    <p className="text-[#cbb89d]">
                      {[address.city, address.pin].filter(Boolean).join(', ')}
                    </p>
                    {address.phone && <p className="text-[#cbb89d] mt-1">{address.phone}</p>}
                  </div>
                ) : (
                  <p className="text-[#9e8c73] text-sm">No shipping address recorded.</p>
                )}
              </GlassCard>

              <GlassCard className="p-6 flex items-center gap-3">
                {order.status === 'cancelled' ? (
                  <PackageX size={20} className="text-[#ffb4ab]" />
                ) : (
                  <Truck size={20} className="text-[#ff9933]" />
                )}
                <p className="text-[#cbb89d] text-sm leading-relaxed">
                  {order.status === 'cancelled'
                    ? 'This order was cancelled.'
                    : order.status === 'delivered'
                      ? 'This order has been delivered.'
                      : order.status === 'shipped'
                        ? 'Your order is on its way.'
                        : 'Your order is being processed.'}
                </p>
              </GlassCard>

              {cancellable && (
                <GlassCard className="p-6">
                  {confirmingCancel ? (
                    <>
                      <h3 className="font-[Outfit] text-base font-semibold text-[#ffb4ab] mb-1 flex items-center gap-2">
                        <XCircle size={18} /> Cancel this order?
                      </h3>
                      <p className="text-[#cbb89d] text-xs leading-relaxed mb-4">
                        This will cancel the order and any reserved stock will be released.
                      </p>
                      <div className="flex gap-3">
                        <button
                          disabled={cancelling}
                          onClick={handleCancel}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-[Outfit] text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-[#ffb4ab] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,116,24,0.22)]"
                        >
                          {cancelling && <Loader2 size={16} className="animate-spin" />}
                          {cancelling ? 'Cancelling...' : 'Yes, cancel order'}
                        </button>
                        <button
                          disabled={cancelling}
                          onClick={() => setConfirmingCancel(false)}
                          className="px-4 py-2.5 rounded-lg font-[Outfit] text-sm font-bold text-[#cbb89d] border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                          Keep order
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-[#cbb89d] text-xs mb-3">Order not shipped yet?</p>
                      <button
                        onClick={() => setConfirmingCancel(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-[Outfit] text-sm font-bold transition-all bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/20"
                      >
                        <XCircle size={16} /> Cancel Order
                      </button>
                    </div>
                  )}
                </GlassCard>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
