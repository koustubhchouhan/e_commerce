import { Package, Shield, MapPin, CreditCard, ChevronRight, Lock, ShieldCheck, Wallet } from 'lucide-react';

export default function UserProfile() {
  return (
    <div className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-20 flex flex-col gap-20 animate-fade-in-up">

      {/* ═══ Profile Header Section ═══ */}
      <section className="w-full flex flex-col md:flex-row items-start md:items-center gap-6 glass-panel p-6 rounded-xl">
        <div className="w-24 h-24 rounded-full bg-[#2b1d0d] border border-[#4b3d2a] flex items-center justify-center overflow-hidden shrink-0">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnYaqjk_m0qRZY4iQfl4BMsnvnsPWNUYRTHVK86K7qcpoSAeSGNV7nvcUECHxtOidmSYGxmQ-KKySXGJqULj1JGDbbAXH81e6lb81owparsbRTr5dhwiRlSb846wd7ZCCEKMQKYGNPGXmoDwhK5xG0_I-efNpWTAelvIhdRw0vDedvLsEcQgKqMBdJV37LOMRVPqYzY5slRVZTHFRavupe12diD1XYJyqbwVtBGqS8UmpZshcXnbUf"
            alt="User avatar"
          />
        </div>
        <div className="flex-grow">
          <h1 className="font-[Outfit] text-4xl md:text-5xl font-bold text-[#fff4e6] tracking-tight">Alex Mercer</h1>
          <p className="font-[Inter] text-lg text-[#cbb89d]">Premium Member since 2023</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-[#9c5214] to-[#ff9933] text-[#2e1800] font-[Inter] text-xs font-semibold tracking-[0.05em] uppercase rounded-lg hover:shadow-[0_0_9px_rgba(255,153,51,0.17)] transition-all duration-300 whitespace-nowrap">
          Edit Profile
        </button>
      </section>

      {/* ═══ Bento Grid Layout ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* Your Orders — 8 cols */}
        <a href="#" className="lg:col-span-8 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3 text-[#fff4e6]">
              <Package size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold">Your Orders</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#fff4e6] transition-colors" />
          </div>
          {/* Recent Order Preview */}
          <div className="bg-[#34250f]/50 p-4 rounded-lg border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#cbb89d] uppercase">ORDER #NV-8924</span>
              <span className="px-2 py-1 rounded-full bg-[#fff4e6]/20 text-[#ffbf66] text-[10px] uppercase font-bold tracking-wider">In Transit</span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded bg-[#170e03] border border-white/10 overflow-hidden shrink-0">
                <img
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZfxH6Y8zCMgO2HddGoRKCpL-1Po7DRxT_-fiT3ZJDNXieAIqi-8QAPrCdIg8ikG4FtKMouKcvdk5Tsk7AmOccanbCzzF_yfYxyP4wPOl9c0BuYp5Srs0VWQa7Tut2eYvysgOBR-NUZtC17JS118VqbdfB-nDRgxsMeKHGVCTwhYkovNPYT3y42AIlrTOU3lc9PynjXJCNfKUjGOsaA0BpWi3lkXFOIrDtjKYZRzEt8_JU_gxburfB"
                  alt="NovaTech Smartwatch Pro"
                />
              </div>
              <div>
                <h3 className="font-[Outfit] text-xl font-semibold text-[#f1e7d7]">NovaTech Smartwatch Pro</h3>
                <p className="font-[Inter] text-sm text-[#cbb89d]">Expected Delivery: Oct 24</p>
              </div>
            </div>
          </div>
        </a>

        {/* Login & Security — 4 cols */}
        <a href="#" className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[280px]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2 text-[#ffd27a]">
              <Shield size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-2xl font-semibold mt-2">Login & Security</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#ffd27a] transition-colors" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#cbb89d]">
              <Lock size={16} />
              <span className="font-[Inter] text-sm">Change Password</span>
            </div>
            <div className="flex items-center gap-3 text-[#cbb89d]">
              <ShieldCheck size={16} />
              <span className="font-[Inter] text-sm">2-Step Verification Active</span>
            </div>
          </div>
        </a>

        {/* Addresses — 6 cols */}
        <a href="#" className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#ff7418]">
              <MapPin size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Addresses</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#ff7418] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5">
            <span className="font-[Inter] text-xs font-semibold tracking-[0.05em] text-[#ffbf66] block mb-1 uppercase">DEFAULT</span>
            <p className="font-[Inter] text-base text-[#f1e7d7]">1284 Neon Boulevard, Apt 404<br/>Neo-Angeles, CA 90210</p>
          </div>
        </a>

        {/* Payment Options — 6 cols */}
        <a href="#" className="lg:col-span-6 glass-panel p-6 rounded-xl flex flex-col justify-between group transition-all duration-300 min-h-[200px]">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-[#fffaf0]">
              <CreditCard size={28} className="group-hover:scale-110 transition-transform" />
              <h2 className="font-[Outfit] text-xl font-semibold">Payment Options</h2>
            </div>
            <ChevronRight size={24} className="text-[#cbb89d] group-hover:text-[#fffaf0] transition-colors" />
          </div>
          <div className="bg-[#34250f]/30 p-3 rounded-lg border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet size={20} className="text-[#f1e7d7]" />
              <span className="font-[Inter] text-base text-[#f1e7d7]">NovaWallet Balance</span>
            </div>
            <span className="font-[Outfit] text-xl font-semibold text-[#fff4e6]">$450.00</span>
          </div>
        </a>

      </section>
    </div>
  );
}
