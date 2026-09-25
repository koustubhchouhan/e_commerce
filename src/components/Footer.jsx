import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BUSINESS, POLICY_LINKS } from '../lib/business';

const labelClass = 'text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-[#E0A11C] mb-2';
const linkClass = 'text-xs sm:text-sm text-[#F6D9CE] hover:text-[#FDF8F0] transition-colors';

const SHOP_LINKS = [
  { to: '/home', label: 'All categories' },
  { to: '/categories', label: 'Shop by occasion' },
  { to: '/about', label: 'About Arghya' },
];

const HELP_LINKS = [
  { to: '/contact', label: 'Contact Us' },
  { to: '/messages', label: 'My Messages' },
];

export default function Footer() {
  return (
    <footer className="bg-[#B7322A] text-[#FDF8F0] px-6 md:px-16 pt-8 md:pt-12 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] relative z-10">
      <div className="max-w-[1440px] mx-auto grid grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6 md:gap-10">
        <div className="col-span-3 md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#E0A11C] text-[#2A130F] flex items-center justify-center shrink-0">
              <ShoppingBag size={16} />
            </span>
            <span className="font-display text-lg md:text-2xl font-bold text-[#FDF8F0]">{BUSINESS.brandName}</span>
          </div>
          <p className="hidden md:block text-[#F6D9CE] text-sm max-w-xs mt-3">
            Pandit-verified puja kits and samagri, delivered before your muhurat.
          </p>
        </div>

        <div>
          <p className={labelClass}>Shop</p>
          <ul className="flex flex-col gap-1.5">
            {SHOP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Help</p>
          <ul className="flex flex-col gap-1.5">
            {HELP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Company</p>
          <ul className="flex flex-col gap-1.5">
            {POLICY_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto mt-6 md:mt-10 pt-4 md:pt-6 border-t border-[#FDF8F0]/25">
        <p className="text-[11px] sm:text-xs text-[#F6D9CE]">
          © {new Date().getFullYear()} {BUSINESS.brandName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
