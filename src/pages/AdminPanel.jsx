import { LayoutDashboard, Users, Grid, Star, CreditCard, ShoppingBag, UserCheck, Check, X, PlusCircle, Trash2, Truck, Loader2, Inbox, Eye, EyeOff, Wallet, Percent, IndianRupee, TrendingUp, MessageSquare, Menu, Reply, Image as ImageIcon, Pencil, ClipboardCheck, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductGrid } from './Home';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';
import { toProductCardList } from '../lib/productShape';
import { inr } from '../lib/money';

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
  delivered: 'bg-[#E0A11C]/20 text-[#E0A11C] border-[#E0A11C]/30',
  shipped: 'bg-[#B7322A]/20 text-[#B7322A] border-[#B7322A]/30',
  paid: 'bg-[#B7322A]/20 text-[#E0A11C] border-[#B7322A]/30',
  pending: 'bg-[#C8901A]/20 text-[#C8901A] border-[#C8901A]/30',
  cancelled: 'bg-[#B3261E]/20 text-[#B3261E] border-[#B3261E]/30',
};

const ORDER_STATUS_TABS = ['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'];

// Blank hero slide used when the admin opens the "add slide" form.
const EMPTY_SLIDE = {
  eyebrow: '',
  title: '',
  description: '',
  imageUrl: '',
  buttonLabel: 'Shop Now',
  buttonLink: '/',
  theme: 'orange',
  position: 0,
  isActive: true,
};

// Small labelled section inside the admin order-detail modal.
function OrderDetailBlock({ title, children }) {
  return (
    <div className="rounded-xl border border-[#231a16]/10 bg-[#F5ECDE]/40 p-4">
      <h3 className="text-[#B7322A] text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('products');
  const [navOpen, setNavOpen] = useState(false);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setNavOpen(false);
  };

  const [approvedProducts, setApprovedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [savingApproval, setSavingApproval] = useState(false);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [ledger, setLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleSelection, setSettleSelection] = useState(new Set());
  const [settleNote, setSettleNote] = useState('');
  const [settling, setSettling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [messageModal, setMessageModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [slideModal, setSlideModal] = useState(null);
  const [slideImageFile, setSlideImageFile] = useState(null);
  const [savingSlide, setSavingSlide] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const loadApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const res = await api.adminProducts('pending');
      setPendingProducts(res.items ?? []);
    } catch {
      addToast('Failed to load pending products.', 'error');
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleApproval = async (product, action, reason) => {
    if (savingApproval) return;
    setSavingApproval(true);
    try {
      await api.adminSetProductApproval(product.id, action, reason);
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));
      addToast(
        action === 'approve' ? `"${product.name}" approved.` : `"${product.name}" rejected.`,
        action === 'approve' ? 'success' : 'error'
      );
      setRejecting(null);
      setRejectReason('');
    } catch (err) {
      addToast(err.message || 'Failed to update approval.', 'error');
    } finally {
      setSavingApproval(false);
    }
  };

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
    loadApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const reqs = (await api.adminApplications('pending'))?.items ?? [];
      setSellerRequests(
        reqs.map((r) => ({
          id: r.id,
          user: r.applicant ?? '—',
          email: r.contactEmail,
          storeName: r.storeName,
          date: timeAgo(r.createdAt),
          status: 'Pending',
        })),
      );
    } catch (err) {
      addToast(`Failed to load seller requests: ${err?.message ?? 'unknown error'}`, 'error');
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

  // Open the order drawer immediately with the row's data, then fill in the
  // customer contact, shipping address and full line items from the admin
  // detail endpoint.
  const openOrderDetail = async (order) => {
    setOrderDetail(order);
    setLoadingOrderDetail(true);
    try {
      const detail = await api.adminOrder(order.id);
      setOrderDetail(detail);
    } catch (err) {
      addToast(err.message || 'Failed to load order details.', 'error');
      setOrderDetail(null);
    } finally {
      setLoadingOrderDetail(false);
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

  const loadSlides = async (spinner = true) => {
    if (spinner) setLoadingSlides(true);
    try {
      const res = await api.adminHeroSlides();
      setSlides(res.items ?? []);
    } catch (err) {
      addToast(`Failed to load hero slides: ${err?.message ?? 'unknown error'}`, 'error');
    } finally {
      if (spinner) setLoadingSlides(false);
    }
  };

  const loadMessages = async (spinner = true) => {
    if (spinner) setLoadingMessages(true);
    setMessagesError('');
    try {
      const res = await api.adminContactMessages();
      setMessages(res.items ?? []);
    } catch (err) {
      setMessagesError(err?.message || 'Failed to load messages.');
      addToast('Failed to load messages.', 'error');
    } finally {
      if (spinner) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReviews = async (spinner = true) => {
    if (spinner) setLoadingReviews(true);
    try {
      const res = await api.adminReviews();
      setReviews(res.items ?? []);
    } catch {
      addToast('Failed to load reviews.', 'error');
    } finally {
      if (spinner) setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLedger = async (spinner = true) => {
    if (spinner) setLoadingLedger(true);
    try {
      setLedger(await api.adminLedger());
    } catch {
      addToast('Failed to load ledger.', 'error');
    } finally {
      if (spinner) setLoadingLedger(false);
    }
  };

  useEffect(() => {
    loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSettle = (seller) => {
    setSettleTarget(seller);
    setSettleSelection(new Set((seller.unsettledOrders ?? []).map((o) => o.id)));
    setSettleNote('');
  };

  const toggleSettleOrder = (orderId) => {
    setSettleSelection((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const confirmSettle = async () => {
    if (!settleTarget || settleSelection.size === 0) return;
    setSettling(true);
    try {
      await api.adminCreateSettlement(
        settleTarget.id,
        [...settleSelection],
        settleNote.trim() || undefined,
      );
      addToast(`Payout recorded for ${settleTarget.name}.`, 'success');
      setSettleTarget(null);
      await loadLedger(false);
    } catch (err) {
      addToast(err.message || 'Could not record the payout.', 'error');
    } finally {
      setSettling(false);
    }
  };

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
      addToast(`Message from ${msg.name} deleted.`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete message.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openMessage = (msg) => {
    setMessageModal(msg);
    setReplyText(msg.reply ?? '');
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || replying) return;
    setReplying(true);
    try {
      const updated = await api.adminReplyContactMessage(messageModal.id, text);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      setMessageModal((prev) => (prev ? { ...prev, ...updated } : prev));
      addToast(`Reply sent to ${messageModal.name}.`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to send reply.', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleToggleReviewHidden = async (review) => {
    setBusy(true);
    try {
      const updated = await api.adminSetReviewHidden(review.id, !review.isHidden);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...updated } : r)));
      addToast(updated.isHidden ? 'Review hidden from the storefront.' : 'Review restored.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteReview = async (review) => {
    setBusy(true);
    try {
      await api.adminDeleteReview(review.id);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      addToast(`Review for "${review.productName ?? 'product'}" deleted.`, 'error');
    } catch (err) {
      addToast(err.message || 'Failed to delete review.', 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadSlides();
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

  // Filter the loaded catalog client-side so admins can jump straight to a
  // product by name, category, or seller without a round-trip per keystroke.
  const productSearchTerm = productSearch.trim().toLowerCase();
  const allApprovedProducts = productSearchTerm
    ? approvedProducts.filter((p) =>
        [p.title, p.category, p.storeName, p.desc]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(productSearchTerm))
      )
    : approvedProducts;

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

  const openCreateSlide = () => {
    setSlideImageFile(null);
    setSlideModal({ ...EMPTY_SLIDE });
  };

  const openEditSlide = (slide) => {
    setSlideImageFile(null);
    setSlideModal({ ...slide });
  };

  const closeSlideModal = () => {
    if (savingSlide) return;
    setSlideModal(null);
    setSlideImageFile(null);
  };

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    if (!slideModal || savingSlide) return;
    const title = (slideModal.title ?? '').trim();
    if (!title) return;
    if (!slideImageFile && !(slideModal.imageUrl ?? '').trim()) {
      addToast('Upload an image or paste an image URL.', 'error');
      return;
    }
    setSavingSlide(true);
    try {
      let imageUrl = (slideModal.imageUrl ?? '').trim();
      if (slideImageFile) {
        const uploaded = await api.uploadHeroSlideImage(slideImageFile);
        imageUrl = uploaded.url;
      }
      const payload = {
        eyebrow: (slideModal.eyebrow ?? '').trim(),
        title,
        description: (slideModal.description ?? '').trim(),
        imageUrl,
        buttonLabel: (slideModal.buttonLabel ?? '').trim() || 'Shop Now',
        buttonLink: (slideModal.buttonLink ?? '').trim() || '/',
        theme: slideModal.theme,
        position: Number(slideModal.position) || 0,
        isActive: !!slideModal.isActive,
      };
      if (slideModal.id) {
        await api.updateHeroSlide(slideModal.id, payload);
        addToast('Hero slide updated.', 'success');
      } else {
        await api.createHeroSlide(payload);
        addToast('Hero slide added.', 'success');
      }
      setSlideModal(null);
      setSlideImageFile(null);
      await loadSlides(false);
    } catch (err) {
      addToast(err.message || 'Failed to save hero slide.', 'error');
    } finally {
      setSavingSlide(false);
    }
  };

  const handleDeleteSlide = async (slide) => {
    setBusy(true);
    try {
      await api.deleteHeroSlide(slide.id);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      addToast(`"${slide.title}" slide deleted.`, 'error');
    } catch (err) {
      addToast(err.message || 'Failed to delete hero slide.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSlideActive = async (slide) => {
    setBusy(true);
    try {
      const updated = await api.updateHeroSlide(slide.id, { isActive: !slide.isActive });
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, ...updated } : s)));
      addToast(updated.isActive ? 'Slide is now visible on the homepage.' : 'Slide hidden.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update hero slide.', 'error');
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
    <div className="flex min-h-[calc(100dvh-80px)] animate-fade-in-up">
      {/* Drawer backdrop (mobile) */}
      {navOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Sidebar Navigation — slide-in drawer on mobile, static column on desktop */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-[280px] max-w-[80vw] bg-[#F5ECDE] backdrop-blur-xl border-r border-[#231a16]/5 p-6 flex flex-col shrink-0 overflow-y-auto transition-transform duration-300 lg:sticky lg:top-[80px] lg:h-[calc(100dvh-80px)] lg:max-w-none lg:bg-[#F5ECDE]/90 lg:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h2 className="font-display text-2xl font-bold text-[#B7322A] mb-8 px-4">Admin Dashboard</h2>
        
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarLink icon={<Grid size={20} />} label="Products" active={activeTab === 'products'} onClick={() => selectTab('products')} />
          <SidebarLink icon={<ClipboardCheck size={20} />} label="Product Approvals" badge={pendingProducts.length} active={activeTab === 'approvals'} onClick={() => selectTab('approvals')} />
          <SidebarLink icon={<UserCheck size={20} />} label="Seller Approvals" active={activeTab === 'seller-requests'} onClick={() => selectTab('seller-requests')} />
          <SidebarLink icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => selectTab('orders')} />
          <SidebarLink icon={<Inbox size={20} />} label="Messages" badge={messages.filter((m) => !m.isRead).length} active={activeTab === 'messages'} onClick={() => selectTab('messages')} />
          <SidebarLink icon={<MessageSquare size={20} />} label="Reviews" active={activeTab === 'reviews'} onClick={() => selectTab('reviews')} />
          <SidebarLink icon={<Star size={20} />} label="Featured Products" active={activeTab === 'featured'} onClick={() => selectTab('featured')} />
          <SidebarLink icon={<ImageIcon size={20} />} label="Hero Slides" active={activeTab === 'hero'} onClick={() => selectTab('hero')} />
          <SidebarLink icon={<LayoutDashboard size={20} />} label="Categories" active={activeTab === 'categories'} onClick={() => selectTab('categories')} />
          <SidebarLink icon={<CreditCard size={20} />} label="Payments" active={activeTab === 'payments'} onClick={() => selectTab('payments')} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-12 overflow-x-hidden">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="lg:hidden flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl border border-[#231a16]/10 bg-[#F5ECDE]/70 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors"
          aria-label="Open admin navigation"
        >
          <Menu size={18} /> Menu
        </button>
        
        {/* PRODUCTS TAB (All Approved Products) */}
        {activeTab === 'products' && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">All Approved Products</h1>
                <p className="text-[#7A6A5B]">Complete catalog of all approved products listed by sellers across the platform.</p>
              </div>
              <div className="relative w-full sm:w-72 shrink-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7B6B] pointer-events-none" />
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products by name, category, or seller"
                  className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                />
              </div>
            </div>
            <ProductGrid items={allApprovedProducts} adminMode={true} adminOnDelete={handleRemoveProduct} />
            {loadingProducts && <div className="text-center py-16 text-[#7A6A5B]">Loading products...</div>}
            {!loadingProducts && productSearchTerm && allApprovedProducts.length === 0 && (
              <div className="text-center py-16 text-[#7A6A5B]">No products match "{productSearch.trim()}".</div>
            )}
          </div>
        )}

        {/* PRODUCT APPROVALS TAB (Pending Listings) */}
        {activeTab === 'approvals' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Product Approvals</h1>
              <p className="text-[#7A6A5B]">Review new and resubmitted listings before they appear on the storefront.</p>
            </header>

            {loadingApprovals ? (
              <div className="text-center py-16 text-[#7A6A5B]">Loading pending products...</div>
            ) : pendingProducts.length === 0 ? (
              <GlassCard className="p-10 text-center">
                <ClipboardCheck size={40} className="mx-auto text-[#C4B5A2] mb-3" />
                <p className="text-[#7A6A5B]">No products are waiting for approval.</p>
              </GlassCard>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Product</th>
                      <th className="py-4 px-4 font-semibold">Seller</th>
                      <th className="py-4 px-4 font-semibold text-right">Price</th>
                      <th className="py-4 px-4 font-semibold">Submitted</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map((product) => (
                      <tr key={product.id} className="border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#FDF8F0]/60 border border-[#231a16]/10 flex items-center justify-center shrink-0">
                              {product.coverImage
                                ? <img src={product.coverImage} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                : <ImageIcon size={18} className="text-[#C4B5A2]" />}
                            </div>
                            <span className="font-display text-base font-semibold text-[#2A211B]">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-[#7A6A5B]">{product.storeName || '—'}</td>
                        <td className="py-4 px-4 text-right text-[#B7322A] font-semibold">{inr(product.price)}</td>
                        <td className="py-4 px-4 text-sm text-[#8A7B6B]">{timeAgo(product.createdAt)}</td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={savingApproval}
                              onClick={() => handleApproval(product, 'approve')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-[#B7322A]/30 bg-[#B7322A]/10 text-[#E0A11C] hover:bg-[#B7322A]/20 transition-colors disabled:opacity-50"
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              disabled={savingApproval}
                              onClick={() => { setRejecting(product); setRejectReason(''); }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-[#B3261E]/30 bg-[#FBE3E1]/20 text-[#B3261E] hover:bg-[#FBE3E1]/40 transition-colors disabled:opacity-50"
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* FEATURED PRODUCTS TAB (Homescreen Products) */}
        {activeTab === 'featured' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Featured Products</h1>
                <p className="text-[#7A6A5B]">These products are currently being showcased on the customer homescreen.</p>
              </div>
            </div>
            <ProductGrid items={featuredProducts} adminMode={true} adminOnDelete={handleRemoveProduct} />
            {loadingProducts && <div className="text-center py-16 text-[#7A6A5B]">Loading products...</div>}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Global Order Tracking</h1>
                <p className="text-[#7A6A5B]">Monitor and manage all customer orders placed across every seller storefront.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {ORDER_STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                    statusFilter === tab
                      ? 'bg-[#B7322A]/20 text-[#B7322A] border-[#B7322A]/30'
                      : 'text-[#7A6A5B] border-[#231a16]/10 hover:bg-[#231a16]/5'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>

            <GlassCard className="p-6 lg:p-8">
              {loadingOrders && (
                <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading orders...</div>
              )}
              {!loadingOrders && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
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
                      <tr
                        key={order.id}
                        onClick={() => openOrderDetail(order)}
                        className="border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#7A6A5B] uppercase">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openOrderDetail(order); }}
                            className="hover:text-[#B7322A] transition-colors uppercase"
                            title="View order details"
                          >
                            {shortId(order.id)}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-[#2A211B] font-semibold">{order.customerName || 'Customer'}</td>
                        <td className="py-4 px-4 text-[#231A16]">{order.items?.map((i) => i.productName).join(', ') || '—'}</td>
                        <td className="py-4 px-4 text-[#7A6A5B] text-sm">{formatDate(order.createdAt)}</td>
                        <td className="py-4 px-4 text-right text-[#B7322A] font-semibold">{inr(order.total)}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${ORDER_STATUS_STYLES[order.status] ?? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'}`}>
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
                                    onClick={(e) => { e.stopPropagation(); handleOrderStatus(order, action.key); }}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                      action.key === 'cancelled'
                                        ? 'bg-[#B3261E]/10 text-[#B3261E] border-[#B3261E]/30 hover:bg-[#B3261E]/20'
                                        : 'bg-[#B7322A]/10 text-[#E0A11C] border-[#B7322A]/30 hover:bg-[#B7322A]/20'
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
                            <span className="text-[#C4B5A2] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visibleOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-[#8A7B6B] text-sm">
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
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Support Inbox</h1>
                <p className="text-[#7A6A5B]">Messages submitted through the public Contact page.</p>
              </div>
            </div>

            <GlassCard className="p-6 lg:p-8">
              {loadingMessages && (
                <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading messages...</div>
              )}
              {!loadingMessages && messagesError && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <Inbox className="text-[#B3261E]" size={40} />
                  <div>
                    <p className="text-[#B3261E] font-semibold">Could not load support messages</p>
                    <p className="text-[#8A7B6B] text-sm mt-1 break-words max-w-md">{messagesError}</p>
                  </div>
                  <button
                    onClick={() => loadMessages()}
                    className="px-5 py-2.5 rounded-xl font-display text-sm font-bold bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingMessages && !messagesError && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">From</th>
                      <th className="py-4 px-4 font-semibold">Message</th>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold text-center">Status</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map(msg => (
                      <tr
                        key={msg.id}
                        onClick={() => openMessage(msg)}
                        className={`border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors cursor-pointer ${msg.isRead && !msg.reply ? 'opacity-60' : ''}`}
                      >
                        <td className="py-4 px-4">
                          <p className="text-[#2A211B] font-semibold">{msg.name}</p>
                          <a href={`mailto:${msg.email}`} onClick={(e) => e.stopPropagation()} className="text-[#7A6A5B] text-xs hover:text-[#B7322A] transition-colors">{msg.email}</a>
                        </td>
                        <td className="py-4 px-4 max-w-md">
                          <p className="text-[#231A16] font-semibold text-sm">{msg.subject}</p>
                          <p className="text-[#8A7B6B] text-sm line-clamp-2">{msg.message}</p>
                        </td>
                        <td className="py-4 px-4 text-[#7A6A5B] text-sm whitespace-nowrap">{formatDate(msg.createdAt)}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            msg.reply
                              ? 'bg-[#E0A11C]/20 text-[#E0A11C] border-[#E0A11C]/30'
                              : msg.isRead
                                ? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'
                                : 'bg-[#B7322A]/20 text-[#C8901A] border-[#B7322A]/30'
                          }`}>
                            {msg.reply ? 'Replied' : msg.isRead ? 'Read' : 'New'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openMessage(msg); }}
                              title={msg.reply ? 'View / edit reply' : 'Reply'}
                              className="p-2 rounded-xl bg-[#B7322A]/10 text-[#B7322A] hover:bg-[#B7322A]/20 transition-colors"
                            >
                              <Reply size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleMessageRead(msg); }}
                              title={msg.isRead ? 'Mark as unread' : 'Mark as read'}
                              className="p-2 rounded-xl bg-[#B7322A]/10 text-[#E0A11C] hover:bg-[#B7322A]/20 transition-colors"
                            >
                              {msg.isRead ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }}
                              disabled={busy}
                              title="Delete"
                              className="p-2 rounded-xl bg-[#B3261E]/10 text-[#B3261E] hover:bg-[#B3261E]/20 transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {messages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#8A7B6B] text-sm">
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

        {/* REVIEWS TAB (Moderation) */}
        {activeTab === 'reviews' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Review Moderation</h1>
                <p className="text-[#7A6A5B]">Hide abusive reviews from the storefront or remove them permanently.</p>
              </div>
            </div>

            <GlassCard className="p-6 lg:p-8">
              {loadingReviews && (
                <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading reviews...</div>
              )}
              {!loadingReviews && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Product</th>
                      <th className="py-4 px-4 font-semibold">Reviewer</th>
                      <th className="py-4 px-4 font-semibold text-center">Rating</th>
                      <th className="py-4 px-4 font-semibold">Review</th>
                      <th className="py-4 px-4 font-semibold text-center">Status</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id} className={`border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors ${review.isHidden ? 'opacity-60' : ''}`}>
                        <td className="py-4 px-4">
                          <p className="text-[#2A211B] font-semibold">{review.productName ?? '—'}</p>
                          {review.storeName && <p className="text-[#8A7B6B] text-xs">{review.storeName}</p>}
                        </td>
                        <td className="py-4 px-4 text-[#7A6A5B] text-sm">{review.author}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-[#B7322A] font-semibold whitespace-nowrap">
                            {review.rating}<Star size={13} className="inline mb-0.5 ml-0.5" fill="currentColor" />
                          </span>
                        </td>
                        <td className="py-4 px-4 max-w-md">
                          <p className="text-[#8A7B6B] text-sm line-clamp-2">{review.comment || 'No written comment.'}</p>
                          {review.sellerReply && (
                            <p className="text-[#7A6A5B] text-xs mt-1 line-clamp-1">Reply: {review.sellerReply}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${review.isHidden ? 'bg-[#B3261E]/20 text-[#B3261E] border-[#B3261E]/30' : 'bg-[#B7322A]/20 text-[#C8901A] border-[#B7322A]/30'}`}>
                            {review.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleReviewHidden(review)}
                              disabled={busy}
                              title={review.isHidden ? 'Unhide review' : 'Hide review'}
                              className="p-2 rounded-xl bg-[#B7322A]/10 text-[#E0A11C] hover:bg-[#B7322A]/20 transition-colors disabled:opacity-50"
                            >
                              {review.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review)}
                              disabled={busy}
                              title="Delete"
                              className="p-2 rounded-xl bg-[#B3261E]/10 text-[#B3261E] hover:bg-[#B3261E]/20 transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-[#8A7B6B] text-sm">
                          No reviews have been submitted yet.
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
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Seller Approvals</h1>
                <p className="text-[#7A6A5B]">Review and approve users requesting to open a storefront.</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {loadingRequests && (
                <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading seller requests...</div>
              )}
              {!loadingRequests && sellerRequests.length === 0 && (
                <div className="bg-[#F0E7DA]/30 p-8 rounded-xl border border-dashed border-[#231a16]/10 text-center text-[#8A7B6B] text-sm">
                  No pending seller requests — you're all caught up.
                </div>
              )}
              {sellerRequests.map((req) => (
                <GlassCard key={req.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#B7322A]/10 text-[#B7322A] flex items-center justify-center shrink-0 border border-[#B7322A]/20">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-[#231A16]">{req.storeName}</h3>
                      <p className="text-[#7A6A5B] text-sm mt-1">Applicant: <span className="text-[#2A211B]">{req.user}</span> ({req.email})</p>
                      <p className="text-[#8A7B6B] text-xs mt-1">Applied: {req.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => handleReview(req.id, 'approve')} disabled={busy} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7A1F1A]/50 hover:bg-[#B7322A]/20 border border-[#B7322A]/30 text-[#231A16] text-sm font-semibold transition-all disabled:opacity-50">
                      <Check size={16} /> Approve
                    </button>
                    <button onClick={() => handleReview(req.id, 'reject')} disabled={busy} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F7D5D2]/50 hover:bg-[#B3261E]/20 border border-[#B3261E]/30 text-[#B3261E] text-sm font-semibold transition-all disabled:opacity-50">
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
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Platform Categories</h1>
                <p className="text-[#7A6A5B]">Manage the main product categories available across the platform.</p>
              </div>
              <button onClick={() => setCategoryModal(true)} className="py-3 px-6 rounded-xl bg-[#B7322A] text-[#FDF8F0] font-display text-base font-semibold hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all flex items-center gap-2">
                <PlusCircle size={20} /> Add Category
              </button>
            </div>
            
            <GlassCard className="p-6 lg:p-8">
              {loadingCategories && (
                <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading categories...</div>
              )}
              {!loadingCategories && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Category ID</th>
                      <th className="py-4 px-4 font-semibold">Name</th>
                      <th className="py-4 px-4 font-semibold">Slug</th>
                      <th className="py-4 px-4 font-semibold text-center">Total Products</th>
                      <th className="py-4 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#7A6A5B] uppercase">{shortId(cat.id)}</td>
                        <td className="py-4 px-4 text-[#231A16] font-semibold text-lg">{cat.name}</td>
                        <td className="py-4 px-4 text-[#8A7B6B] text-sm">{cat.slug}</td>
                        <td className="py-4 px-4 text-center text-[#2A211B] font-semibold">{cat.productCount}</td>
                        <td className="py-4 px-4 flex justify-end gap-2">
                          <button onClick={() => handleDeleteCategory(cat.id)} disabled={busy} className="p-2 rounded-xl bg-[#B3261E]/10 text-[#B3261E] hover:bg-[#B3261E]/20 transition-colors disabled:opacity-50" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[#8A7B6B] text-sm">No categories yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* HERO SLIDES TAB */}
        {activeTab === 'hero' && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Homepage Hero Slides</h1>
                <p className="text-[#7A6A5B]">Add as many slides as you like; they rotate in the homepage carousel. Lower position numbers appear first.</p>
              </div>
              <button onClick={openCreateSlide} className="py-3 px-6 rounded-xl bg-[#B7322A] text-[#FDF8F0] font-display text-base font-semibold hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all flex items-center gap-2 w-fit">
                <PlusCircle size={20} /> Add Slide
              </button>
            </div>

            {loadingSlides && (
              <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading slides...</div>
            )}

            {!loadingSlides && slides.length === 0 && (
              <GlassCard className="p-6 lg:p-8">
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <ImageIcon size={40} className="text-[#F0E7DA]" />
                  <p className="text-[#2A211B] font-display text-lg font-semibold">No hero slides yet</p>
                  <p className="text-[#7A6A5B] text-sm max-w-md">Add your first slide to populate the homepage carousel.</p>
                </div>
              </GlassCard>
            )}

            {!loadingSlides && slides.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {slides.map((slide) => (
                  <GlassCard key={slide.id} className="overflow-hidden flex flex-col">
                    <div className="relative h-44">
                      <img src={slide.imageUrl} alt={slide.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#FDF8F0]/90 to-transparent" />
                      <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${slide.isActive ? 'bg-[#E0A11C]/20 text-[#E0A11C] border-[#E0A11C]/30' : 'bg-[#F0E7DA] text-[#7A6A5B] border-[#231a16]/10'}`}>
                        {slide.isActive ? 'Visible' : 'Hidden'}
                      </span>
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#231A16]/70 text-[#FDF8F0] border border-[#231a16]/10">#{slide.position}</span>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      {slide.eyebrow && <p className="text-[#B7322A] text-[10px] font-bold uppercase tracking-widest mb-1">{slide.eyebrow}</p>}
                      <h3 className="font-display text-lg font-semibold text-[#2A211B] mb-1 line-clamp-1">{slide.title}</h3>
                      {slide.description && <p className="text-[#7A6A5B] text-xs leading-relaxed line-clamp-2 mb-4 flex-1">{slide.description}</p>}
                      <div className="flex items-center gap-2 mt-auto pt-3">
                        <button onClick={() => openEditSlide(slide)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#231a16]/5 border border-[#231a16]/10 text-[#2A211B] text-xs font-semibold hover:bg-[#231a16]/10 transition-colors">
                          <Pencil size={14} /> Edit
                        </button>
                        <button onClick={() => handleToggleSlideActive(slide)} disabled={busy} className="px-3 py-2 rounded-xl bg-[#231a16]/5 border border-[#231a16]/10 text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/10 transition-colors disabled:opacity-50" title={slide.isActive ? 'Hide slide' : 'Show slide'}>
                          {slide.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => handleDeleteSlide(slide)} disabled={busy} className="px-3 py-2 rounded-xl bg-[#B3261E]/10 text-[#B3261E] hover:bg-[#B3261E]/20 transition-colors disabled:opacity-50" title="Delete slide">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Platform Payments & Ledger</h1>
                <p className="text-[#7A6A5B]">Gross sales, platform fees and seller payouts computed live from real order data.</p>
              </div>
            </div>

            {loadingLedger && (
              <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading ledger...</div>
            )}

            {!loadingLedger && ledger && ledger.summary && (
              <>
                {ledger.summary.orders === 0 ? (
                  <GlassCard className="p-6 lg:p-8">
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <CreditCard size={40} className="text-[#F0E7DA]" />
                      <p className="text-[#2A211B] font-display text-lg font-semibold">No settled payments yet</p>
                      <p className="text-[#7A6A5B] text-sm max-w-md">
                        Revenue appears here once orders are paid, shipped, or delivered. Pending and cancelled orders are excluded.
                      </p>
                    </div>
                  </GlassCard>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <StatCard icon={<IndianRupee size={24} />} title="Gross Sales" value={inr(ledger.summary.grossSales)} trend={`${ledger.summary.orders} order${ledger.summary.orders === 1 ? '' : 's'}`} />
                      <StatCard icon={<Percent size={24} />} title="Platform Fees" value={inr(ledger.summary.platformFees)} trend={`${Math.round(ledger.feeRate * 100)}% commission`} />
                      <StatCard icon={<Wallet size={24} />} title="Seller Payouts" value={inr(ledger.summary.sellerPayouts)} trend={`${inr(ledger.summary.unsettledPayouts)} unsettled`} />
                      <StatCard icon={<ShoppingBag size={24} />} title="Units Sold" value={String(ledger.summary.unitsSold)} trend={`${ledger.summary.cancelledOrders} cancelled`} />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                      <GlassCard className="xl:col-span-8 p-6 lg:p-8">
                        <h2 className="font-display text-xl font-semibold text-[#231A16] mb-6 flex items-center gap-2">
                          <TrendingUp size={20} className="text-[#B7322A]" /> Recent Transactions
                        </h2>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                                <th className="py-3 px-3 font-semibold">Order</th>
                                <th className="py-3 px-3 font-semibold">Customer</th>
                                <th className="py-3 px-3 font-semibold">Date</th>
                                <th className="py-3 px-3 font-semibold text-center">Status</th>
                                <th className="py-3 px-3 font-semibold text-right">Amount</th>
                                <th className="py-3 px-3 font-semibold text-right">Platform Fee</th>
                                <th className="py-3 px-3 font-semibold text-right">Seller Payout</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.transactions.slice(0, 25).map((t) => (
                                <tr key={t.id} className="border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors">
                                  <td className="py-3 px-3 text-[#B7322A] font-mono text-xs font-semibold">{shortId(t.id)}</td>
                                  <td className="py-3 px-3 text-[#2A211B] text-sm">{t.customerName ?? '—'}</td>
                                  <td className="py-3 px-3 text-[#8A7B6B] text-xs whitespace-nowrap">{formatDate(t.createdAt)}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ORDER_STATUS_STYLES[t.status] ?? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'}`}>
                                      {t.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right text-[#231A16] font-semibold text-sm">{inr(t.total)}</td>
                                  <td className="py-3 px-3 text-right text-[#C8901A] text-sm">{inr(t.fee)}</td>
                                  <td className="py-3 px-3 text-right text-[#2E7D32] text-sm">{inr(t.payout)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </GlassCard>

                      <GlassCard className="xl:col-span-4 p-6 lg:p-8">
                        <h2 className="font-display text-xl font-semibold text-[#231A16] mb-6 flex items-center gap-2">
                          <Percent size={20} className="text-[#C8901A]" /> Fee Split
                        </h2>
                        {(() => {
                          const gross = ledger.summary.grossSales;
                          const feePct = gross ? (ledger.summary.platformFees / gross) * 100 : 0;
                          const payPct = gross ? (ledger.summary.sellerPayouts / gross) * 100 : 0;
                          return (
                            <>
                              <div className="flex h-3 rounded-full overflow-hidden bg-[#231a16]/5 mb-6">
                                <div className="bg-[#C8901A] transition-all" style={{ width: `${feePct}%` }} title={`Platform ${inr(ledger.summary.platformFees)}`} />
                                <div className="bg-[#2E7D32] transition-all" style={{ width: `${payPct}%` }} title={`Sellers ${inr(ledger.summary.sellerPayouts)}`} />
                              </div>
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8901A] shrink-0" />
                                  <span className="text-sm text-[#7A6A5B] flex-1">Platform commission</span>
                                  <span className="text-sm text-[#231A16] font-semibold">{inr(ledger.summary.platformFees)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] shrink-0" />
                                  <span className="text-sm text-[#7A6A5B] flex-1">Net to sellers</span>
                                  <span className="text-sm text-[#231A16] font-semibold">{inr(ledger.summary.sellerPayouts)}</span>
                                </div>
                              </div>
                              {ledger.grossUnattributed > 0.009 && (
                                <p className="text-[11px] text-[#8A7B6B] mt-5 leading-relaxed">
                                  Includes {inr(ledger.grossUnattributed)} from orders whose products were removed afterwards.
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </GlassCard>
                    </div>

                    <GlassCard className="p-6 lg:p-8">
                      <h2 className="font-display text-xl font-semibold text-[#231A16] mb-2 flex items-center gap-2">
                        <Wallet size={20} className="text-[#E0A11C]" /> Revenue by Seller
                      </h2>
                      <p className="text-[#8A7B6B] text-xs mb-6">
                        Each line item is attributed back to the store that sold it. {Math.round(ledger.feeRate * 100)}% commission is deducted from each store's gross before payout.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                              <th className="py-3 px-3 font-semibold">Store</th>
                              <th className="py-3 px-3 font-semibold">Seller</th>
                              <th className="py-3 px-3 font-semibold text-center">Orders</th>
                              <th className="py-3 px-3 font-semibold text-center">Units</th>
                              <th className="py-3 px-3 font-semibold text-right">Gross</th>
                              <th className="py-3 px-3 font-semibold text-right">Platform Fee</th>
                              <th className="py-3 px-3 font-semibold text-right">Payout</th>
                              <th className="py-3 px-3 font-semibold text-right">Unsettled</th>
                              <th className="py-3 px-3 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledger.sellers.map((s) => (
                              <tr key={s.id} className="border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors">
                                <td className="py-3 px-3 text-[#2A211B] font-semibold text-sm">{s.name}</td>
                                <td className="py-3 px-3 text-[#8A7B6B] text-sm">{s.sellerName ?? '—'}</td>
                                <td className="py-3 px-3 text-center text-[#7A6A5B] text-sm">{s.orderCount}</td>
                                <td className="py-3 px-3 text-center text-[#7A6A5B] text-sm">{s.units}</td>
                                <td className="py-3 px-3 text-right text-[#231A16] text-sm">{inr(s.gross)}</td>
                                <td className="py-3 px-3 text-right text-[#C8901A] text-sm">{inr(s.fee)}</td>
                                <td className="py-3 px-3 text-right text-[#2E7D32] font-semibold text-sm">{inr(s.payout)}</td>
                                <td className="py-3 px-3 text-right text-sm">
                                  {s.unsettledGross > 0 ? (
                                    <span className="text-[#E0A11C] font-semibold">{inr(s.unsettledPayout)}</span>
                                  ) : (
                                    <span className="text-[#8A7B6B]">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {s.unsettledOrders?.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => openSettle(s)}
                                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30 hover:bg-[#2E7D32]/25 transition-colors"
                                    >
                                      Mark settled
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-[#8A7B6B] uppercase tracking-wider">Settled</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {ledger.sellers.length === 0 && (
                              <tr>
                                <td colSpan={9} className="py-12 text-center text-[#8A7B6B] text-sm">No seller revenue to show yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>

                    <GlassCard className="mt-6 p-6 lg:p-8">
                      <h2 className="font-display text-xl font-semibold text-[#231A16] mb-2 flex items-center gap-2">
                        <Wallet size={20} className="text-[#2E7D32]" /> Settlement History
                      </h2>
                      <p className="text-[#8A7B6B] text-xs mb-6">
                        Manual payouts already sent to sellers. Settled orders are excluded from the amounts still owed above.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider">
                              <th className="py-3 px-3 font-semibold">Date</th>
                              <th className="py-3 px-3 font-semibold">Store</th>
                              <th className="py-3 px-3 font-semibold text-center">Orders</th>
                              <th className="py-3 px-3 font-semibold text-right">Gross</th>
                              <th className="py-3 px-3 font-semibold text-right">Fee</th>
                              <th className="py-3 px-3 font-semibold text-right">Paid</th>
                              <th className="py-3 px-3 font-semibold">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(ledger.settlements ?? []).map((st) => (
                              <tr key={st.id} className="border-b border-[#231a16]/5">
                                <td className="py-3 px-3 text-[#8A7B6B] text-xs whitespace-nowrap">{formatDate(st.createdAt)}</td>
                                <td className="py-3 px-3 text-[#2A211B] text-sm font-semibold">{st.storeName}</td>
                                <td className="py-3 px-3 text-center text-[#7A6A5B] text-sm">{st.orderCount}</td>
                                <td className="py-3 px-3 text-right text-[#231A16] text-sm">{inr(st.gross)}</td>
                                <td className="py-3 px-3 text-right text-[#C8901A] text-sm">{inr(st.fee)}</td>
                                <td className="py-3 px-3 text-right text-[#2E7D32] font-semibold text-sm">{inr(st.net)}</td>
                                <td className="py-3 px-3 text-[#8A7B6B] text-xs">{st.note ?? '—'}</td>
                              </tr>
                            ))}
                            {(ledger.settlements ?? []).length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-10 text-center text-[#8A7B6B] text-sm">No payouts recorded yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Placeholder for remaining tabs */}
        {activeTab !== 'products' && activeTab !== 'approvals' && activeTab !== 'featured' && activeTab !== 'hero' && activeTab !== 'seller-requests' && activeTab !== 'categories' && activeTab !== 'payments' && activeTab !== 'orders' && activeTab !== 'messages' && activeTab !== 'reviews' && (
          <div className="h-[600px] flex flex-col items-center justify-center animate-fade-in-up opacity-70">
            <h2 className="font-display text-3xl font-bold text-[#231A16] mb-2 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[#7A6A5B]">This admin module is currently under construction.</p>
          </div>
        )}

      </main>

      {settleTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onMouseDown={() => !settling && setSettleTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Record seller payout"
        >
          <GlassCard hover={false} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div onMouseDown={(e) => e.stopPropagation()} className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold text-[#231A16] flex items-center gap-2">
                    <Wallet size={22} className="text-[#2E7D32]" /> Record Payout
                  </h2>
                  <p className="text-[#7A6A5B] text-sm mt-1">{settleTarget.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => !settling && setSettleTarget(null)}
                  className="w-9 h-9 rounded-full border border-[#231a16]/10 text-[#7A6A5B] flex items-center justify-center hover:bg-[#231a16]/5 transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-[#8A7B6B] text-xs mb-3">
                Uncheck any order you are not paying now; it stays in the unsettled balance.
              </p>

              <div className="border border-[#231a16]/10 rounded-xl divide-y divide-[#231a16]/5 mb-5 max-h-72 overflow-y-auto">
                {(settleTarget.unsettledOrders ?? []).map((o) => {
                  const checked = settleSelection.has(o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#231a16]/5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSettleOrder(o.id)}
                        className="accent-[#2E7D32] w-4 h-4"
                      />
                      <span className="font-mono text-xs text-[#7A6A5B] flex-1">{shortId(o.id)}</span>
                      <span className="text-[#8A7B6B] text-xs whitespace-nowrap">{formatDate(o.createdAt)}</span>
                      <span className="text-[#2E7D32] text-sm font-semibold whitespace-nowrap">{inr(o.net)}</span>
                    </label>
                  );
                })}
              </div>

              <label className="block mb-5">
                <span className="text-[#7A6A5B] text-xs uppercase tracking-wider">Note (optional)</span>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. UPI transfer on 22 Sep"
                  className="mt-2 w-full rounded-xl bg-[#F5ECDE] border border-[#231a16]/10 px-3 py-2 text-sm text-[#2A211B] focus:outline-none focus:border-[#2E7D32]/50"
                />
              </label>

              <div className="flex items-center justify-between gap-4 border-t border-[#231a16]/10 pt-4">
                <div className="text-sm">
                  <span className="text-[#7A6A5B]">Paying now</span>
                  <span className="text-[#2E7D32] font-bold text-lg ml-3">
                    {inr(
                      (settleTarget.unsettledOrders ?? [])
                        .filter((o) => settleSelection.has(o.id))
                        .reduce((sum, o) => sum + o.net, 0),
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSettleTarget(null)}
                    disabled={settling}
                    className="px-4 py-2 rounded-xl text-sm text-[#7A6A5B] border border-[#231a16]/10 hover:bg-[#231a16]/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmSettle}
                    disabled={settling || settleSelection.size === 0}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#2E7D32] text-[#F5ECDE] hover:bg-[#2E7D32] disabled:opacity-50"
                  >
                    {settling ? 'Recording...' : 'Record payout'}
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {orderDetail && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onMouseDown={() => setOrderDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
        >
          <GlassCard hover={false} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div onMouseDown={(e) => e.stopPropagation()} className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold text-[#231A16] flex items-center gap-2">
                    <ShoppingBag size={22} className="text-[#B7322A]" /> Order Details
                  </h2>
                  <p className="text-[#7A6A5B] text-xs mt-1 font-mono break-all">{orderDetail.id}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${ORDER_STATUS_STYLES[orderDetail.status] ?? 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10'}`}>
                    {orderDetail.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrderDetail(null)}
                    className="w-9 h-9 rounded-full border border-[#231a16]/10 text-[#7A6A5B] flex items-center justify-center hover:bg-[#231a16]/5 transition-colors"
                    aria-label="Close order details"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {loadingOrderDetail ? (
                <div className="flex items-center justify-center h-40 text-[#7A6A5B] gap-2">
                  <Loader2 size={18} className="animate-spin" /> Loading order details...
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OrderDetailBlock title="Customer">
                      <p className="text-[#2A211B] font-semibold">{orderDetail.customer?.name || 'Customer'}</p>
                      {orderDetail.customer?.email && (
                        <p className="text-[#7A6A5B] text-sm break-all">{orderDetail.customer.email}</p>
                      )}
                      {orderDetail.customer?.phone && (
                        <p className="text-[#7A6A5B] text-sm">{orderDetail.customer.phone}</p>
                      )}
                    </OrderDetailBlock>

                    <OrderDetailBlock title="Order">
                      <p className="text-[#7A6A5B] text-sm">Placed {formatDate(orderDetail.createdAt)}</p>
                      <p className="text-[#7A6A5B] text-sm">
                        Seller store: <span className="text-[#2A211B]">{orderDetail.store || '—'}</span>
                      </p>
                    </OrderDetailBlock>
                  </div>

                  <OrderDetailBlock title="Shipping Address">
                    {orderDetail.shippingAddress ? (
                      <p className="text-[#7A6A5B] text-sm leading-relaxed">
                        {[orderDetail.shippingAddress.firstName, orderDetail.shippingAddress.lastName]
                          .filter(Boolean)
                          .join(' ')}
                        <br />
                        {orderDetail.shippingAddress.address}
                        <br />
                        {[orderDetail.shippingAddress.city, orderDetail.shippingAddress.pin]
                          .filter(Boolean)
                          .join(' - ')}
                        {orderDetail.shippingAddress.phone && (
                          <>
                            <br />
                            {orderDetail.shippingAddress.phone}
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-[#8A7B6B] text-sm">No shipping address on this order.</p>
                    )}
                  </OrderDetailBlock>

                  <div>
                    <h3 className="text-[#B7322A] text-xs font-bold uppercase tracking-wider mb-3">Items</h3>
                    <div className="border border-[#231a16]/10 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-4 font-semibold">Product</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Qty</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Price</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(orderDetail.items ?? []).map((item) => (
                            <tr key={item.id} className="border-b border-[#231a16]/5 last:border-0">
                              <td className="py-2.5 px-4 text-[#231A16]">{item.productName}</td>
                              <td className="py-2.5 px-4 text-center text-[#7A6A5B]">{item.quantity}</td>
                              <td className="py-2.5 px-4 text-right text-[#7A6A5B]">{inr(item.unitPrice)}</td>
                              <td className="py-2.5 px-4 text-right text-[#2A211B] font-semibold">{inr(item.lineTotal)}</td>
                            </tr>
                          ))}
                          {(orderDetail.items ?? []).length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-[#8A7B6B] text-sm">No items on this order.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 border-t border-[#231a16]/10 pt-4">
                    <div className="flex items-center justify-between w-full sm:w-64 text-sm">
                      <span className="text-[#7A6A5B]">Subtotal</span>
                      <span className="text-[#2A211B]">{inr(orderDetail.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-64 text-base">
                      <span className="text-[#7A6A5B] font-semibold">Total</span>
                      <span className="text-[#B7322A] font-bold">{inr(orderDetail.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {rejecting && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onMouseDown={() => { if (!savingApproval) { setRejecting(null); setRejectReason(''); } }}
          role="dialog"
          aria-modal="true"
          aria-label="Reject product"
        >
          <GlassCard hover={false} className="relative w-full max-w-md p-6 md:p-8">
            <div onMouseDown={(e) => e.stopPropagation()}>
              <h2 className="font-display text-2xl font-bold text-[#231A16] mb-2 flex items-center gap-2">
                <X size={22} className="text-[#B3261E]" /> Reject Product
              </h2>
              <p className="text-[#7A6A5B] text-sm mb-5">
                Rejecting <span className="text-[#2A211B] font-semibold">{rejecting.name}</span>. The seller will see your reason and can resubmit.
              </p>
              <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Reason (optional)</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Images are low quality or the description is misleading."
                className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all resize-none"
              />
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  disabled={savingApproval}
                  onClick={() => { setRejecting(null); setRejectReason(''); }}
                  className="px-5 py-2.5 rounded-xl border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingApproval}
                  onClick={() => handleApproval(rejecting, 'reject', rejectReason)}
                  className="px-5 py-2.5 rounded-xl bg-[#FBE3E1]/40 border border-[#B3261E]/40 text-[#B3261E] text-sm font-bold flex items-center gap-2 hover:bg-[#FBE3E1]/60 transition-colors disabled:opacity-50"
                >
                  {savingApproval ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  {savingApproval ? 'Rejecting...' : 'Reject Product'}
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {categoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={() => setCategoryModal(false)} role="dialog" aria-modal="true" aria-label="Add category">
          <GlassCard hover={false} className="relative w-full max-w-md animate-scale-in">
            <form onSubmit={handleCreateCategory} onMouseDown={(e) => e.stopPropagation()} className="p-6 md:p-8 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#231A16] flex items-center gap-2">
                    <PlusCircle className="text-[#B7322A]" size={24} /> Add Category
                  </h2>
                  <p className="text-[#7A6A5B] text-xs mt-1">Create a new product category for the platform.</p>
                </div>
                <button type="button" onClick={() => setCategoryModal(false)} className="p-2 -mr-2 rounded-xl text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 transition-colors" aria-label="Close">
                  <X size={22} />
                </button>
              </div>
              <div>
                <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Wearables"
                  autoFocus
                  className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#231a16]/10">
                <button type="button" onClick={() => setCategoryModal(false)} className="px-6 py-2.5 rounded-xl border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!newCategory.trim() || busy} className="px-6 py-2.5 rounded-xl font-display text-sm font-bold flex items-center gap-2 transition-all bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] disabled:bg-[#F0E7DA]/50 disabled:text-[#8A7B6B] disabled:cursor-not-allowed">
                  <PlusCircle size={18} /> {busy ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {slideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={closeSlideModal} role="dialog" aria-modal="true" aria-label={slideModal.id ? 'Edit hero slide' : 'Add hero slide'}>
          <GlassCard hover={false} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <form onSubmit={handleSaveSlide} onMouseDown={(e) => e.stopPropagation()} className="p-6 md:p-8 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#231A16] flex items-center gap-2">
                    <ImageIcon className="text-[#B7322A]" size={24} /> {slideModal.id ? 'Edit Hero Slide' : 'Add Hero Slide'}
                  </h2>
                  <p className="text-[#7A6A5B] text-xs mt-1">This slide appears in the homepage carousel.</p>
                </div>
                <button type="button" onClick={closeSlideModal} className="p-2 -mr-2 rounded-xl text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 transition-colors" aria-label="Close">
                  <X size={22} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Eyebrow</label>
                  <input
                    type="text"
                    value={slideModal.eyebrow ?? ''}
                    onChange={(e) => setSlideModal({ ...slideModal, eyebrow: e.target.value })}
                    placeholder="e.g. New Arrivals"
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                  />
                </div>
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Theme</label>
                  <select
                    value={slideModal.theme ?? 'orange'}
                    onChange={(e) => setSlideModal({ ...slideModal, theme: e.target.value })}
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all"
                  >
                    <option value="orange">Orange</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Title *</label>
                <input
                  type="text"
                  value={slideModal.title ?? ''}
                  onChange={(e) => setSlideModal({ ...slideModal, title: e.target.value })}
                  placeholder="e.g. Dominate Your Arena"
                  autoFocus
                  className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                />
              </div>

              <div>
                <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Description</label>
                <textarea
                  rows={3}
                  value={slideModal.description ?? ''}
                  onChange={(e) => setSlideModal({ ...slideModal, description: e.target.value })}
                  placeholder="A short supporting line shown under the title."
                  className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B] resize-none"
                />
              </div>

              <div>
                <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSlideImageFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-[#7A6A5B] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#F0E7DA] file:text-[#2A211B] file:text-xs file:font-semibold hover:file:bg-[#E0A11C] file:cursor-pointer"
                />
                <input
                  type="url"
                  value={slideModal.imageUrl ?? ''}
                  onChange={(e) => setSlideModal({ ...slideModal, imageUrl: e.target.value })}
                  placeholder="...or paste an image URL"
                  className="w-full mt-3 bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                />
                {slideImageFile ? (
                  <p className="text-[#7A6A5B] text-xs mt-2">Selected: {slideImageFile.name}</p>
                ) : slideModal.imageUrl ? (
                  <img src={slideModal.imageUrl} alt="Slide preview" loading="lazy" decoding="async" className="mt-3 w-full h-32 object-cover rounded-xl border border-[#231a16]/10" />
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Button Label</label>
                  <input
                    type="text"
                    value={slideModal.buttonLabel ?? ''}
                    onChange={(e) => setSlideModal({ ...slideModal, buttonLabel: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                  />
                </div>
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Button Link</label>
                  <input
                    type="text"
                    value={slideModal.buttonLink ?? ''}
                    onChange={(e) => setSlideModal({ ...slideModal, buttonLink: e.target.value })}
                    placeholder="/search?q=keyboard or https://..."
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-end">
                <div>
                  <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Position</label>
                  <input
                    type="number"
                    min="0"
                    value={slideModal.position ?? 0}
                    onChange={(e) => setSlideModal({ ...slideModal, position: e.target.value })}
                    className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all"
                  />
                </div>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#231a16]/5 border border-[#231a16]/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!slideModal.isActive}
                    onChange={(e) => setSlideModal({ ...slideModal, isActive: e.target.checked })}
                    className="w-4 h-4 accent-[#B7322A]"
                  />
                  <span className="text-[#2A211B] text-sm font-semibold">Visible on homepage</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#231a16]/10">
                <button type="button" onClick={closeSlideModal} className="px-6 py-2.5 rounded-xl border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={savingSlide || !(slideModal.title ?? '').trim()} className="px-6 py-2.5 rounded-xl font-display text-sm font-bold flex items-center gap-2 transition-all bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] disabled:bg-[#F0E7DA]/50 disabled:text-[#8A7B6B] disabled:cursor-not-allowed">
                  <PlusCircle size={18} /> {savingSlide ? 'Saving...' : slideModal.id ? 'Save Changes' : 'Add Slide'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {messageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onMouseDown={() => setMessageModal(null)} role="dialog" aria-modal="true" aria-label="Support message">
          <GlassCard hover={false} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <form onSubmit={handleSendReply} onMouseDown={(e) => e.stopPropagation()} className="p-6 md:p-8 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#231A16] flex items-center gap-2">
                    <Inbox className="text-[#B7322A] shrink-0" size={22} /> <span className="truncate">{messageModal.subject}</span>
                  </h2>
                  <p className="text-[#7A6A5B] text-xs mt-1 break-all">{messageModal.name} · {messageModal.email}</p>
                </div>
                <button type="button" onClick={() => setMessageModal(null)} className="p-2 -mr-2 rounded-xl text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 transition-colors shrink-0" aria-label="Close">
                  <X size={22} />
                </button>
              </div>

              <div className="rounded-xl border border-[#231a16]/10 bg-[#F5ECDE]/60 p-4">
                <p className="text-[#8A7B6B] text-xs font-semibold uppercase tracking-wider mb-2">{formatDate(messageModal.createdAt)}</p>
                <p className="text-[#2A211B] text-sm whitespace-pre-wrap">{messageModal.message}</p>
                {messageModal.productName && <p className="text-[#8A7B6B] text-xs mt-3">About product: {messageModal.productName}</p>}
                {messageModal.storeName && <p className="text-[#8A7B6B] text-xs mt-1">Store: {messageModal.storeName}</p>}
              </div>

              <div>
                <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">
                  {messageModal.reply ? 'Your Reply' : 'Reply'}
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-xl py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all resize-none placeholder:text-[#8A7B6B]"
                />
                {messageModal.repliedAt && (
                  <p className="text-[#8A7B6B] text-xs mt-2">Last replied {formatDate(messageModal.repliedAt)} — sending again updates it.</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#231a16]/10">
                <button type="button" onClick={() => setMessageModal(null)} className="px-6 py-2.5 rounded-xl border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors">
                  Close
                </button>
                <button type="submit" disabled={!replyText.trim() || replying} className="px-6 py-2.5 rounded-xl font-display text-sm font-bold flex items-center gap-2 transition-all bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] disabled:bg-[#F0E7DA]/50 disabled:text-[#8A7B6B] disabled:cursor-not-allowed">
                  <Reply size={18} /> {replying ? 'Sending...' : messageModal.reply ? 'Update Reply' : 'Send Reply'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, trend }) {
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[#B7322A] bg-[#B7322A]/10 p-3 rounded-xl border border-[#B7322A]/20">
          {icon}
        </div>
        <span className="text-xs font-bold tracking-wider px-2 py-1 rounded-full bg-[#B7322A]/20 text-[#B7322A]">
          {trend}
        </span>
      </div>
      <div>
        <h3 className="text-[#7A6A5B] text-sm font-semibold uppercase tracking-wider mb-1">{title}</h3>
        <p className="font-display text-3xl font-bold text-[#231A16]">{value}</p>
      </div>
    </GlassCard>
  );
}

function SidebarLink({ icon, label, active, onClick, badge }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all duration-200 w-full text-left ${
        active 
          ? 'bg-[#B7322A]/20 text-[#B7322A] border border-[#B7322A]/30 shadow-[0_0_7px_rgba(183,50,42,0.06)]' 
          : 'text-[#7A6A5B] hover:bg-[#F0E7DA]/50 hover:text-[#2A211B]'
      }`}
    >
      {icon} <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B7322A]/20 text-[#C8901A] border border-[#B7322A]/30">
          {badge}
        </span>
      )}
    </button>
  );
}
