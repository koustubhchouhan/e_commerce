import { Package, TrendingUp, DollarSign, PlusCircle, ShoppingBag, LayoutDashboard, BarChart3, MessageSquareWarning, HelpCircle, Clock, PackageX, Check, UploadCloud, Truck, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';
import { useToastStore } from '../store/toastStore';
import { useAuth } from '../context/AuthContext';

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

const ORDER_STATUS_STYLES = {
  delivered: 'bg-[#ffbf66]/20 text-[#ffbf66] border-[#ffbf66]/30',
  shipped: 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30',
  paid: 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30',
  pending: 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30',
  cancelled: 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30',
};

export default function SellerHub() {
  const { user } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [store, setStore] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

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
        try {
          const storeData = await api.getSellerStore();
          if (active) setStore(storeData);
        } catch {
          // store is cosmetic in the sidebar; non-fatal
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
  const revenueByProduct = {};
  let revenue = 0;
  let unitsSold = 0;
  for (const order of orders) {
    for (const item of order.items ?? []) {
      const lineTotal = Number(item.lineTotal || 0);
      revenue += lineTotal;
      unitsSold += Number(item.quantity || 0);
      salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + Number(item.quantity || 0);
      revenueByProduct[item.productId] = (revenueByProduct[item.productId] || 0) + lineTotal;
    }
  }

  let recognizedRevenue = 0;
  const revenueByStatus = {};
  for (const order of orders) {
    let share = 0;
    for (const item of order.items ?? []) share += Number(item.lineTotal || 0);
    if (order.status !== 'cancelled') recognizedRevenue += share;
    revenueByStatus[order.status] = (revenueByStatus[order.status] || 0) + share;
  }

  const STATUS_ORDER = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
  const statusTotals = STATUS_ORDER.map((s) => ({
    status: s,
    count: orders.filter((o) => o.status === s).length,
    revenue: revenueByStatus[s] ?? 0,
  }));

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  const monthMap = new Map(months.map((m) => [m.key, { ...m, revenue: 0, orders: 0 }]));
  for (const order of orders) {
    const date = order.createdAt ? new Date(order.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthMap.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    for (const item of order.items ?? []) bucket.revenue += Number(item.lineTotal || 0);
  }
  const peakMonthRevenue = Math.max(1, ...months.map((m) => monthMap.get(m.key)?.revenue ?? 0));

  const topProducts = products
    .map((p) => ({
      ...p,
      units: salesByProduct[p.id] ?? 0,
      revenue: revenueByProduct[p.id] ?? 0,
    }))
    .filter((p) => p.units > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const productStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Approved';
      case 'out_of_stock': return 'Out of Stock';
      case 'draft': return 'Pending';
      default: return 'Pending';
    }
  };

  const orderActions = (order) => {
    if (!order.fulfillable || !['pending', 'paid', 'shipped'].includes(order.status)) return null;
    if (order.status === 'shipped') return [{ key: 'delivered', label: 'Deliver', icon: Check }];
    return [
      { key: 'shipped', label: 'Ship', icon: Truck },
      { key: 'cancelled', label: 'Cancel', icon: X },
    ];
  };

  const handleOrderStatus = async (order, status) => {
    if (updatingId) return;
    setUpdatingId(order.id);
    try {
      await api.updateSellerOrderStatus(order.id, status);
      const res = await api.sellerOrders();
      setOrders(res.items ?? []);
      const messages = {
        shipped: 'Order marked as shipped.',
        delivered: 'Order marked as delivered.',
        cancelled: 'Order cancelled and stock restored.',
      };
      addToast(messages[status] ?? 'Order updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update order.', 'error');
    } finally {
      setUpdatingId(null);
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
          <div className="w-24 h-24 rounded-full bg-[#170e03] border-2 border-[#ff9933]/50 overflow-hidden mb-4 shadow-[0_0_7px_rgba(255,153,51,0.11)] flex items-center justify-center">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Seller Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="font-[Outfit] text-3xl font-bold text-[#ff9933]">
                {(user?.fullName || 'S').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="font-[Outfit] text-xl font-bold text-[#fff4e6]">{user?.fullName || 'Seller'}</h2>
          <p className="text-[#cbb89d] text-xs font-semibold tracking-wider uppercase mt-1">{store?.name || 'Your Store'}</p>
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
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
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
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {orderActions(order) ? (
                            <div className="flex items-center justify-end gap-2">
                              {orderActions(order).map((action) => (
                                <button
                                  key={action.key}
                                  disabled={updatingId === order.id}
                                  onClick={() => handleOrderStatus(order, action.key)}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    action.key === 'cancelled'
                                      ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/20'
                                      : 'bg-[#ff9933]/10 text-[#ffbf66] border-[#ff9933]/30 hover:bg-[#ff9933]/20'
                                  }`}
                                >
                                  <action.icon size={14} />
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#4b3d2a] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-[#9e8c73] text-sm">No orders for your store yet.</td>
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
              <p className="text-[#cbb89d]">Performance metrics computed from your store's live order data.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard icon={<DollarSign size={24} />} title="Gross Revenue" value={`$${revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} trend={`${orders.length} order${orders.length === 1 ? '' : 's'}`} />
              <StatCard icon={<TrendingUp size={24} />} title="Earned Revenue" value={`$${recognizedRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} trend="excl. cancelled" />
              <StatCard icon={<ShoppingBag size={24} />} title="Units Sold" value={String(unitsSold)} trend={`${products.length} products listed`} />
              <StatCard icon={<Package size={24} />} title="Avg Order Share" value={`$${(orders.length ? recognizedRevenue / orders.length : 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`} trend="per order" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
              <GlassCard className="xl:col-span-8 p-6 lg:p-8">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-[#ff9933]" /> Revenue — Last 6 Months
                </h2>
                {orders.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-[#9e8c73] text-sm">No order history yet.</div>
                ) : (
                  <div className="flex items-end justify-between gap-3 h-44">
                    {months.map((m) => {
                      const b = monthMap.get(m.key);
                      const h = Math.max(4, Math.round((b.revenue / peakMonthRevenue) * 100));
                      return (
                        <div key={m.key} className="flex-1 flex flex-col items-center gap-2 group" title={`$${b.revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })} across ${b.orders} order${b.orders === 1 ? '' : 's'}`}>
                          <span className="text-[10px] text-[#cbb89d] opacity-0 group-hover:opacity-100 transition-opacity">${Math.round(b.revenue)}</span>
                          <div className={`w-full max-w-[46px] rounded-t-lg bg-gradient-to-t from-[#ff7418]/40 to-[#ff9933] transition-all ${b.revenue > 0 ? '' : 'bg-white/5 to-white/5 from-white/5'}`} style={{ height: `${h}%` }} />
                          <span className="text-[11px] text-[#9e8c73] uppercase tracking-wider">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="xl:col-span-4 p-6 lg:p-8">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#ffd27a]" /> Orders by Status
                </h2>
                <div className="flex flex-col gap-3">
                  {statusTotals.map(({ status, count, revenue: rev }) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ORDER_STATUS_STYLES[status]?.split(' ')[0] ?? 'bg-white/20'}`} />
                      <span className="text-sm text-[#cbb89d] capitalize w-24 shrink-0">{status}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#ff9933]/70 to-[#ff9933] transition-all" style={{ width: `${orders.length ? Math.round((count / orders.length) * 100) : 0}%` }} />
                      </div>
                      <span className="text-sm text-[#fff4e6] font-semibold w-6 text-right">{count}</span>
                      <span className="text-[11px] text-[#9e8c73] w-16 text-right">${Math.round(rev)}</span>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-[#9e8c73] text-sm text-center py-6">No orders yet.</p>}
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <GlassCard className="xl:col-span-7 p-6 lg:p-8">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
                  <Package size={20} className="text-[#ffbf66]" /> Top Products by Revenue
                </h2>
                {topProducts.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-[#9e8c73] text-sm">No sales recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                          <th className="py-3 px-3 font-semibold">Product</th>
                          <th className="py-3 px-3 font-semibold text-right">Price</th>
                          <th className="py-3 px-3 font-semibold text-center">Units</th>
                          <th className="py-3 px-3 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, idx) => (
                          <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3 text-[#f1e7d7] font-semibold">
                              <span className="text-[#9e8c73] text-xs mr-2 font-[Inter]">#{idx + 1}</span>
                              {p.name}
                            </td>
                            <td className="py-3 px-3 text-right text-[#cbb89d] text-sm">${Number(p.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                            <td className="py-3 px-3 text-center text-[#fff4e6]">{p.units}</td>
                            <td className="py-3 px-3 text-right text-[#ff9933] font-semibold">${p.revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>

              <GlassCard className="xl:col-span-5 p-6 lg:p-8">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-[#ff7418]" /> Recent Orders
                </h2>
                {orders.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-[#9e8c73] text-sm">No orders yet.</div>
                ) : (
                  <div className="flex flex-col divide-y divide-white/5">
                    {orders.slice(0, 6).map((order) => {
                      const share = (order.items ?? []).reduce((s, it) => s + Number(it.lineTotal || 0), 0);
                      return (
                        <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-[Inter] text-xs text-[#cbb89d] uppercase tracking-wider">ORDER #{shortId(order.id)}</p>
                            <p className="text-[#f1e7d7] text-sm font-semibold truncate">
                              {(order.items ?? []).map((i) => i.productName).join(', ') || '—'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[#fff4e6] font-[Outfit] font-bold text-sm">${share.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border mt-1 ${ORDER_STATUS_STYLES[order.status] ?? 'bg-white/10 text-[#cbb89d] border-white/10'}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
