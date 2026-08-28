import { Mail, Phone, MapPin, Send } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';

export default function Contact() {
  const addToast = useToastStore(s => s.addToast);
  const handleSubmit = (e) => {
    e.preventDefault();
    addToast('Message sent! We\'ll get back to you soon.', 'success');
    e.target.reset();
  };
  return (
    <div className="max-w-[1200px] mx-auto px-12 py-16 animate-fade-in-up">
      <div className="text-center mb-16">
        <h1 className="text-glow font-[Outfit] text-5xl font-bold text-[#fff4e6] mb-4">Contact Us</h1>
        <p className="text-[#cbb89d] text-lg max-w-2xl mx-auto">Have a question or want to report an issue? Send us a transmission and our support team will get back to you shortly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-8 flex items-start gap-4 hover:border-[#ff9933]/30 transition-colors cursor-default">
            <div className="w-12 h-12 rounded-full bg-[#ff9933]/10 text-[#ff9933] flex items-center justify-center shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-[Outfit] text-xl font-bold text-[#fff4e6] mb-1">Email Support</h3>
              <p className="text-[#cbb89d] text-sm mb-1">Our team replies within 24 hours.</p>
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
          <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] mb-6">Send a Message</h2>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">First Name</label>
                <input type="text" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors" placeholder="John" />
              </div>
              <div>
                <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Last Name</label>
                <input type="text" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Email Address</label>
              <input type="email" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors" placeholder="john@example.com" />
            </div>
            <div>
              <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Subject</label>
              <input type="text" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors" placeholder="How can we help?" />
            </div>
            <div>
              <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Message</label>
              <textarea rows="5" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-3 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors resize-none" placeholder="Your message here..."></textarea>
            </div>
            <button type="submit" className="w-full py-4 rounded-lg bg-[#34250f]/50 border border-[#ff9933]/30 text-[#fff4e6] font-[Outfit] text-lg font-semibold tracking-wider flex items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-[#ff9933] hover:to-[#ff7418] hover:text-[#2e1800] hover:border-transparent transition-all mt-2 group">
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Send Transmission
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
