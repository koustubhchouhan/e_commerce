import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const inputClass = 'w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors';

export default function Contact() {
  const addToast = useToastStore(s => s.addToast);
  const { user } = useAuth();
  const [params] = useSearchParams();
  const productParam = params.get('product');

  const [context, setContext] = useState(null);
  const [contextBusy, setContextBusy] = useState(Boolean(productParam));
  const [form, setForm] = useState({
    first_name: (user?.fullName?.split(' ') ?? [])[0] ?? '',
    last_name: (user?.fullName?.split(' ') ?? []).slice(1).join(' '),
    email: user?.email ?? '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  // When arriving from a product page (?product=<id>), load the item so the
  // message can be routed straight to that product's seller.
  useEffect(() => {
    if (!productParam) return;
    let active = true;
    (async () => {
      try {
        const p = await api.product(productParam);
        if (!active) return;
        if (!p || !p.storeId) {
          addToast('That product is no longer available. Your message will go to our support team.', 'error');
          return;
        }
        setContext({
          productId: p.id,
          storeId: p.storeId,
          storeName: p.storeName || 'the seller',
          productName: p.name,
        });
        setForm((prev) => ({ ...prev, subject: prev.subject || `Question about ${p.name}` }));
      } catch {
        if (active) addToast('Could not load that product. Your message will go to our support team.', 'error');
      } finally {
        if (active) setContextBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productParam, addToast]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const canSubmit = Object.values(form).every((v) => v.trim().length > 0) && !sending && !contextBusy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await api.submitContactMessage({
        ...form,
        store_id: context?.storeId ?? null,
        product_id: context?.productId ?? null,
      });
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
      addToast(
        context ? `Message sent to ${context.storeName}!` : 'Message sent! We\'ll get back to you soon.',
        'success',
      );
    } catch (err) {
      addToast(err.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-12 py-16 animate-fade-in-up">
      <div className="text-center mb-16">
        <h1 className="text-glow font-[Outfit] text-5xl font-bold text-[#fff4e6] mb-4">
          {context ? `Ask ${context.storeName}` : 'Contact Us'}
        </h1>
        <p className="text-[#cbb89d] text-lg max-w-2xl mx-auto">
          {context
            ? `Questions about “${context.productName}” go straight to the store that sells it. General questions still reach our support team.`
            : 'Have a question or want to report an issue? Send us a transmission and our support team will get back to you shortly.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-8 flex items-start gap-4 hover:border-[#ff9933]/30 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-[#ff9933]/10 text-[#ff9933] flex items-center justify-center shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#fff4e6] mb-1">{context ? 'Replies' : 'Email Support'}</h3>
              <p className="text-[#cbb89d] text-sm mb-1">
                {context ? 'Replies arrive by email within 24 hours.' : 'Our team replies within 24 hours.'}
              </p>
              <a href="mailto:support@novamarket.com" className="text-[#ff9933] font-semibold hover:underline">support@novamarket.com</a>
            </div>
          </GlassCard>

          <GlassCard className="p-8 flex items-start gap-4 hover:border-[#c98a12]/30 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-[#c98a12]/10 text-[#ffd27a] flex items-center justify-center shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#fff4e6] mb-1">Direct Line</h3>
              <p className="text-[#cbb89d] text-sm mb-1">Mon-Fri from 9am to 6pm EST.</p>
              <a href="tel:+18005550199" className="text-[#ffd27a] font-semibold hover:underline">+1 (800) 555-0199</a>
            </div>
          </GlassCard>

          <GlassCard className="p-8 flex items-start gap-4 hover:border-white/20 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-white/5 text-[#f1e7d7] flex items-center justify-center shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#fff4e6] mb-1">Headquarters</h3>
              <p className="text-[#cbb89d] text-sm leading-relaxed">
                1284 Neon Boulevard, Suite 404<br/>Neo-Angeles, CA 90210<br/>United States
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Contact Form */}
        <GlassCard className="p-10">
          {context && (
            <div className="mb-6 p-4 rounded-lg border border-[#ff9933]/30 bg-[#ff9933]/5 text-sm">
              <p className="text-[#fff4e6] font-semibold">This message will go to {context.storeName}</p>
              <p className="text-[#cbb89d] text-xs mt-1 leading-relaxed">
                About “{context.productName}” — sellers reply to their inbox. Our support team can still see every message.
              </p>
            </div>
          )}
          {contextBusy && (
            <div className="mb-6 p-4 rounded-lg border border-white/10 bg-white/5 text-sm text-[#cbb89d] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#ff9933]" /> Loading product details...
            </div>
          )}

          <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] mb-6">Send a Message</h2>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">First Name</label>
                <input type="text" value={form.first_name} onChange={set('first_name')} className={inputClass} placeholder="John" required />
              </div>
              <div>
                <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Last Name</label>
                <input type="text" value={form.last_name} onChange={set('last_name')} className={inputClass} placeholder="Doe" required />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="john@example.com" required />
            </div>
            <div>
              <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Subject</label>
              <input type="text" value={form.subject} onChange={set('subject')} className={inputClass} placeholder="How can we help?" required />
            </div>
            <div>
              <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Message</label>
              <textarea rows="5" value={form.message} onChange={set('message')} className={`${inputClass} resize-none`} placeholder="Your message here..." required />
            </div>
            <button type="submit" disabled={!canSubmit} className="w-full py-4 rounded-lg bg-[#34250f]/50 border border-[#ff9933]/30 text-[#fff4e6] font-[Outfit] text-lg font-semibold tracking-wider flex items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-[#ff9933] hover:to-[#ff7418] hover:text-[#2e1800] hover:border-transparent transition-all mt-2 group disabled:opacity-50 disabled:cursor-not-allowed">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              {sending ? 'Sending...' : context ? `Send to ${context.storeName}` : 'Send Transmission'}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
