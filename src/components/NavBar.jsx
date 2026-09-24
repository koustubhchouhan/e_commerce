import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, ShoppingCart, User, Search, LogOut, Menu, X,
  Home, LayoutGrid, MessageCircle, Package,
  LayoutDashboard, ClipboardList, Settings, MoreHorizontal,
} from 'lucide-react';
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

  const profileRef = useRef(null);
  const drawerCloseRef = useRef(null);

  // Profile menu: dismiss on an outside tap or Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  // Mobile drawer: lock background scroll, close on Escape, move focus inside.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerCloseRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const runSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') runSearch();
  };

  // A tab is active on its exact path or any nested path. Exact matching keeps
  // siblings like /seller, /seller-requests and /seller-profile distinct.
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  const NavItem = ({ to, label, mobile = false }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={() => setMobileOpen(false)}
        className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${mobile ? 'text-base w-full' : ''} ${
          active
            ? 'bg-[#FDF8F0]/18 text-[#FDF8F0]'
            : 'text-[#FDF8F0]/80 hover:bg-[#FDF8F0]/10 hover:text-[#FDF8F0]'
        }`}
      >
        {label}
      </Link>
    );
  };

  const NavItemMobile = ({ to, label }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={() => setMobileOpen(false)}
        className={`px-4 py-3 rounded-2xl text-base transition-colors ${
          active ? 'bg-[#B7322A] text-[#FDF8F0] font-semibold' : 'text-[#2A211B] hover:bg-[#231a16]/5'
        }`}
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
    { to: '/messages', label: 'My Messages' },
  ];
  const sellerLinks = [
    { to: '/seller', label: 'Dashboard' },
    { to: '/inventory', label: 'My Inventory' },
    { to: '/seller-requests', label: 'Requests' },
  ];
  const adminLinks = [
    { to: '/admin', label: 'Global Dashboard' },
    { to: '/inventory', label: 'Sell Products' },
    { to: '/admin-profile', label: 'Platform Settings' },
  ];

  const links = userRole === 'customer' ? customerLinks : userRole === 'seller' ? sellerLinks : adminLinks;
  const profileLink = userRole === 'customer' ? '/profile' : userRole === 'seller' ? '/seller-profile' : '/admin-profile';
  const profileLabel = userRole === 'customer' ? 'My Profile' : userRole === 'seller' ? 'Seller Profile' : 'Admin Settings';

  const bottomNavByRole = {
    customer: [
      { to: '/home', label: 'Home', icon: Home },
      { to: '/categories', label: 'Shop', icon: LayoutGrid },
      { to: '/cart', label: 'Cart', icon: ShoppingCart },
      { to: '/messages', label: 'Messages', icon: MessageCircle },
      { to: '/profile', label: 'Profile', icon: User },
    ],
    seller: [
      { to: '/seller', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/inventory', label: 'Inventory', icon: Package },
      { to: '/seller-requests', label: 'Requests', icon: ClipboardList },
      { to: '/seller-profile', label: 'Profile', icon: User },
    ],
    admin: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/inventory', label: 'Products', icon: Package },
      { to: '/admin-profile', label: 'Settings', icon: Settings },
      { more: true, label: 'More', icon: MoreHorizontal },
    ],
  };
  const bottomNav = bottomNavByRole[userRole] ?? [];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#B7322A] text-[#FDF8F0] shadow-[0_2px_14px_rgba(143,38,32,0.25)] pt-[calc(env(safe-area-inset-top))]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center gap-3 md:gap-6">

          {/* Brand */}
          <Link
            to={userRole === 'admin' ? '/admin' : userRole === 'seller' ? '/seller' : '/home'}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="w-9 h-9 rounded-full bg-[#E0A11C] text-[#231A16] flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-[#FDF8F0]">Arghya</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 font-body">
            {links.map(l => <NavItem key={l.to} to={l.to} label={l.label} />)}
          </nav>

          {/* Search (desktop, customers) */}
          {userRole === 'customer' && (
            <div className="hidden md:flex flex-1 max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7B6B]" size={17} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search the storefront…"
                className="w-full bg-[#FDF8F0] rounded-full py-2.5 pl-11 pr-4 text-sm text-[#2A211B] outline-none placeholder:text-[#A79684] focus:ring-2 focus:ring-[#E0A11C]/60"
              />
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto relative">
            {userRole === 'customer' && (
              <Link
                to="/cart"
                aria-label={`Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
                className="relative h-11 px-3 flex items-center gap-2 rounded-full hover:bg-[#FDF8F0]/10 transition-colors"
              >
                <ShoppingCart size={20} />
                <span className="hidden sm:inline text-sm font-medium">Cart</span>
                {totalItems > 0 && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-[#E0A11C] text-[#231A16] text-[11px] font-bold flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                className="h-11 w-11 flex items-center justify-center rounded-full border border-[#FDF8F0]/40 hover:bg-[#FDF8F0]/10 transition-colors"
              >
                <User size={20} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#FFFCF7] border border-[#E7DAC8] shadow-2xl overflow-hidden animate-fade-in-up origin-top-right z-50 text-[#2A211B]">
                  <div className="px-4 py-3 border-b border-[#231a16]/5">
                    <p className="micro-label">{userRole} Account</p>
                  </div>
                  <div className="py-1">
                    <Link to={profileLink} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#231a16]/5 transition-colors">
                      <User size={16} /> {profileLabel}
                    </Link>
                    {userRole === 'customer' && (
                      <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#231a16]/5 transition-colors">
                        <Package size={16} /> My Orders
                      </Link>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#B3261E] hover:bg-[#231a16]/5 transition-colors text-left">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger (mobile) */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden h-11 w-11 flex items-center justify-center rounded-full hover:bg-[#FDF8F0]/10 transition-colors"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ══ Mobile Drawer ══ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="relative ml-auto w-[82vw] max-w-[340px] h-full bg-[#FDF8F0] border-l border-[#E7DAC8] flex flex-col p-6 gap-4 shadow-2xl animate-fade-in-up pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-display text-xl font-semibold text-[#231A16]">Menu</span>
              <button
                ref={drawerCloseRef}
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="text-[#7A6A5B] hover:text-[#231A16] h-11 w-11 flex items-center justify-center rounded-full hover:bg-[#231a16]/5 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {userRole === 'customer' && (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7B6B]" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKey}
                  placeholder="Search products…"
                  className="field pl-11"
                />
              </div>
            )}

            <nav className="flex flex-col gap-1 flex-1">
              {links.map(l => <NavItemMobile key={l.to} to={l.to} label={l.label} />)}
            </nav>

            <div className="border-t border-[#E7DAC8] pt-4 flex flex-col gap-2">
              <Link to={profileLink} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-[#2A211B] hover:bg-[#231a16]/5 rounded-2xl transition-colors">
                <User size={16} /> {profileLabel}
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#B3261E] hover:bg-[#231a16]/5 rounded-2xl transition-colors text-left">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Mobile bottom navigation (all signed-in roles) ══ */}
      {bottomNav.length > 0 && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFCF7] border-t border-[#E7DAC8] pb-[env(safe-area-inset-bottom)]">
          <div className={bottomNav.length > 4 ? 'grid grid-cols-5' : 'grid grid-cols-4'}>
            {bottomNav.map(({ to, label, icon: Icon, more }) => {
              const active = !more && isActive(to);
              const tabClass = `relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-[#B7322A]' : 'text-[#8A7B6B]'
              }`;

              if (more) {
                return (
                  <button key="more" type="button" onClick={() => setMobileOpen(true)} className={tabClass}>
                    <Icon size={20} />
                    {label}
                  </button>
                );
              }

              return (
                <Link key={to} to={to} className={tabClass}>
                  <Icon size={20} />
                  {label}
                  {to === '/cart' && totalItems > 0 && (
                    <span className="absolute top-1 right-1/2 translate-x-4 min-w-4 h-4 px-1 rounded-full bg-[#B7322A] text-[#FDF8F0] text-[9px] font-bold flex items-center justify-center">
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
