import { Link, Outlet } from 'react-router-dom';
import { Rocket, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BUSINESS, POLICY_LINKS, businessAddress } from '../lib/business';

// Public shell for the legal/policy pages. Guests (including payment-gateway
// reviewers, who are not logged in) still need to read these pages, so when no
// account is present we render our own header and footer. Signed-in users
// already get the app NavBar/Footer from App.jsx, so we only render content.
export default function PolicyLayout() {
  const { userRole } = useAuth();
  const isGuest = userRole === 'guest';

  return (
    <div className={isGuest ? 'min-h-[100dvh] flex flex-col' : ''}>
      {isGuest && (
        <header className="sticky top-0 z-40 border-b border-[#231a16]/5 bg-[#FDF8F0]/90 backdrop-blur-xl">
          <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <Link to="/login" className="font-display text-xl font-bold text-[#231A16] flex items-center gap-2">
              <Rocket className="text-[#B7322A]" size={22} /> {BUSINESS.brandName}
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl border border-[#B7322A]/30 text-[#B7322A] text-sm font-semibold hover:bg-[#B7322A]/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </header>
      )}

      <div className="flex-1">
        <Outlet />
      </div>

      {isGuest && (
        <footer className="border-t border-[#231a16]/5 bg-[#FDF8F0]">
          <div className="max-w-[1100px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="font-display text-xl font-bold text-[#231A16] flex items-center gap-2 mb-3">
                <Rocket className="text-[#B7322A]" size={20} /> {BUSINESS.brandName}
              </div>
              <p className="text-[#8A7B6B] text-xs leading-relaxed">
                {BUSINESS.legalName}
                <br />
                {businessAddress.join(', ')}
              </p>
            </div>
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#7A6A5B] mb-3">
                Policies
              </h3>
              <ul className="flex flex-col gap-2">
                {POLICY_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[#7A6A5B] text-sm hover:text-[#B7322A] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#7A6A5B] mb-3">
                Get in touch
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-[#7A6A5B]">
                <li className="flex items-center gap-2">
                  <Mail size={15} className="text-[#B7322A] shrink-0" />
                  <a href={`mailto:${BUSINESS.email}`} className="hover:text-[#B7322A] transition-colors">
                    {BUSINESS.email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={15} className="text-[#B7322A] shrink-0" />
                  <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`} className="hover:text-[#B7322A] transition-colors">
                    {BUSINESS.phone}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={15} className="text-[#B7322A] shrink-0 mt-0.5" />
                  <span>{BUSINESS.supportHours}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#231a16]/5 py-5 text-center text-xs text-[#8A7B6B]">
            © {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}
