import { Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#100901] border-t border-white/5 py-20 px-16 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      <div>
        <div className="font-[Outfit] text-2xl font-bold text-[#fff4e6] flex items-center gap-2 mb-2">
          <Rocket className="text-[#ff9933]" /> NovaMarket
        </div>
        <p className="text-[#cbb89d] text-sm">© 2024 NovaMarket. Future-Ready Commerce. All rights reserved.</p>
      </div>
      <div className="flex flex-wrap gap-6 items-center md:justify-end">
        <Link to="#" className="text-[#cbb89d] text-sm hover:text-[#ff9933] transition-colors">Privacy Policy</Link>
        <Link to="#" className="text-[#cbb89d] text-sm hover:text-[#ff9933] transition-colors">Terms of Service</Link>
        <Link to="#" className="text-[#cbb89d] text-sm hover:text-[#ff9933] transition-colors">Careers</Link>
      </div>
    </footer>
  );
}
