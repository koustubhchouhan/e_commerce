import { Minus, Plus, Trash2, ArrowRight, ShieldCheck, CreditCard, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { inr } from '../lib/money';

export default function Cart() {
  const { items, removeItem, updateQty, getSubtotal } = useCartStore();
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const total = subtotal;
  const sellers = [...new Set(items.map(({ product }) => product?.storeName).filter(Boolean))];
  const mixedSellers = sellers.length > 1;

  const handleRemove = (id, title) => {
    removeItem(id);
    addToast(`${title} removed from cart`, 'info');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up flex flex-col gap-8">
      
      <header className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#B7322A]/10 text-[#B7322A] flex items-center justify-center shrink-0 border border-[#B7322A]/20">
          <ShoppingBag size={24} />
        </div>
        <div>
          <h1 className="font-[Outfit] text-4xl font-bold text-[#231A16] text-glow tracking-tight">Your Cart</h1>
          <p className="text-[#7A6A5B] mt-1 text-sm">{items.length === 0 ? 'Your cart is empty.' : `${items.reduce((a,i)=>a+i.quantity,0)} item(s) in your cart.`}</p>
        </div>
      </header>

      {mixedSellers && (
        <div className="bg-[#B7322A]/10 border border-[#B7322A]/30 rounded-xl px-5 py-4 text-sm text-[#C8901A]">
          Your cart has items from {sellers.length} sellers: {sellers.join(', ')}. No problem — checkout will automatically split this into one order per seller.
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShoppingBag size={60} className="text-[#F0E7DA]" />
          <p className="text-[#7A6A5B] text-xl">Your cart is empty.</p>
          <Link to="/home" className="mt-2 px-6 py-3 rounded-lg bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] font-[Outfit] font-bold text-base hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all">Start Shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Cart Items */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            {items.map(({ product, quantity }) => (
              <GlassCard key={product.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:border-[#B7322A]/30 transition-all duration-300">
                <div className="w-full sm:w-32 h-32 rounded-lg bg-[#FDF8F0]/50 border border-[#231a16]/5 overflow-hidden shrink-0">
                  <img src={product.img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-[Outfit] text-xl font-semibold text-[#231A16] line-clamp-1">{product.title}</h3>
                    <button onClick={() => handleRemove(product.id, product.title)} className="text-[#B3261E]/70 hover:text-[#B3261E] hover:bg-[#FBE3E1]/20 p-2 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="font-[Outfit] text-xl font-bold text-[#B7322A]">{inr(product.price)}</p>
                  {product.storeName && <span className="text-[11px] text-[#8A7B6B] uppercase tracking-wider font-[Inter]">by {product.storeName}</span>}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center bg-[#F5ECDE] border border-[#231a16]/10 rounded-lg p-1">
                      <button onClick={() => updateQty(product.id, quantity - 1)} className="w-8 h-8 flex items-center justify-center text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 rounded-md transition-colors"><Minus size={14} /></button>
                      <span className="w-10 text-center font-semibold text-[#2A211B] text-sm">{quantity}</span>
                      <button onClick={() => updateQty(product.id, quantity + 1)} className="w-8 h-8 flex items-center justify-center text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 rounded-md transition-colors"><Plus size={14} /></button>
                    </div>
                    <span className="text-xs text-[#7A6A5B] font-medium uppercase tracking-wider">
                      Subtotal: <span className="text-[#2A211B]">{inr(product.price * quantity)}</span>
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
            <Link to="/home" className="text-[#B7322A] hover:text-[#E0A11C] text-sm font-semibold flex items-center gap-2 w-fit mt-4 transition-colors">
              <ArrowRight size={16} className="rotate-180" /> Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="xl:col-span-4">
            <GlassCard className="p-8 sticky top-28 flex flex-col gap-6 border-t-4 border-t-[#B8860B]">
              <h2 className="font-[Outfit] text-2xl font-semibold text-[#231A16]">Order Summary</h2>
              
              <div className="flex flex-col gap-4 text-sm font-[Inter] border-b border-[#231a16]/10 pb-6">
                <div className="flex justify-between items-center text-[#7A6A5B]">
                  <span>Subtotal</span>
                  <span className="text-[#2A211B] font-medium">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <span className="text-[#7A6A5B] uppercase tracking-wider text-xs font-bold">Total</span>
                <span className="font-[Outfit] text-4xl font-bold text-[#231A16]">${total.toFixed(2)}</span>
              </div>

              <button onClick={() => navigate('/checkout')} className="w-full py-4 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#E0A11C] text-[#231A16] font-[Outfit] text-lg font-bold tracking-wide hover:shadow-[0_0_11px_rgba(224,161,28,0.22)] transition-all flex items-center justify-center gap-2 mt-4 group">
                Proceed to Checkout <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3 text-xs text-[#7A6A5B]">
                  <ShieldCheck size={16} className="text-[#B7322A]" /> Secure SSL encrypted checkout
                </div>
                <div className="flex items-center gap-3 text-xs text-[#7A6A5B]">
                  <CreditCard size={16} className="text-[#C8901A]" /> Accepts all major credit & debit cards
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
