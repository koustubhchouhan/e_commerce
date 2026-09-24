import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BUSINESS, POLICY_LINKS } from '../lib/business';

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.09em] text-[#E0A11C] mb-3';
const linkClass = 'text-sm text-[#F6D9CE] hover:text-[#FDF8F0] transition-colors';

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
    <footer className="bg-[#B7322A] text-[#FDF8F0] px-6 md:px-16 py-12 md:py-16 pb-[calc(env(safe-area-inset-bottom)+3rem)] relative z-10">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-full bg-[#E0A11C] text-[#2A130F] flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </span>
            <span className="font-display text-2xl font-bold text-[#FDF8F0]">{BUSINESS.brandName}</span>
          </div>
          <p className="text-[#F6D9CE] text-sm max-w-xs">
            Pandit-verified puja kits and samagri, delivered before your muhurat.
          </p>
        </div>

        <div>
          <p className={labelClass}>Shop</p>
          <ul className="flex flex-col gap-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Help</p>
          <ul className="flex flex-col gap-2">
            {HELP_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={labelClass}>Company</p>
          <ul className="flex flex-col gap-2">
            {POLICY_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto mt-10 pt-6 border-t border-[#FDF8F0]/25">
        <p className="text-xs text-[#F6D9CE]">
          © {new Date().getFullYear()} {BUSINESS.brandName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
