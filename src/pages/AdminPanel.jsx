import { LayoutDashboard, Users, Grid, Star, CreditCard, ShoppingBag, UserCheck, Check, X, PlusCircle, Trash2, Truck, Loader2, Inbox, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

const ORDER_STATUS_STYLES = {
  delivered: 'bg-[#ffbf66]/20 text-[#ffbf66] border-[#ffbf66]/30',
  shipped: 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30',
  paid: 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30',
  pending: 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30',
  cancelled: 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30',
};

const ORDER_STATUS_TABS = ['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('products');

  const [approvedProducts, setApprovedProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
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

  const loadOrders = async (spinner = true) => {
    if (spinner) setLoadingOrders(true);
    try {
      const res = await api.adminOrders();
      setOrders(res.items ?? []);
    } catch {
      addToast('Failed to load orders.', 'error');
    } finally {
      if (spinner) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.adminCategories();
      setCategories(res.items ?? []);
    } catch {
      addToast('Failed to load categories.', 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadMessages = async (spinner = true) => {
    if (spinner) setLoadingMessages(true);
    try {
      const res = await api.adminContactMessages();
      setMessages(res.items ?? []);
    } catch {
      addToast('Failed to load messages.', 'error');
    } finally {
      if (spinner) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMessageRead = async (msg) => {
    try {
      await api.adminUpdateContactMessage(msg.id, !msg.isRead);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: !m.isRead } : m)),
      );
    } catch (err) {
      addToast(err.message || 'Failed to update message.', 'error');
    }
  };

  const handleDeleteMessage = async (msg) => {
    setBusy(true);
    try {
      await api.adminDeleteContactMessage(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      addToast(`Message from ${msg.name} deleted.`, 'error');
    } catch (err) {
      addToast(err.message || 'Failed to delete message.', 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadCategories();
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

  const handleRemoveProduct = async (id) => {
    const product = approvedProducts.find((p) => p.id === id);
    setBusy(true);
    try {
      await api.adminDeleteProduct(id);
      setApprovedProducts((prev) => prev.filter((p) => p.id !== id));
      setFeaturedProducts((prev) => prev.filter((p) => p.id !== id));
      addToast(`"${product?.title ?? 'Product'}" removed from the platform.`, 'error');
    } catch (err) {
      addToast(err.message || 'Failed to remove product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api.createCategory(name);
      setNewCategory('');
      setCategoryModal(false);
      addToast(`"${name}" category created!`, 'success');
      await loadCategories();
    } catch (err) {
      addToast(err.message || 'Failed to create category.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    const cat = categories.find((c) => c.id === id);
    setBusy(true);
    try {
      await api.deleteCategory(id);
      addToast(`"${cat?.name ?? 'Category'}" deleted.`, 'error');
      await loadCategories();
    } catch (err) {
      addToast(err.message || 'Failed to delete category.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const orderActions = (order) => {
    if (order.status === 'pending' || order.status === 'paid') {
      return [
        { key: 'shipped', label: 'Ship', icon: Truck },
        { key: 'cancelled', label: 'Cancel', icon: X },
      ];
    }
    if (order.status === 'shipped') {
      return [{ key: 'delivered', label: 'Deliver', icon: Truck }];
    }
    return [];
  };

  const handleOrderStatus = async (order, status) => {
    if (updating) return;
    setUpdating({ id: order.id, status });
    try {
      await api.adminUpdateOrderStatus(order.id, status);
      await loadOrders(false);
      addToast(
        status === 'cancelled'
          ? `Order ${shortId(order.id)} cancelled — stock restored.`
          : `Order ${shortId(order.id)} marked as ${status}.`,
        status === 'cancelled' ? 'error' : 'success',
      );
    } catch (err) {
      addToast(err.message || 'Failed to update order.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const visibleOrders =
    statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="flex min-h-[calc(100vh-80px)] animate-fade-in-up">
      {/* Sidebar Navigation */}
      <aside className="w-[280px] bg-[#221708]/90 backdrop-blur-xl border-r border-white/5 p-6 flex flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto">
        <h2 className="font-[Outfit] text-2xl font-bold text-[#ff9933] mb-8 px-4">Admin Dashboard</h2>
        
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarLink icon={<Grid size={20} />} label="Products" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <SidebarLink icon={<UserCheck size={20} />} label="Seller Approvals" active={activeTab === 'seller-requests'} onClick={() => setActiveTab('seller-requests')} />
          <SidebarLink icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarLink icon={<Inbox size={20} />} label="Messages" badge={messages.filter((m) => !m.isRead).length} active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
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
            <ProductGrid items={allApprovedProducts} adminMode={true} adminOnDelete={handleRemoveProduct} />
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
            <ProductGrid items={featuredProducts} adminMode={true} adminOnDelete={handleRemoveProduct} />
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
            
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {ORDER_STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                    statusFilter === tab
                      ? 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/30'
                      : 'text-[#cbb89d] border-white/10 hover:bg-white/5'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>

            <GlassCard className="p-6 lg:p-8">
              {loadingOrders && (
                <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading orders...</div>
              )}
              {!loadingOrders && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Order ID</th>
                      <th className="py-4 px-4 font-semibold">Customer</th>
                      <th className="py-4 px-4 font-semibold">Items</th>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold text-right">Amount</th>
                      <th className="py-4 px-4 font-semibold text-right">Status</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map(order => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">
                          <Link to={`/orders/${order.id}`} className="hover:text-[#ff9933] transition-colors" title="View full order">
                            {shortId(order.id)}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-[#f1e7d7] font-semibold">{order.customerName || 'Customer'}</td>
                        <td className="py-4 px-4 text-[#fff4e6]">{order.items?.map((i) => i.productName).join(', ') || '—'}</td>
                        <td className="py-4 px-4 text-[#cbb89d] text-sm">{formatDate(order.createdAt)}</td>
                        <td className="py-4 px-4 text-right text-[#ff9933] font-semibold">${Number(order.total).toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${ORDER_STATUS_STYLES[order.status] ?? 'bg-white/10 text-[#cbb89d] border-white/10'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {orderActions(order).length > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              {orderActions(order).map((action) => {
                                const active = updating?.id === order.id && updating?.status === action.key;
                                return (
                                  <button
                                    key={action.key}
                                    disabled={!!updating && updating.id === order.id}
                                    onClick={() => handleOrderStatus(order, action.key)}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                      action.key === 'cancelled'
                                        ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/20'
                                        : 'bg-[#ff9933]/10 text-[#ffbf66] border-[#ff9933]/30 hover:bg-[#ff9933]/20'
                                    }`}
                                  >
                                    {active ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <action.icon size={14} />
                                    )}
                                    {active ? 'Updating...' : action.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[#4b3d2a] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visibleOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-[#9e8c73] text-sm">
                          {statusFilter === 'all' ? 'No orders have been placed yet.' : `No ${statusFilter} orders right now.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* MESSAGES TAB (Contact form submissions) */}
        {activeTab === 'messages' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Support Inbox</h1>
                <p className="text-[#cbb89d]">Messages submitted through the public Contact page.</p>
              </div>
            </div>

            <GlassCard className="p-6 lg:p-8">
              {loadingMessages && (
                <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading messages...</div>
              )}
              {!loadingMessages && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">From</th>
                      <th className="py-4 px-4 font-semibold">Message</th>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold text-center">Status</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map(msg => (
                      <tr key={msg.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${msg.isRead ? 'opacity-60' : ''}`}>
                        <td className="py-4 px-4">
                          <p className="text-[#f1e7d7] font-semibold">{msg.name}</p>
                          <a href={`mailto:${msg.email}`} className="text-[#cbb89d] text-xs hover:text-[#ff9933] transition-colors">{msg.email}</a>
                        </td>
                        <td className="py-4 px-4 max-w-md">
                          <p className="text-[#fff4e6] font-semibold text-sm">{msg.subject}</p>
                          <p className="text-[#9e8c73] text-sm line-clamp-2">{msg.message}</p>
                        </td>
                        <td className="py-4 px-4 text-[#cbb89d] text-sm whitespace-nowrap">{formatDate(msg.createdAt)}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${msg.isRead ? 'bg-white/10 text-[#cbb89d] border-white/10' : 'bg-[#ff9933]/20 text-[#ffd27a] border-[#ff9933]/30'}`}>
                            {msg.isRead ? 'Read' : 'New'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleMessageRead(msg)}
                              title={msg.isRead ? 'Mark as unread' : 'Mark as read'}
                              className="p-2 rounded-lg bg-[#ff9933]/10 text-[#ffbf66] hover:bg-[#ff9933]/20 transition-colors"
                            >
                              {msg.isRead ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg)}
                              disabled={busy}
                              title="Delete"
                              className="p-2 rounded-lg bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {messages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#9e8c73] text-sm">
                          No messages yet — submissions from the Contact page will show up here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
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
              <button onClick={() => setCategoryModal(true)} className="py-3 px-6 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-base font-semibold hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all flex items-center gap-2">
                <PlusCircle size={20} /> Add Category
              </button>
            </div>
            
            <GlassCard className="p-6 lg:p-8">
              {loadingCategories && (
                <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading categories...</div>
              )}
              {!loadingCategories && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Category ID</th>
                      <th className="py-4 px-4 font-semibold">Name</th>
                      <th className="py-4 px-4 font-semibold">Slug</th>
                      <th className="py-4 px-4 font-semibold text-center">Total Products</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">{shortId(cat.id)}</td>
                        <td className="py-4 px-4 text-[#fff4e6] font-semibold text-lg">{cat.name}</td>
                        <td className="py-4 px-4 text-[#9e8c73] text-sm">{cat.slug}</td>
                        <td className="py-4 px-4 text-center text-[#f1e7d7] font-semibold">{cat.productCount}</td>
                        <td className="py-4 px-4 flex justify-end gap-2">
                          <button onClick={() => handleDeleteCategory(cat.id)} disabled={busy} className="p-2 rounded-lg bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 transition-colors disabled:opacity-50" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#9e8c73] text-sm">No categories yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
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
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <CreditCard size={40} className="text-[#34250f]" />
                <p className="text-[#f1e7d7] font-[Outfit] text-lg font-semibold">Payments & Ledger</p>
                <p className="text-[#cbb89d] text-sm max-w-md">
                  Payment processing is not wired up yet. Once a payment provider is integrated, transaction history will appear here.
                </p>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Placeholder for remaining tabs */}
        {activeTab !== 'products' && activeTab !== 'featured' && activeTab !== 'seller-requests' && activeTab !== 'categories' && activeTab !== 'payments' && activeTab !== 'orders' && activeTab !== 'messages' && (
          <div className="h-[600px] flex flex-col items-center justify-center animate-fade-in-up opacity-70">
            <h2 className="font-[Outfit] text-3xl font-bold text-[#fff4e6] mb-2 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[#cbb89d]">This admin module is currently under construction.</p>
          </div>
        )}

      </main>

      {categoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={() => setCategoryModal(false)} role="dialog" aria-modal="true" aria-label="Add category">
          <GlassCard hover={false} className="relative w-full max-w-md animate-scale-in">
            <form onSubmit={handleCreateCategory} onMouseDown={(e) => e.stopPropagation()} className="p-6 md:p-8 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] flex items-center gap-2">
                    <PlusCircle className="text-[#ff9933]" size={24} /> Add Category
                  </h2>
                  <p className="text-[#cbb89d] text-xs mt-1">Create a new product category for the platform.</p>
                </div>
                <button type="button" onClick={() => setCategoryModal(false)} className="p-2 -mr-2 rounded-lg text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 transition-colors" aria-label="Close">
                  <X size={22} />
                </button>
              </div>
              <div>
                <label className="block text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Wearables"
                  autoFocus
                  className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all placeholder:text-[#6f6048]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setCategoryModal(false)} className="px-6 py-2.5 rounded-lg border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!newCategory.trim() || busy} className="px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold flex items-center gap-2 transition-all bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] disabled:bg-[#34250f]/50 disabled:text-[#6f6048] disabled:cursor-not-allowed">
                  <PlusCircle size={18} /> {busy ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick, badge }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all duration-200 w-full text-left ${
        active 
          ? 'bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/30 shadow-[0_0_7px_rgba(255,153,51,0.06)]' 
          : 'text-[#cbb89d] hover:bg-[#34250f]/50 hover:text-[#f1e7d7]'
      }`}
    >
      {icon} <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff9933]/20 text-[#ffd27a] border border-[#ff9933]/30">
          {badge}
        </span>
      )}
    </button>
  );
}
