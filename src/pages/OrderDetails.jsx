import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CreditCard, Calendar, MapPin, PackageX, XCircle, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';
import { inr } from '../lib/money';

const STATUS_BADGES = {
  pending: 'bg-[#C8901A]/20 text-[#C8901A] border-[#C8901A]/30',
  paid: 'bg-[#B7322A]/20 text-[#E0A11C] border-[#B7322A]/30',
  shipped: 'bg-[#B7322A]/20 text-[#B7322A] border-[#B7322A]/30',
  delivered: 'bg-[#E0A11C]/20 text-[#E0A11C] border-[#E0A11C]/30',
  cancelled: 'bg-[#B3261E]/20 text-[#B3261E] border-[#B3261E]/30',
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
      <Link to="/profile" className="inline-flex items-center gap-2 text-[#7A6A5B] hover:text-[#B7322A] transition-colors text-sm font-semibold w-fit">
        <ArrowLeft size={16} /> Back to My Profile
      </Link>

      {loading && (
        <GlassCard className="p-12 text-center text-[#7A6A5B]">Loading order details...</GlassCard>
      )}

      {!loading && error && (
        <GlassCard className="p-12 text-center text-[#B3261E]">{error}</GlassCard>
      )}

      {!loading && !error && order && (
        <>
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-bold text-[#231A16] mb-2 text-glow">
                Order #{shortId(order.id)}
              </h1>
              <p className="text-[#7A6A5B] flex items-center gap-2">
                <Calendar size={16} className="text-[#B7322A]" /> Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border w-fit ${STATUS_BADGES[order.status] ?? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Items */}
            <GlassCard className="lg:col-span-8 p-6 lg:p-8">
              <h2 className="font-display text-2xl font-semibold text-[#231A16] mb-6 flex items-center gap-2">
                <Package size={22} className="text-[#B7322A]" /> Items
              </h2>

              {order.items?.length === 0 && (
                <p className="text-[#8A7B6B] text-sm">No items on this order.</p>
              )}

              <div className="flex flex-col">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-4 border-b border-[#231a16]/5 last:border-b-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#231a16]/10 bg-[#F5ECDE]">
                      <img src={item.coverImage || FALLBACK_IMG} alt={item.productName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#2A211B] font-semibold truncate">{item.productName}</p>
                      <p className="text-[#7A6A5B] text-xs mt-0.5">
                        {inr(item.unitPrice)}
                        {item.discountPercent > 0 && <span className="text-[#E0A11C]"> · -{item.discountPercent}%</span>}
                        {' '}× {item.quantity}
                      </p>
                    </div>
                    <span className="text-[#231A16] font-display font-bold shrink-0">{inr(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Summary */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <GlassCard className="p-6">
                <h2 className="font-display text-xl font-semibold text-[#231A16] mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-[#C8901A]" /> Summary
                </h2>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between text-[#7A6A5B]"><span>Subtotal</span><span>{inr(order.subtotal)}</span></div>
                  <div className="flex justify-between text-[#231A16] font-bold text-lg pt-2 mt-1 border-t border-[#231a16]/10">
                    <span>Total</span><span>{inr(order.total)}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="font-display text-xl font-semibold text-[#231A16] mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#8F2620]" /> Shipping Address
                </h2>
                {address ? (
                  <div className="text-[#2A211B] text-sm leading-relaxed">
                    <p className="font-semibold">
                      {[address.firstName, address.lastName].filter(Boolean).join(' ') || 'Recipient'}
                    </p>
                    <p className="text-[#7A6A5B] mt-1">{address.address}</p>
                    <p className="text-[#7A6A5B]">
                      {[address.city, address.pin].filter(Boolean).join(', ')}
                    </p>
                    {address.phone && <p className="text-[#7A6A5B] mt-1">{address.phone}</p>}
                  </div>
                ) : (
                  <p className="text-[#8A7B6B] text-sm">No shipping address recorded.</p>
                )}
              </GlassCard>

              <GlassCard className="p-6 flex items-center gap-3">
                {order.status === 'cancelled' ? (
                  <PackageX size={20} className="text-[#B3261E]" />
                ) : (
                  <Truck size={20} className="text-[#B7322A]" />
                )}
                <p className="text-[#7A6A5B] text-sm leading-relaxed">
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
                      <h3 className="font-display text-base font-semibold text-[#B3261E] mb-1 flex items-center gap-2">
                        <XCircle size={18} /> Cancel this order?
                      </h3>
                      <p className="text-[#7A6A5B] text-xs leading-relaxed mb-4">
                        This will cancel the order and any reserved stock will be released.
                      </p>
                      <div className="flex gap-3">
                        <button
                          disabled={cancelling}
                          onClick={handleCancel}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#B3261E] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(143,38,32,0.22)]"
                        >
                          {cancelling && <Loader2 size={16} className="animate-spin" />}
                          {cancelling ? 'Cancelling...' : 'Yes, cancel order'}
                        </button>
                        <button
                          disabled={cancelling}
                          onClick={() => setConfirmingCancel(false)}
                          className="px-4 py-2.5 rounded-xl font-display text-sm font-bold text-[#7A6A5B] border border-[#231a16]/10 hover:bg-[#231a16]/5 transition-colors disabled:opacity-50"
                        >
                          Keep order
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-[#7A6A5B] text-xs mb-3">Order not shipped yet?</p>
                      <button
                        onClick={() => setConfirmingCancel(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display text-sm font-bold transition-all bg-[#B3261E]/10 text-[#B3261E] border border-[#B3261E]/30 hover:bg-[#B3261E]/20"
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
