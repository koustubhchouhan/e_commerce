import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

export default function NotFound() {
  const { userRole } = useAuth();

  const home =
    userRole === 'admin'
      ? '/admin'
      : userRole === 'seller'
      ? '/seller'
      : userRole === 'customer'
      ? '/home'
      : '/login';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 animate-fade-in-up">
      <GlassCard className="p-10 md:p-16 max-w-lg w-full text-center flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-[#B7322A]/10 border-2 border-[#B7322A]/30 flex items-center justify-center shadow-[0_0_18px_rgba(183,50,42,0.11)]">
          <Compass size={44} className="text-[#B7322A]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-[Outfit] text-7xl font-bold text-[#231A16] text-glow leading-none">404</h1>
          <p className="font-[Outfit] text-2xl font-semibold text-[#2A211B] mt-3">Lost in the void</p>
          <p className="text-[#7A6A5B] mt-2 text-sm">
            The page you're looking for drifted off the grid or never existed.
          </p>
        </div>
        <Link
          to={home}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#7A1F1A] to-[#B7322A] text-[#FDF8F0] font-[Outfit] text-base font-bold hover:shadow-[0_0_9px_rgba(183,50,42,0.17)] transition-all"
        >
          <ArrowLeft size={18} /> Back to safety
        </Link>
      </GlassCard>
    </div>
  );
}
