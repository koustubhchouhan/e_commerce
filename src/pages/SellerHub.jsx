import { Package, TrendingUp, DollarSign, Eye, PlusCircle, ShoppingBag, LayoutDashboard, BarChart3, MessageSquareWarning, HelpCircle, Clock, PackageX, Check, UploadCloud } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';
import { useToastStore } from '../store/toastStore';

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

const ORDER_STATUS_STYLES = {
  delivered: 'bg-[#ffbf66]/20 text-[#ffbf66] border-[#ffbf66]/30',
  shipped: 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30',
  paid: 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30',
  pending: 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30',
  cancelled: 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30',
};

export default function SellerHub() {
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [orderRes, productRes] = await Promise.all([api.sellerOrders(), api.sellerProducts()]);
        if (!active) return;
        setOrders(orderRes.items ?? []);
        setProducts(productRes.items ?? []);
        try {
          const cats = await api.categories();
          if (active) setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
        } catch {
          // categories are a nicety for the add form; non-fatal
        }
      } catch (err) {
        if (active) setOrdersError(err.message || 'Failed to load store data.');
      } finally {
        if (active) {
          setLoadingOrders(false);
          setLoadingProducts(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const salesByProduct = {};
  let revenue = 0;
  let unitsSold = 0;
  for (const order of orders) {
    for (const item of order.items ?? []) {
      revenue += Number(item.lineTotal || 0);
      unitsSold += Number(item.quantity || 0);
      salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + Number(item.quantity || 0);
    }
  }

  const productStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Approved';
      case 'out_of_stock': return 'Out of Stock';
      case 'draft': return 'Pending';
      default: return 'Pending';
    }
  };

  const requests = [
    {
      id: "REQ-091",
      customer: "Alex Mercer",
      type: "Return Request",
      product: "Nova Pro X-15 Gaming Laptop",
      date: "2 hours ago",
      status: "Pending",
      message: "The cooling fans seem unusually loud during standard usage. Requesting a replacement or return."
    },
    {
      id: "REQ-090",
      customer: "Jordan Lee",
      type: "Restock Inquiry",
      product: "Aura Sound V2 Headphones",
      date: "1 day ago",
      status: "Resolved",
      message: "When will the Midnight Black version be back in stock?"
    }
  ];

  const getRequestIcon = (type) => {
    switch (type) {
      case 'Return Request': return <PackageX className="text-[#ffb4ab]" size={20} />;
      case 'Restock Inquiry': return <HelpCircle className="text-[#ff9933]" size={20} />;
      case 'Order Modification': return <Clock className="text-[#ffd27a]" size={20} />;
      default: return <MessageSquareWarning className="text-[#f1e7d7]" size={20} />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] animate-fade-in-up">
      
      {/* ═══ Left Sidebar ═══ */}
      <aside className="w-[280px] bg-[#221708]/90 backdrop-blur-xl border-r border-white/5 p-6 flex flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto">
        
        {/* Profile Info */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-24 h-24 rounded-full bg-[#170e03] border-2 border-[#ff9933]/50 overflow-hidden mb-4 shadow-[0_0_7px_rgba(255,153,51,0.11)]">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" 
              alt="Seller Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="font-[Outfit] text-xl font-bold text-[#fff4e6]">Sarah Jenkins</h2>
          <p className="text-[#cbb89d] text-xs font-semibold tracking-wider uppercase mt-1">NeonTech Store</p>
          <span className="px-3 py-1 rounded-full bg-[#ffbf66]/10 text-[#ffbf66] text-[10px] font-bold uppercase tracking-wider mt-3 border border-[#ffbf66]/20">
            Verified Seller
          </span>
        </div>
        
        {/* Navigation Options */}
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarLink icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarLink icon={<LayoutDashboard size={20} />} label="Store Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <SidebarLink icon={<BarChart3 size={20} />} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <SidebarLink icon={<MessageSquareWarning size={20} />} label="Messages & Complaints" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
        </nav>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto h-[calc(100vh-80px)]">
        
        {activeTab === 'overview' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Store Overview</h1>
              <p className="text-[#cbb89d]">Monitor your recent analytics, add new products, and track inventory.</p>
            </header>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard icon={<DollarSign size={24} />} title="Total Revenue" value={`$${revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} trend={`${orders.length} order${orders.length === 1 ? '' : 's'}`} />
              <StatCard icon={<Package size={24} />} title="Products Sold" value={String(unitsSold)} trend={`${products.length} in stock`} />
              <StatCard icon={<ShoppingBag size={24} />} title="Store Orders" value={String(orders.length)} trend={`${salesByProduct ? Object.keys(salesByProduct).length : 0} products sold`} />
              <StatCard icon={<TrendingUp size={24} />} title="Inventory Items" value={String(products.length)} trend={loadingProducts ? 'loading...' : 'live'} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Add Product Form */}
              <div className="xl:col-span-1">
                <AddProductForm categories={categories} onAdded={() => api.sellerProducts().then((r) => setProducts(r.items ?? []))} />
              </div>

              {/* Inventory List */}
              <div className="xl:col-span-2">
                <GlassCard className="p-6 lg:p-8 min-h-[500px]">
                  <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6">Your Inventory</h2>
                  
                  {loadingProducts ? (
                    <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading inventory...</div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                          <th className="py-4 px-4 font-semibold">Product</th>
                          <th className="py-4 px-4 font-semibold text-right">Price</th>
                          <th className="py-4 px-4 font-semibold text-center">Sales</th>
                          <th className="py-4 px-4 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((item) => {
                          const status = productStatusLabel(item.status);
                          return (
                          <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 font-[Outfit] text-lg font-semibold text-[#f1e7d7]">{item.name}</td>
                            <td className="py-4 px-4 text-right text-[#ff9933] font-semibold">${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-4 px-4 text-center text-[#fff4e6]">{salesByProduct[item.id] ?? 0}</td>
                            <td className="py-4 px-4 text-right">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                                status === 'Approved' ? 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30' : 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30'
                              }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                          );
                        })}
                        {products.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-16 text-center text-[#9e8c73] text-sm">No products yet. Add your first one on the left.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  )}
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Store Orders</h1>
              <p className="text-[#cbb89d]">Products ordered from your store by customers.</p>
            </header>
            
            <GlassCard className="p-6 lg:p-8">
              {loadingOrders && (
                <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading orders...</div>
              )}
              {!loadingOrders && ordersError && (
                <div className="flex items-center justify-center h-40 text-[#ffb4ab]">{ordersError}</div>
              )}
              {!loadingOrders && !ordersError && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Order ID</th>
                      <th className="py-4 px-4 font-semibold">Customer</th>
                      <th className="py-4 px-4 font-semibold">Items</th>
                      <th className="py-4 px-4 font-semibold text-right">Amount</th>
                      <th className="py-4 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">{shortId(order.id)}</td>
                        <td className="py-4 px-4 text-[#f1e7d7] font-semibold">{order.customerName || 'Customer'}</td>
                        <td className="py-4 px-4 text-[#fff4e6]">{order.items?.map((i) => i.productName).join(', ') || '—'}</td>
                        <td className="py-4 px-4 text-right text-[#ff9933] font-semibold">${Number(order.total).toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${ORDER_STATUS_STYLES[order.status] ?? 'bg-white/10 text-[#cbb89d] border-white/10'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#9e8c73] text-sm">No orders for your store yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </GlassCard>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Messages & Complaints</h1>
              <p className="text-[#cbb89d]">Manage incoming inquiries, return requests, and order modifications.</p>
            </header>
            
            <div className="flex flex-col gap-6 max-w-4xl">
              {requests.map((req) => (
                <GlassCard key={req.id} className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-white/5 rounded-full border border-white/10 shrink-0">
                        {getRequestIcon(req.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6]">{req.type}</h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            req.status === 'Pending' ? 'bg-[#c98a12]/20 text-[#ffd27a] border-[#ffd27a]/30' : 'bg-[#ff9933]/10 text-[#ff9933] border-[#ff9933]/20'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[#cbb89d] text-sm mt-1">
                          From: <span className="font-semibold text-[#f1e7d7]">{req.customer}</span> • {req.date}
                        </p>
                        <p className="text-[#cbb89d] text-sm">
                          Product: <span className="text-[#ff7418] hover:underline cursor-pointer">{req.product}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-[Inter] font-bold tracking-wider text-[#cbb89d] uppercase shrink-0">
                      {req.id}
                    </span>
                  </div>
                  
                  <div className="bg-[#221708]/80 p-4 rounded-lg border border-white/5 mb-4 text-[#f1e7d7] text-sm italic">
                    "{req.message}"
                  </div>

                  {req.status === 'Pending' && (
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
                      <button className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#9c5214]/50 hover:bg-[#ff9933]/20 border border-[#ff9933]/30 text-[#fff4e6] text-sm font-semibold transition-all">
                        <Check size={16} /> Resolve Request
                      </button>
                      <button className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#34250f]/50 hover:bg-white/10 border border-white/10 text-[#f1e7d7] text-sm font-semibold transition-all">
                        Reply to Customer
                      </button>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Store Analytics</h1>
              <p className="text-[#cbb89d]">Visualizations and in-depth metrics for your store performance.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ff9933]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Revenue Timeline Graph</p>
              </GlassCard>
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ffd27a]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Top Selling Categories Pie Chart</p>
              </GlassCard>
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ffbf66]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Store Traffic Bar Chart</p>
              </GlassCard>
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ffb4ab]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Conversion Funnel</p>
              </GlassCard>
            </div>
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

function StatCard({ icon, title, value, trend, negative }) {
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[#ff9933] bg-[#ff9933]/10 p-3 rounded-lg border border-[#ff9933]/20">
          {icon}
        </div>
        <span className={`text-xs font-bold tracking-wider px-2 py-1 rounded-full ${negative ? 'bg-[#ffb4ab]/20 text-[#ffb4ab]' : 'bg-[#ff9933]/20 text-[#ff9933]'}`}>
          {trend}
        </span>
      </div>
      <div>
        <h3 className="text-[#cbb89d] text-sm font-semibold uppercase tracking-wider mb-1">{title}</h3>
        <p className="font-[Outfit] text-3xl font-bold text-[#fff4e6]">{value}</p>
      </div>
    </GlassCard>
  );
}

function AddProductForm({ categories = [], onAdded }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]?.name ?? '');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const addToast = useToastStore((s) => s.addToast);

  const priceNum = parseFloat(price) || 0;
  const canSubmit = name.trim().length > 0 && priceNum > 0 && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const categoryId = categories.find((c) => c.name === category)?.id ?? null;
      const created = await api.createProduct({
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        discount_percent: 0,
        stock: 0,
        status: 'draft',
        category_id: categoryId,
      });
      if (files.length) await api.uploadProductImages(created.id, files);
      setName('');
      setPrice('');
      setDescription('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addToast(`"${name.trim()}" submitted for approval!`, 'success');
      onAdded?.();
    } catch (err) {
      addToast(err.message || 'Failed to add product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors';
  const labelClass = 'text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block';

  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
        <PlusCircle className="text-[#ff9933]" /> Add Product
      </h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label className={labelClass}>Product Name</label>
          <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price ($)</label>
            <input type="number" min="0" step="0.01" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.length === 0 && <option value="">No categories</option>}
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea rows="3" className={`${inputClass} resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..."></textarea>
        </div>

        <div>
          <label className={labelClass}>Images</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-xs text-[#9e8c73] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#ff9933]/10 file:text-[#ff9933] file:font-semibold file:cursor-pointer hover:file:bg-[#ff9933]/20 transition-colors"
          />
          {files.length > 0 && (
            <p className="text-[11px] text-[#cbb89d] mt-1.5 flex items-center gap-1"><UploadCloud size={13} /> {files.length} image{files.length === 1 ? '' : 's'} selected</p>
          )}
        </div>

        <button type="submit" disabled={!canSubmit} className={`w-full py-3 rounded-lg font-[Outfit] text-lg font-semibold mt-2 transition-all flex items-center justify-center gap-2 ${canSubmit ? 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_7px_rgba(255,153,51,0.22)]' : 'bg-[#34250f]/50 text-[#6f6048] cursor-not-allowed'}`}>
          <PlusCircle size={20} /> {busy ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </form>
    </GlassCard>
  );
}
