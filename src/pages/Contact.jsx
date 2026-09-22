import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { BUSINESS, businessAddress } from '../lib/business';

const inputClass = 'w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-lg py-3 px-4 text-[#2A211B] outline-none focus:border-[#B7322A] transition-colors';

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
        <h1 className="text-glow font-[Outfit] text-5xl font-bold text-[#231A16] mb-4">
          {context ? `Ask ${context.storeName}` : 'Contact Us'}
        </h1>
        <p className="text-[#7A6A5B] text-lg max-w-2xl mx-auto">
          {context
            ? `Questions about “${context.productName}” go straight to the store that sells it. General questions still reach our support team.`
            : 'Have a question or want to report an issue? Send us a transmission and our support team will get back to you shortly.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-8 flex items-start gap-4 hover:border-[#B7322A]/30 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-[#B7322A]/10 text-[#B7322A] flex items-center justify-center shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#231A16] mb-1">{context ? 'Replies' : 'Email Support'}</h3>
              <p className="text-[#7A6A5B] text-sm mb-1">
                {context ? 'Replies arrive in your My Messages inbox.' : 'Our team replies within 24 hours — check My Messages.'}
              </p>
              <Link to="/messages" className="text-[#B7322A] font-semibold hover:underline">View My Messages</Link>
            </div>
          </GlassCard>

          <GlassCard className="p-8 flex items-start gap-4 hover:border-[#B8860B]/30 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 text-[#C8901A] flex items-center justify-center shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#231A16] mb-1">Direct Line</h3>
              <p className="text-[#7A6A5B] text-sm mb-1">{BUSINESS.supportHours}</p>
              <a href={`tel:${BUSINESS.phone.replace(/[^+\d]/g, '')}`} className="text-[#C8901A] font-semibold hover:underline">{BUSINESS.phone}</a>
            </div>
          </GlassCard>

          <GlassCard className="p-8 flex items-start gap-4 hover:border-[#231a16]/20 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-[#231a16]/5 text-[#2A211B] flex items-center justify-center shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#231A16] mb-1">Headquarters</h3>
              <p className="text-[#7A6A5B] text-sm leading-relaxed">
                {businessAddress.map((line, index) => (
                  <span key={line}>
                    {line}
                    {index < businessAddress.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Contact Form */}
        <GlassCard className="p-10">
          {context && (
            <div className="mb-6 p-4 rounded-lg border border-[#B7322A]/30 bg-[#B7322A]/5 text-sm">
              <p className="text-[#231A16] font-semibold">This message will go to {context.storeName}</p>
              <p className="text-[#7A6A5B] text-xs mt-1 leading-relaxed">
                About “{context.productName}” — sellers reply to their inbox. Our support team can still see every message.
              </p>
            </div>
          )}
          {contextBusy && (
            <div className="mb-6 p-4 rounded-lg border border-[#231a16]/10 bg-[#231a16]/5 text-sm text-[#7A6A5B] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#B7322A]" /> Loading product details...
            </div>
          )}

          <h2 className="font-[Outfit] text-2xl font-bold text-[#231A16] mb-6">Send a Message</h2>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-[#7A6A5B] font-bold uppercase tracking-wider mb-2 block">First Name</label>
                <input type="text" value={form.first_name} onChange={set('first_name')} className={inputClass} placeholder="John" required />
              </div>
              <div>
                <label className="text-xs text-[#7A6A5B] font-bold uppercase tracking-wider mb-2 block">Last Name</label>
                <input type="text" value={form.last_name} onChange={set('last_name')} className={inputClass} placeholder="Doe" required />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7A6A5B] font-bold uppercase tracking-wider mb-2 block">Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="john@example.com" required />
            </div>
            <div>
              <label className="text-xs text-[#7A6A5B] font-bold uppercase tracking-wider mb-2 block">Subject</label>
              <input type="text" value={form.subject} onChange={set('subject')} className={inputClass} placeholder="How can we help?" required />
            </div>
            <div>
              <label className="text-xs text-[#7A6A5B] font-bold uppercase tracking-wider mb-2 block">Message</label>
              <textarea rows="5" value={form.message} onChange={set('message')} className={`${inputClass} resize-none`} placeholder="Your message here..." required />
            </div>
            <button type="submit" disabled={!canSubmit} className="w-full py-4 rounded-lg bg-[#F0E7DA]/50 border border-[#B7322A]/30 text-[#231A16] font-[Outfit] text-lg font-semibold tracking-wider flex items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-[#B7322A] hover:to-[#8F2620] hover:text-[#FDF8F0] hover:border-transparent transition-all mt-2 group disabled:opacity-50 disabled:cursor-not-allowed">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              {sending ? 'Sending...' : context ? `Send to ${context.storeName}` : 'Send Transmission'}
            </button>
            <p className="text-[#8A7B6B] text-xs text-center">
              We reply here on the platform — follow up in{' '}
              <Link to="/messages" className="text-[#B7322A] font-semibold hover:underline">My Messages</Link>.
            </p>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
