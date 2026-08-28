import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Rocket, ShoppingCart, User, Search, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const totalItems = useCartStore(s => s.getTotalItems());

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const NavItem = ({ to, label, mobile = false }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        onClick={() => setMobileOpen(false)}
        className={`px-3 py-2 rounded-lg transition-colors duration-300 ${mobile ? 'text-base w-full' : ''} ${active ? 'text-[#ff9933] font-bold border-b-2 border-[#ff9933]' : 'text-[#cbb89d] hover:bg-white/5 hover:text-[#f1e7d7]'}`}
      >
        {label}
      </Link>
    );
  };

  const customerLinks = [
    { to: '/home', label: 'Shop' },
    { to: '/categories', label: 'Categories' },
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact Us' },
  ];
  const sellerLinks = [
    { to: '/seller', label: 'Dashboard' },
    { to: '/inventory', label: 'My Inventory' },
    { to: '/seller-requests', label: 'Requests' },
  ];
  const adminLinks = [
    { to: '/admin', label: 'Global Dashboard' },
    { to: '/admin-profile', label: 'Platform Settings' },
  ];

  const links = userRole === 'customer' ? customerLinks : userRole === 'seller' ? sellerLinks : adminLinks;
  const profileLink = userRole === 'customer' ? '/profile' : userRole === 'seller' ? '/seller-profile' : '/admin-profile';
  const profileLabel = userRole === 'customer' ? 'My Profile' : userRole === 'seller' ? 'Seller Profile' : 'Admin Settings';

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#170e03]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_1px_20px_rgba(255,153,51,0.1)] px-6 md:px-8 py-3 flex justify-between items-center w-full">
        
        {/* Logo */}
        <Link to={userRole === 'admin' ? '/admin' : userRole === 'seller' ? '/seller' : '/home'} className="flex items-center gap-2 font-[Outfit] text-2xl font-bold text-[#fff4e6]">
          <Rocket className="text-[#ff9933]" />
          <span className="hidden sm:block">NovaMarket</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-6 font-[Inter] text-base">
          {links.map(l => <NavItem key={l.to} to={l.to} label={l.label} />)}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 relative">
          {userRole === 'customer' && (
            <>
              <div className="hidden md:flex items-center relative mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="Search products..."
                  className="bg-[#1a1307]/70 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all w-[200px]"
                />
              </div>
              <Link to="/cart" className="relative text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 p-2 rounded-full transition-all">
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff9933] text-[#2e1800] text-[10px] font-bold flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            </>
          )}

          {/* Profile Dropdown */}
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="text-[#ff9933] hover:bg-white/5 p-2 rounded-full transition-all border border-transparent hover:border-[#ff9933]/30 flex items-center justify-center bg-[#ff9933]/10">
              <User size={20} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-3 w-52 rounded-xl bg-[#221708] border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up origin-top-right z-50">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-xs text-[#cbb89d] font-semibold uppercase tracking-wider">{userRole} Account</p>
                </div>
                <div className="py-1">
                  <Link to={profileLink} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#f1e7d7] hover:bg-white/5 transition-colors">
                    <User size={16} /> {profileLabel}
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#ffb4ab] hover:bg-white/5 transition-colors text-left">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-[#cbb89d] hover:text-[#fff4e6] p-2 rounded-lg hover:bg-white/5 transition-all">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ══ Mobile Drawer ══ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          {/* Drawer */}
          <div className="relative ml-auto w-[80vw] max-w-[320px] h-full bg-[#1c1206] border-l border-white/10 flex flex-col p-6 gap-4 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <span className="font-[Outfit] text-xl font-bold text-[#fff4e6]">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-[#cbb89d] hover:text-[#fff4e6] p-1"><X size={22} /></button>
            </div>

            {/* Search (mobile) */}
            {userRole === 'customer' && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="Search products..."
                  className="w-full bg-[#1a1307]/70 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all"
                />
              </div>
            )}

            <nav className="flex flex-col gap-1 flex-1">
              {links.map(l => <NavItem key={l.to} to={l.to} label={l.label} mobile />)}
              {userRole === 'customer' && (
                <Link to="/cart" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg text-[#cbb89d] hover:bg-white/5 hover:text-[#f1e7d7] transition-colors flex items-center gap-2">
                  <ShoppingCart size={16} /> Cart {totalItems > 0 && <span className="ml-auto text-xs bg-[#ff9933] text-[#2e1800] font-bold px-2 py-0.5 rounded-full">{totalItems}</span>}
                </Link>
              )}
            </nav>

            <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
              <Link to={profileLink} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-[#f1e7d7] hover:bg-white/5 rounded-lg transition-colors">
                <User size={16} /> {profileLabel}
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#ffb4ab] hover:bg-white/5 rounded-lg transition-colors text-left">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
