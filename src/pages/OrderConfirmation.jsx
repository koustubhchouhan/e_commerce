import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function OrderConfirmation() {
  const location = useLocation();
  const orderId = location.state?.orderId || 'NV-XXXXXX';
  const total = location.state?.total;

  return (
    <div className="max-w-[700px] mx-auto px-6 py-20 animate-fade-in-up flex flex-col items-center gap-8 text-center">
      
      {/* Animated Success Icon */}
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-[#ff9933]/10 border-2 border-[#ff9933]/30 flex items-center justify-center shadow-[0_0_18px_rgba(255,153,51,0.11)]">
          <CheckCircle size={56} className="text-[#ff9933]" strokeWidth={1.5} />
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border-2 border-[#ff9933]/20 animate-ping" />
      </div>

      <div>
        <h1 className="font-[Outfit] text-5xl font-bold text-[#fff4e6] mb-3 text-glow">Order Confirmed!</h1>
        <p className="text-[#cbb89d] text-lg">Thank you for your purchase. Your order is being processed.</p>
      </div>

      <GlassCard className="p-6 w-full border-t-4 border-t-[#ff9933]">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <span className="text-[#cbb89d] text-sm">Order ID</span>
            <span className="font-[Outfit] text-lg font-bold text-[#ff9933] uppercase">{orderId}</span>
          </div>
          {total != null && (
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[#cbb89d] text-sm">Total Paid</span>
              <span className="font-[Outfit] text-lg font-semibold text-[#fff4e6]">${Number(total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-b border-white/10">
            <span className="text-[#cbb89d] text-sm">Estimated Delivery</span>
            <span className="font-[Outfit] text-lg font-semibold text-[#fff4e6]">5–7 Business Days</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-[#cbb89d] text-sm">Status</span>
            <span className="px-3 py-1 rounded-full bg-[#ffd27a]/20 text-[#ffd27a] border border-[#ffd27a]/30 text-xs font-bold uppercase">Processing</span>
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-col items-center gap-2 text-[#cbb89d] text-sm">
        <Package size={20} className="text-[#ffd27a]" />
        <p>A confirmation email with your tracking details will be sent shortly.</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        <Link to="/home" className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#9c5214] to-[#ff9933] text-[#2e1800] font-[Outfit] text-base font-bold hover:shadow-[0_0_9px_rgba(255,153,51,0.17)] transition-all">
          Continue Shopping <ArrowRight size={18} />
        </Link>
        <Link to="/profile" className="flex items-center gap-2 px-8 py-3 rounded-xl border border-white/10 text-[#f1e7d7] font-[Outfit] text-base font-semibold hover:bg-white/5 transition-all">
          View My Orders
        </Link>
      </div>
    </div>
  );
}
