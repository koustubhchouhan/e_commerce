import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, ArrowRight, Check } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';

const STEPS = ['Shipping', 'Payment'];

export default function Checkout() {
  const [step, setStep] = useState(0);
  const { items, getSubtotal, clearCart } = useCartStore();
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const total = subtotal;

  const [placing, setPlacing] = useState(false);
  const [shipping_form, setShipping] = useState({ firstName: '', lastName: '', address: '', city: '', pin: '', phone: '' });
  const [payment_form, setPayment] = useState({ cardNumber: '', expiry: '', cvv: '' });

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      addToast('Your cart is empty.', 'error');
      return;
    }
    setPlacing(true);
    try {
      const payload = {
        items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
        shipping_address: {
          firstName: shipping_form.firstName,
          lastName: shipping_form.lastName,
          address: shipping_form.address,
          city: shipping_form.city,
          pin: shipping_form.pin,
          phone: shipping_form.phone,
        },
      };
      const { order_id, total: serverTotal } = await api.createOrder(payload.items, payload.shipping_address);
      clearCart();
      addToast('Order placed successfully!', 'success');
      navigate('/order-confirmation', { state: { orderId: order_id, total: serverTotal } });
    } catch (err) {
      addToast(err.message || 'Failed to place order.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 animate-fade-in-up">
      <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Checkout</h1>
      <p className="text-[#cbb89d] mb-10">Complete your purchase securely.</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-12">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${i <= step ? 'bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/30' : 'text-[#9e8c73] border border-white/10'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-[#ff9933] text-[#2e1800]' : i === step ? 'bg-[#ff9933]/30 text-[#ff9933]' : 'bg-white/5 text-[#9e8c73]'}`}>
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-2 ${step > i ? 'bg-[#ff9933]/50' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form */}
        <div className="lg:col-span-7">
          {step === 0 && (
            <GlassCard className="p-8 flex flex-col gap-5">
              <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-2">Shipping Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" value={shipping_form.firstName} onChange={v => setShipping({...shipping_form, firstName: v})} placeholder="Alex" />
                <Field label="Last Name" value={shipping_form.lastName} onChange={v => setShipping({...shipping_form, lastName: v})} placeholder="Mercer" />
              </div>
              <Field label="Address Line" value={shipping_form.address} onChange={v => setShipping({...shipping_form, address: v})} placeholder="1284 Neon Boulevard, Apt 404" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" value={shipping_form.city} onChange={v => setShipping({...shipping_form, city: v})} placeholder="Neo-Angeles" />
                <Field label="PIN / Zip Code" value={shipping_form.pin} onChange={v => setShipping({...shipping_form, pin: v})} placeholder="90210" />
              </div>
              <Field label="Phone Number" value={shipping_form.phone} onChange={v => setShipping({...shipping_form, phone: v})} placeholder="+1 (555) 000-0000" />
              <button onClick={() => setStep(1)} className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-[#9c5214] to-[#ff9933] text-[#2e1800] font-[Outfit] text-lg font-bold hover:shadow-[0_0_9px_rgba(255,153,51,0.17)] transition-all flex items-center justify-center gap-2">
                Continue to Payment <ArrowRight size={20} />
              </button>
            </GlassCard>
          )}

          {step === 1 && (
            <GlassCard className="p-8 flex flex-col gap-5">
              <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-2">Payment</h2>
              <div className="flex items-center gap-2 text-xs text-[#cbb89d] mb-2">
                <CreditCard size={15} className="text-[#ffd27a]" /> All major credit & debit cards accepted
              </div>
              <div className="flex flex-col gap-5">
                <Field label="Card Number" value={payment_form.cardNumber} onChange={v => setPayment({...payment_form, cardNumber: v})} placeholder="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry Date" value={payment_form.expiry} onChange={v => setPayment({...payment_form, expiry: v})} placeholder="MM / YY" />
                  <Field label="CVV" value={payment_form.cvv} onChange={v => setPayment({...payment_form, cvv: v})} placeholder="•••" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(0)} className="py-3.5 px-6 rounded-xl border border-white/10 text-[#f1e7d7] font-[Outfit] font-bold hover:bg-white/5 transition-all">← Back</button>
                <button onClick={handlePlaceOrder} disabled={placing} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#c98a12] to-[#ffb52e] text-white font-[Outfit] text-lg font-bold hover:shadow-[0_0_11px_rgba(201,138,18,0.22)] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {placing ? 'Placing...' : 'Place Order'} {!placing && <ArrowRight size={20} />}
                </button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5">
          <GlassCard className="p-6 sticky top-28">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-5">Your Order</h2>
            <div className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                    <img src={product.img} alt={product.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f1e7d7] text-sm font-semibold truncate">{product.title}</p>
                    <p className="text-[#cbb89d] text-xs">Qty: {quantity}</p>
                  </div>
                  <span className="text-[#ff9933] text-sm font-bold shrink-0">${(product.price * quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm border-t border-white/10 pt-4">
              <div className="flex justify-between text-[#cbb89d]"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-[#fff4e6] font-bold text-lg pt-2 mt-1 border-t border-white/10"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 text-xs text-[#cbb89d]"><ShieldCheck size={14} className="text-[#ff9933]" /> End-to-end encrypted</div>
              <div className="flex items-center gap-2 text-xs text-[#cbb89d]"><CreditCard size={14} className="text-[#ffd27a]" /> All major credit & debit cards</div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors placeholder-[#4b3d29]"
      />
    </div>
  );
}
