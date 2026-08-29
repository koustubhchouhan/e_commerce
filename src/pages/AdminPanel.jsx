import { LayoutDashboard, Users, Grid, Star, CreditCard, ShoppingBag, UserCheck, Check, X, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductGrid } from './Home';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';
import { toProductCardList } from '../lib/productShape';

const timeAgo = (iso) => {
  if (!iso) return 'recently';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('products');

  const [approvedProducts, setApprovedProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [busy, setBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.products({ limit: 100 });
        const cards = toProductCardList(res.items);
        setApprovedProducts(cards);
        setFeaturedProducts(cards);
      } catch {
        addToast('Failed to load products.', 'error');
      } finally {
        setLoadingProducts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const reqs = await api.adminApplications('pending');
      setSellerRequests(
        (reqs ?? []).map((r) => ({
          id: r.id,
          user: r.applicant ?? '—',
          email: r.contactEmail,
          storeName: r.storeName,
          date: timeAgo(r.createdAt),
          status: 'Pending',
        })),
      );
    } catch {
      addToast('Failed to load seller requests.', 'error');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReview = async (id, action) => {
    const req = sellerRequests.find((r) => r.id === id);
    setBusy(true);
    try {
      await api.reviewApplication(id, action);
      addToast(
        action === 'approve'
          ? `"${req?.storeName ?? 'Store'}" approved as a verified seller!`
          : `"${req?.storeName ?? 'Request'}" application rejected.`,
        action === 'approve' ? 'success' : 'error',
      );
      await loadRequests();
    } catch (err) {
      addToast(err.message || 'Failed to update application.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const allApprovedProducts = approvedProducts;

  const adminCategories = [
    { id: 1, name: "Gaming & VR", count: 145 },
    { id: 2, name: "Smart Home", count: 82 },
    { id: 3, name: "Audio & Sound", count: 210 },
    { id: 4, name: "PC Components", count: 340 },
    { id: 5, name: "Wearables", count: 56 },
  ];

  const payments = [
    { id: "TXN-9021", date: "Today, 10:45 AM", type: "Customer Payment", amount: "+$499.00", status: "Completed" },
    { id: "TXN-9020", date: "Today, 09:12 AM", type: "Seller Payout (NeonTech)", amount: "-$1,250.00", status: "Processing" },
    { id: "TXN-9019", date: "Yesterday, 04:30 PM", type: "Platform Fee", amount: "+$45.00", status: "Completed" },
    { id: "TXN-9018", date: "Yesterday, 02:15 PM", type: "Customer Refund", amount: "-$129.00", status: "Completed" },
  ];

  const platformOrders = [
    { id: "ORD-9901", customer: "Liam Smith", seller: "NeonTech Store", product: "Nova Pro X-15 Gaming Laptop", date: "Today, 10:30 AM", status: "Processing", amount: "$2,499.00" },
    { id: "ORD-9902", customer: "Emma Johnson", seller: "Chang Electronics", product: "Quantum Core Q-7 GPU", date: "Yesterday, 02:15 PM", status: "Shipped", amount: "$1,299.00" },
    { id: "ORD-9903", customer: "Noah Williams", seller: "NeonTech Store", product: "Aura Sound V2 Headphones", date: "Yesterday, 09:45 AM", status: "Delivered", amount: "$349.99" },
    { id: "ORD-9904", customer: "Olivia Brown", seller: "ElectroWorld", product: "ChronoSync Ultra Smartwatch", date: "Oct 22, 11:20 AM", status: "Pending", amount: "$299.00" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-80px)] animate-fade-in-up">
      {/* Sidebar Navigation */}
      <aside className="w-[280px] bg-[#221708]/90 backdrop-blur-xl border-r border-white/5 p-6 flex flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto">
        <h2 className="font-[Outfit] text-2xl font-bold text-[#ff9933] mb-8 px-4">Admin Dashboard</h2>
        
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarLink icon={<Grid size={20} />} label="Products" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <SidebarLink icon={<UserCheck size={20} />} label="Seller Approvals" active={activeTab === 'seller-requests'} onClick={() => setActiveTab('seller-requests')} />
          <SidebarLink icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarLink icon={<Star size={20} />} label="Featured Products" active={activeTab === 'featured'} onClick={() => setActiveTab('featured')} />
          <SidebarLink icon={<LayoutDashboard size={20} />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
          <SidebarLink icon={<CreditCard size={20} />} label="Payments" active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-x-hidden">
        
        {/* PRODUCTS TAB (All Approved Products) */}
        {activeTab === 'products' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">All Approved Products</h1>
                <p className="text-[#cbb89d]">Complete catalog of all approved products listed by sellers across the platform.</p>
              </div>
            </div>
            <ProductGrid items={allApprovedProducts} adminMode={true} />
            {loadingProducts && <div className="text-center py-16 text-[#cbb89d]">Loading products...</div>}
          </div>
        )}

        {/* FEATURED PRODUCTS TAB (Homescreen Products) */}
        {activeTab === 'featured' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Featured Products</h1>
                <p className="text-[#cbb89d]">These products are currently being showcased on the customer homescreen.</p>
              </div>
            </div>
            <ProductGrid items={featuredProducts} adminMode={true} />
            {loadingProducts && <div className="text-center py-16 text-[#cbb89d]">Loading products...</div>}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Global Order Tracking</h1>
                <p className="text-[#cbb89d]">Monitor and manage all customer orders placed across every seller storefront.</p>
              </div>
            </div>
            
            <GlassCard className="p-6 lg:p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Order ID</th>
                      <th className="py-4 px-4 font-semibold">Customer</th>
                      <th className="py-4 px-4 font-semibold">Seller / Store</th>
                      <th className="py-4 px-4 font-semibold">Product</th>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold text-right">Amount</th>
                      <th className="py-4 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformOrders.map(order => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">{order.id}</td>
                        <td className="py-4 px-4 text-[#f1e7d7] font-semibold">{order.customer}</td>
                        <td className="py-4 px-4 text-[#ff9933] font-semibold">{order.seller}</td>
                        <td className="py-4 px-4 text-[#fff4e6]">{order.product}</td>
                        <td className="py-4 px-4 text-[#cbb89d] text-sm">{order.date}</td>
                        <td className="py-4 px-4 text-right text-[#ff9933] font-semibold">{order.amount}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            order.status === 'Delivered' ? 'bg-[#ffbf66]/20 text-[#ffbf66] border-[#ffbf66]/30' :
                            order.status === 'Shipped' ? 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30' : 
                            'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {/* SELLER APPROVALS TAB */}
        {activeTab === 'seller-requests' && (
          <div className="animate-fade-in-up max-w-5xl">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Seller Approvals</h1>
                <p className="text-[#cbb89d]">Review and approve users requesting to open a storefront.</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {loadingRequests && (
                <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading seller requests...</div>
              )}
              {!loadingRequests && sellerRequests.length === 0 && (
                <div className="bg-[#34250f]/30 p-8 rounded-lg border border-dashed border-white/10 text-center text-[#9e8c73] text-sm">
                  No pending seller requests — you're all caught up.
                </div>
              )}
              {sellerRequests.map((req) => (
                <GlassCard key={req.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#ff9933]/10 text-[#ff9933] flex items-center justify-center shrink-0 border border-[#ff9933]/20">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="font-[Outfit] text-xl font-semibold text-[#fff4e6]">{req.storeName}</h3>
                      <p className="text-[#cbb89d] text-sm mt-1">Applicant: <span className="text-[#f1e7d7]">{req.user}</span> ({req.email})</p>
                      <p className="text-[#9e8c73] text-xs mt-1">Applied: {req.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => handleReview(req.id, 'approve')} disabled={busy} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#9c5214]/50 hover:bg-[#ff9933]/20 border border-[#ff9933]/30 text-[#fff4e6] text-sm font-semibold transition-all disabled:opacity-50">
                      <Check size={16} /> Approve
                    </button>
                    <button onClick={() => handleReview(req.id, 'reject')} disabled={busy} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#690005]/50 hover:bg-[#ffb4ab]/20 border border-[#ffb4ab]/30 text-[#ffdad6] text-sm font-semibold transition-all disabled:opacity-50">
                      <X size={16} /> Reject
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Platform Categories</h1>
                <p className="text-[#cbb89d]">Manage the main product categories available across the platform.</p>
              </div>
              <button className="py-3 px-6 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-base font-semibold hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all flex items-center gap-2">
                <PlusCircle size={20} /> Add Category
              </button>
            </div>
            
            <GlassCard className="p-6 lg:p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Category ID</th>
                      <th className="py-4 px-4 font-semibold">Name</th>
                      <th className="py-4 px-4 font-semibold text-center">Total Products</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminCategories.map(cat => (
                      <tr key={cat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">CAT-{cat.id.toString().padStart(3, '0')}</td>
                        <td className="py-4 px-4 text-[#fff4e6] font-semibold text-lg">{cat.name}</td>
                        <td className="py-4 px-4 text-center text-[#f1e7d7] font-semibold">{cat.count}</td>
                        <td className="py-4 px-4 flex justify-end gap-2">
                          <button className="p-2 rounded-lg bg-[#ff9933]/10 text-[#ff9933] hover:bg-[#ff9933]/20 transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="p-2 rounded-lg bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Platform Payments & Ledger</h1>
                <p className="text-[#cbb89d]">Monitor customer transactions, platform fees, and seller payouts.</p>
              </div>
            </div>
            
            <GlassCard className="p-6 lg:p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Transaction ID</th>
                      <th className="py-4 px-4 font-semibold">Date & Time</th>
                      <th className="py-4 px-4 font-semibold">Type</th>
                      <th className="py-4 px-4 font-semibold text-right">Amount</th>
                      <th className="py-4 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(txn => (
                      <tr key={txn.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">{txn.id}</td>
                        <td className="py-4 px-4 text-[#f1e7d7] text-sm">{txn.date}</td>
                        <td className="py-4 px-4 text-[#fff4e6] font-semibold">{txn.type}</td>
                        <td className={`py-4 px-4 text-right font-bold ${txn.amount.startsWith('+') ? 'text-[#ff9933]' : 'text-[#ffb4ab]'}`}>
                          {txn.amount}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            txn.status === 'Completed' ? 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30' : 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Placeholder for remaining tabs */}
        {activeTab !== 'products' && activeTab !== 'featured' && activeTab !== 'seller-requests' && activeTab !== 'categories' && activeTab !== 'payments' && activeTab !== 'orders' && (
          <div className="h-[600px] flex flex-col items-center justify-center animate-fade-in-up opacity-70">
            <h2 className="font-[Outfit] text-3xl font-bold text-[#fff4e6] mb-2 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[#cbb89d]">This admin module is currently under construction.</p>
          </div>
        )}

      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all duration-200 w-full text-left ${
        active 
          ? 'bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/30 shadow-[0_0_7px_rgba(255,153,51,0.06)]' 
          : 'text-[#cbb89d] hover:bg-[#34250f]/50 hover:text-[#f1e7d7]'
      }`}
    >
      {icon} {label}
    </button>
  );
}
