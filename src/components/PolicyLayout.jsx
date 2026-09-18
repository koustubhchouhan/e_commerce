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
    <div className={isGuest ? 'min-h-screen flex flex-col' : ''}>
      {isGuest && (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#170e03]/90 backdrop-blur-xl">
          <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <Link to="/login" className="font-[Outfit] text-xl font-bold text-[#fff4e6] flex items-center gap-2">
              <Rocket className="text-[#ff9933]" size={22} /> {BUSINESS.brandName}
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg border border-[#ff9933]/30 text-[#ff9933] text-sm font-semibold hover:bg-[#ff9933]/10 transition-colors"
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
        <footer className="border-t border-white/5 bg-[#100901]">
          <div className="max-w-[1100px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="font-[Outfit] text-xl font-bold text-[#fff4e6] flex items-center gap-2 mb-3">
                <Rocket className="text-[#ff9933]" size={20} /> {BUSINESS.brandName}
              </div>
              <p className="text-[#9e8c73] text-xs leading-relaxed">
                {BUSINESS.legalName}
                <br />
                {businessAddress.join(', ')}
              </p>
            </div>
            <div>
              <h3 className="font-[Outfit] text-sm font-bold uppercase tracking-wider text-[#cbb89d] mb-3">
                Policies
              </h3>
              <ul className="flex flex-col gap-2">
                {POLICY_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[#cbb89d] text-sm hover:text-[#ff9933] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-[Outfit] text-sm font-bold uppercase tracking-wider text-[#cbb89d] mb-3">
                Get in touch
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-[#cbb89d]">
                <li className="flex items-center gap-2">
                  <Mail size={15} className="text-[#ff9933] shrink-0" />
                  <a href={`mailto:${BUSINESS.email}`} className="hover:text-[#ff9933] transition-colors">
                    {BUSINESS.email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={15} className="text-[#ff9933] shrink-0" />
                  <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`} className="hover:text-[#ff9933] transition-colors">
                    {BUSINESS.phone}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={15} className="text-[#ff9933] shrink-0 mt-0.5" />
                  <span>{BUSINESS.supportHours}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 py-5 text-center text-xs text-[#9e8c73]">
            © {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}
