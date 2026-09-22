import { Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BUSINESS, POLICY_LINKS } from '../lib/business';

export default function Footer() {
  return (
    <footer className="bg-[#231A16] border-t border-[#FDF8F0]/10 py-20 px-16 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      <div>
        <div className="font-[Outfit] text-2xl font-bold text-[#FDF8F0] flex items-center gap-2 mb-2">
          <Rocket className="text-[#E0A11C]" /> {BUSINESS.brandName}
        </div>
        <p className="text-[#C4B5A2] text-sm">© 2024 {BUSINESS.brandName}. Future-Ready Commerce. All rights reserved.</p>
      </div>
      <div className="flex flex-wrap gap-6 items-center md:justify-end">
        {POLICY_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="text-[#C4B5A2] text-sm hover:text-[#E0A11C] transition-colors">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
