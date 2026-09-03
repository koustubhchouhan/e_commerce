import { Minus, Plus, Trash2, ArrowRight, ShieldCheck, CreditCard, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';

export default function Cart() {
  const { items, removeItem, updateQty, getSubtotal } = useCartStore();
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const shipping = items.length > 0 ? 15.00 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleRemove = (id, title) => {
    removeItem(id);
    addToast(`${title} removed from cart`, 'info');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up flex flex-col gap-8">
      
      <header className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#ff9933]/10 text-[#ff9933] flex items-center justify-center shrink-0 border border-[#ff9933]/20">
          <ShoppingBag size={24} />
        </div>
        <div>
          <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] text-glow tracking-tight">Your Cart</h1>
          <p className="text-[#cbb89d] mt-1 text-sm">{items.length === 0 ? 'Your cart is empty.' : `${items.reduce((a,i)=>a+i.quantity,0)} item(s) in your cart.`}</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShoppingBag size={60} className="text-[#34250f]" />
          <p className="text-[#cbb89d] text-xl">Your cart is empty.</p>
          <Link to="/home" className="mt-2 px-6 py-3 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] font-bold text-base hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all">Start Shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Cart Items */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            {items.map(({ product, quantity }) => (
              <GlassCard key={product.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:border-[#ff9933]/30 transition-all duration-300">
                <div className="w-full sm:w-32 h-32 rounded-lg bg-[#100901]/50 border border-white/5 overflow-hidden shrink-0">
                  <img src={product.img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] line-clamp-1">{product.title}</h3>
                    <button onClick={() => handleRemove(product.id, product.title)} className="text-[#ffb4ab]/70 hover:text-[#ffb4ab] hover:bg-[#93000a]/20 p-2 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="font-[Outfit] text-xl font-bold text-[#ff9933]">${product.price.toLocaleString()}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center bg-[#221708] border border-white/10 rounded-lg p-1">
                      <button onClick={() => updateQty(product.id, quantity - 1)} className="w-8 h-8 flex items-center justify-center text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 rounded-md transition-colors"><Minus size={14} /></button>
                      <span className="w-10 text-center font-semibold text-[#f1e7d7] text-sm">{quantity}</span>
                      <button onClick={() => updateQty(product.id, quantity + 1)} className="w-8 h-8 flex items-center justify-center text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 rounded-md transition-colors"><Plus size={14} /></button>
                    </div>
                    <span className="text-xs text-[#cbb89d] font-medium uppercase tracking-wider">
                      Subtotal: <span className="text-[#f1e7d7]">${(product.price * quantity).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
            <Link to="/home" className="text-[#ff9933] hover:text-[#ffbf66] text-sm font-semibold flex items-center gap-2 w-fit mt-4 transition-colors">
              <ArrowRight size={16} className="rotate-180" /> Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="xl:col-span-4">
            <GlassCard className="p-8 sticky top-28 flex flex-col gap-6 border-t-4 border-t-[#c98a12]">
              <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6]">Order Summary</h2>
              
              <div className="flex flex-col gap-4 text-sm font-[Inter] border-b border-white/10 pb-6">
                <div className="flex justify-between items-center text-[#cbb89d]">
                  <span>Subtotal</span>
                  <span className="text-[#f1e7d7] font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[#cbb89d]">
                  <span>Shipping</span>
                  <span className="text-[#f1e7d7] font-medium">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[#cbb89d]">
                  <span>Estimated Tax (8%)</span>
                  <span className="text-[#f1e7d7] font-medium">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <span className="text-[#cbb89d] uppercase tracking-wider text-xs font-bold">Total</span>
                <span className="font-[Outfit] text-4xl font-bold text-[#fff4e6]">${total.toFixed(2)}</span>
              </div>

              <button onClick={() => navigate('/checkout')} className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c98a12] to-[#ffb52e] text-white font-[Outfit] text-lg font-bold tracking-wide hover:shadow-[0_0_11px_rgba(201,138,18,0.22)] transition-all flex items-center justify-center gap-2 mt-4 group">
                Proceed to Checkout <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3 text-xs text-[#cbb89d]">
                  <ShieldCheck size={16} className="text-[#ff9933]" /> Secure SSL encrypted checkout
                </div>
                <div className="flex items-center gap-3 text-xs text-[#cbb89d]">
                  <CreditCard size={16} className="text-[#ffd27a]" /> Accepts all major credit & debit cards
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
