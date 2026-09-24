import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, ArrowRight, Check, Lock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { inr } from '../lib/money';

const STEPS = ['Shipping', 'Payment'];

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// Inject Razorpay's checkout script exactly once. Resolves with the global
// `Razorpay` constructor so a dismissed/duplicated modal cannot double-load it.
function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Payments unavailable.'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SRC}"]`);
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Could not start the payment gateway.'));
    });
    script.addEventListener('error', () => reject(new Error('Could not reach the payment gateway.')));
    if (!existing) {
      script.src = RAZORPAY_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export default function Checkout() {
  const [step, setStep] = useState(0);
  const { items, getSubtotal, clearCart } = useCartStore();
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const total = subtotal;
  const sellers = [...new Set(items.map(({ product }) => product?.storeName).filter(Boolean))];

  const [placing, setPlacing] = useState(false);
  const [shipping_form, setShipping] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    pin: '',
    phone: '',
  });
  const { user } = useAuth();
  const saved = user?.shippingAddress;
  const appliedDefault = useRef(false);

  // Once the session is available, pre-fill the shipping form with the saved
  // default address. Runs a single time so edits made by the user win.
  useEffect(() => {
    if (appliedDefault.current || !saved) return;
    appliedDefault.current = true;
    setShipping({
      firstName: saved.firstName ?? '',
      lastName: saved.lastName ?? '',
      address: saved.address ?? '',
      city: saved.city ?? '',
      pin: saved.pin ?? '',
      phone: saved.phone ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      addToast('Your cart is empty.', 'error');
      return;
    }
    setPlacing(true);
    try {
      const payloadItems = items.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
      }));
      const shippingAddress = {
        firstName: shipping_form.firstName,
        lastName: shipping_form.lastName,
        address: shipping_form.address,
        city: shipping_form.city,
        pin: shipping_form.pin,
        phone: shipping_form.phone,
      };

      // Open the gateway order (server prices it) and load the modal in parallel.
      const [Razorpay, order] = await Promise.all([
        loadRazorpay(),
        api.createPaymentOrder(payloadItems, shippingAddress),
      ]);

      // Resolves on a verified capture, rejects on dismiss/failure so the catch
      // below can surface a message. Pending orders stay on hold for a retry.
      await new Promise((resolve, reject) => {
        const rzp = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Arghya',
          description: order.orders?.length > 1 ? `${order.orders.length} store orders` : 'Order payment',
          order_id: order.razorpayOrderId,
          prefill: {
            name: `${shipping_form.firstName} ${shipping_form.lastName}`.trim(),
            contact: shipping_form.phone,
            email: user?.email,
          },
          notes: { order_ids: (order.orderIds ?? []).join(',') },
          theme: { color: '#B7322A' },
          handler: async (response) => {
            try {
              await api.verifyPayment(response);
              clearCart();
              const orderCount = order.orders?.length ?? 1;
              addToast(
                orderCount > 1
                  ? `Payment successful — split into ${orderCount} store orders.`
                  : 'Payment successful!',
                'success'
              );
              navigate('/order-confirmation', {
                state: {
                  orders: order.orders ?? [],
                  orderId: order.orderIds?.[0],
                  total: order.total,
                },
              });
              resolve();
            } catch (err) {
              reject(new Error(err.message || 'We could not confirm your payment.'));
            }
          },
          modal: {
            ondismiss: () =>
              reject(new Error('Payment cancelled. Your order is on hold — you can retry.')),
          },
        });
        rzp.on('payment.failed', (response) => {
          reject(new Error(response?.error?.description || 'Payment failed. Please try again.'));
        });
        rzp.open();
      });
    } catch (err) {
      addToast(err.message || 'Failed to place order.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 animate-fade-in-up">
      <h1 className="font-display text-4xl font-bold text-[#231A16] mb-2 text-glow">Checkout</h1>
      <p className="text-[#7A6A5B] mb-10">Complete your purchase securely.</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-12">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${i <= step ? 'bg-[#B7322A]/20 text-[#B7322A] border border-[#B7322A]/30' : 'text-[#8A7B6B] border border-[#231a16]/10'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-[#B7322A] text-[#FDF8F0]' : i === step ? 'bg-[#B7322A]/30 text-[#B7322A]' : 'bg-[#231a16]/5 text-[#8A7B6B]'}`}>
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-2 ${step > i ? 'bg-[#B7322A]/50' : 'bg-[#231a16]/10'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form */}
        <div className="lg:col-span-7">
          {step === 0 && (
            <GlassCard className="p-8 flex flex-col gap-5">
              <h2 className="font-display text-2xl font-semibold text-[#231A16] mb-2">Shipping Information</h2>
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
              <button onClick={() => setStep(1)} className="btn btn-primary w-full py-3.5 text-lg mt-4">
                Continue to payment <ArrowRight size={20} />
              </button>
            </GlassCard>
          )}

          {step === 1 && (
            <GlassCard className="p-8 flex flex-col gap-5">
              <h2 className="font-display text-2xl font-semibold text-[#231A16] mb-2">Payment</h2>
              <div className="flex items-center gap-2 text-xs text-[#7A6A5B] mb-2">
                <CreditCard size={15} className="text-[#C8901A]" /> All major credit & debit cards accepted
              </div>
              <div className="rounded-xl border border-[#231a16]/10 bg-[#F5ECDE]/70 p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#2A211B] font-semibold">
                  <Lock size={16} className="text-[#C8901A]" /> Secure payment via Razorpay
                </div>
                <p className="text-xs text-[#7A6A5B] leading-relaxed">
                  Clicking Pay opens Razorpay's secure checkout. Your card details are entered there
                  and never touch Arghya's servers.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(0)} className="btn btn-outline py-3.5 px-6">Back</button>
                <button onClick={handlePlaceOrder} disabled={placing} className="btn btn-primary flex-1 py-3.5 text-lg">
                  {placing ? 'Processing…' : `Pay ${inr(total)}`} {!placing && <ArrowRight size={20} />}
                </button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5">
          <GlassCard className="p-6 sticky top-28">
            <h2 className="font-display text-xl font-semibold text-[#231A16] mb-5">Your Order</h2>

            {sellers.length > 1 && (
              <div className="bg-[#B7322A]/10 border border-[#B7322A]/30 rounded-xl p-3 mb-4 text-xs text-[#C8901A] leading-relaxed">
                Your cart has items from {sellers.length} stores. We'll automatically split it into {sellers.length} orders — each seller ships their own.
              </div>
            )}

            <div className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 border-b border-[#231a16]/5 pb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#231a16]/10">
                    <img src={product.img} alt={product.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#2A211B] text-sm font-semibold truncate">{product.title}</p>
                    <p className="text-[#7A6A5B] text-xs">
                      {product.storeName && <span className="text-[#8A7B6B] uppercase tracking-wider text-[10px]">by {product.storeName} · </span>}
                      Qty: {quantity}
                    </p>
                  </div>
                  <span className="text-[#B7322A] text-sm font-bold shrink-0">{inr(product.price * quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm border-t border-[#231a16]/10 pt-4">
              <div className="flex justify-between text-[#7A6A5B]"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between text-[#231A16] font-bold text-lg pt-2 mt-1 border-t border-[#231a16]/10"><span>Total</span><span>{inr(total)}</span></div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 text-xs text-[#7A6A5B]"><ShieldCheck size={14} className="text-[#B7322A]" /> End-to-end encrypted</div>
              <div className="flex items-center gap-2 text-xs text-[#7A6A5B]"><CreditCard size={14} className="text-[#C8901A]" /> All major credit & debit cards</div>
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
      <label className="micro-label mb-2 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
      />
    </div>
  );
}
