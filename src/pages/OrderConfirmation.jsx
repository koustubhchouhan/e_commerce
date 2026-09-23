import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { inr } from '../lib/money';

export default function OrderConfirmation() {
  const location = useLocation();
  const orders = Array.isArray(location.state?.orders) ? location.state.orders : [];
  const orderId = location.state?.orderId || orders[0]?.orderId || 'NV-XXXXXX';
  const total = location.state?.total;
  const multiple = orders.length > 1;

  return (
    <div className="max-w-[700px] mx-auto px-6 py-12 md:py-20 animate-fade-in-up flex flex-col items-center gap-8 text-center">
      
      {/* Animated Success Icon */}
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-[#B7322A]/10 border-2 border-[#B7322A]/30 flex items-center justify-center shadow-[0_0_18px_rgba(183,50,42,0.11)]">
          <CheckCircle size={56} className="text-[#B7322A]" strokeWidth={1.5} />
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border-2 border-[#B7322A]/20 animate-ping" />
      </div>

      <div>
        <h1 className="font-[Outfit] text-5xl font-bold text-[#231A16] mb-3 text-glow">
          {multiple ? 'Orders Confirmed!' : 'Order Confirmed!'}
        </h1>
        <p className="text-[#7A6A5B] text-lg">
          Thank you for your purchase. {multiple ? 'Your orders are' : 'Your order is'} being processed.
        </p>
      </div>

      <GlassCard className="p-6 w-full border-t-4 border-t-[#B7322A]">
        <div className="flex flex-col gap-4">
          {multiple ? (
            <div className="flex flex-col gap-2">
              <p className="text-[#7A6A5B] text-sm text-left">
                Your cart had items from {orders.length} stores, so it was split into {orders.length} orders:
              </p>
              {orders.map((order, index) => (
                <div
                  key={order.orderId}
                  className="flex justify-between items-center py-3 border-b border-[#231a16]/10 last:border-0"
                >
                  <span className="text-[#7A6A5B] text-sm">Order {index + 1}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-[Outfit] text-base font-bold text-[#B7322A] uppercase">{order.orderId}</span>
                    {order.total != null && <span className="text-[#231A16] text-sm font-semibold">{inr(order.total)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between items-center py-3 border-b border-[#231a16]/10">
              <span className="text-[#7A6A5B] text-sm">Order ID</span>
              <span className="font-[Outfit] text-lg font-bold text-[#B7322A] uppercase">{orderId}</span>
            </div>
          )}
          {total != null && (
            <div className="flex justify-between items-center py-3 border-b border-[#231a16]/10">
              <span className="text-[#7A6A5B] text-sm">Total Paid</span>
              <span className="font-[Outfit] text-lg font-semibold text-[#231A16]">{inr(total)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-b border-[#231a16]/10">
            <span className="text-[#7A6A5B] text-sm">Estimated Delivery</span>
            <span className="font-[Outfit] text-lg font-semibold text-[#231A16]">5–7 Business Days</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-[#7A6A5B] text-sm">Status</span>
            <span className="px-3 py-1 rounded-full bg-[#C8901A]/20 text-[#C8901A] border border-[#C8901A]/30 text-xs font-bold uppercase">Processing</span>
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-col items-center gap-2 text-[#7A6A5B] text-sm">
        <Package size={20} className="text-[#C8901A]" />
        <p>A confirmation email with your tracking details will be sent shortly.</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        <Link to="/home" className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#7A1F1A] to-[#B7322A] text-[#FDF8F0] font-[Outfit] text-base font-bold hover:shadow-[0_0_9px_rgba(183,50,42,0.17)] transition-all">
          Continue Shopping <ArrowRight size={18} />
        </Link>
        <Link to="/profile" className="flex items-center gap-2 px-8 py-3 rounded-xl border border-[#231a16]/10 text-[#2A211B] font-[Outfit] text-base font-semibold hover:bg-[#231a16]/5 transition-all">
          View My Orders
        </Link>
      </div>
    </div>
  );
}
