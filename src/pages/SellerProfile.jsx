import { Store, CreditCard, Shield, MapPin, ChevronRight, CheckCircle, Wallet } from 'lucide-react';

export default function SellerProfile() {
  return (
    <div className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-20 flex flex-col gap-10 animate-fade-in-up">

      <section className="w-full flex flex-col md:flex-row items-start md:items-center gap-6 glass-panel p-6 rounded-xl border-t-4 border-t-[#ff9933]">
        <div className="w-24 h-24 rounded-full bg-[#170e03] border-2 border-[#ff9933]/50 overflow-hidden shrink-0 shadow-[0_0_7px_rgba(255,153,51,0.11)]">
          <img 
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" 
            alt="Seller Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-3">
            <h1 className="font-[Outfit] text-4xl md:text-5xl font-bold text-[#fff4e6] tracking-tight">Sarah Jenkins</h1>
            <CheckCircle className="text-[#ff9933]" size={24} />
          </div>
          <p className="font-[Inter] text-lg text-[#ff9933] mt-1">NeonTech Store • Verified Partner</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-[#9c5214] to-[#ff9933] text-[#2e1800] font-[Inter] text-xs font-semibold tracking-[0.05em] uppercase rounded-lg hover:shadow-[0_0_9px_rgba(255,153,51,0.17)] transition-all duration-300">
          Edit Store Profile
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3 text-[#fff4e6]">
              <Store size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold">Store Details</h2>
            </div>
          </div>
          <div className="bg-[#34250f]/50 p-4 rounded-lg border border-white/5 space-y-4">
            <div>
              <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Store URL</span>
              <p className="text-[#ff9933]">novamarket.com/store/neontech</p>
            </div>
            <div>
              <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Business Description</span>
              <p className="text-[#f1e7d7] text-sm leading-relaxed">Premium electronics and computing accessories for the modern cyber-citizen. Specializing in high-performance gaming gear.</p>
            </div>
            <div className="flex gap-4 border-t border-white/10 pt-4 mt-2">
              <div>
                <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase block mb-1">Tax ID / VAT</span>
                <p className="text-[#f1e7d7]">US-89247192</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2 text-[#ffd27a]">
              <Shield size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold mt-2">Account Security</h2>
            </div>
          </div>
          <div className="space-y-4">
            <button className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors border border-white/5">
              <span className="font-[Inter] text-sm text-[#f1e7d7] block">Change Password</span>
            </button>
            <button className="w-full text-left bg-[#c98a12]/20 p-3 rounded-lg border border-[#ffd27a]/30">
              <span className="font-[Inter] text-sm text-[#ffd27a] block flex items-center gap-2"><CheckCircle size={14}/> 2-Factor Auth Enabled</span>
            </button>
            <button className="w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors border border-white/5">
              <span className="font-[Inter] text-sm text-[#f1e7d7] block">Active Sessions</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#ff7418]">
              <MapPin size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Warehouse / Return Address</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#ff7418] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5">
            <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#ffbf66] block mb-1 uppercase">PRIMARY WAREHOUSE</span>
            <p className="font-[Inter] text-base text-[#f1e7d7]">880 Industrial CyberWay, Block C<br/>Neo-Angeles, CA 90215</p>
          </div>
        </div>

        <div className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#fffaf0]">
              <CreditCard size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Payout Methods</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#fffaf0] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-4 rounded-lg border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#221708] p-2 rounded border border-white/10">
                <Wallet size={20} className="text-[#f1e7d7]" />
              </div>
              <div>
                <span className="font-[Inter] text-sm font-semibold text-[#fff4e6] block">Bank Transfer (ACH)</span>
                <span className="font-[Inter] text-xs text-[#cbb89d]">Ending in 4492</span>
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-[#ff9933]/20 text-[#ffbf66] text-[10px] font-bold uppercase">Default</span>
          </div>
        </div>

      </section>
    </div>
  );
}
