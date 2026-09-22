import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Edit, Trash2, PlusCircle, CheckCircle, Clock, XCircle, X, UploadCloud, ChevronDown, Package, ImagePlus } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';
import { inr } from '../lib/money';

const STATUSES = ['Active', 'Out of Stock'];

const STATUS_TO_API = { 'Active': 'active', 'Out of Stock': 'out_of_stock' };
const API_TO_STATUS = { 'active': 'Active', 'out_of_stock': 'Out of Stock' };

export default function SellerInventory() {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resubmittingId, setResubmittingId] = useState(null);
  const addToast = useToastStore((s) => s.addToast);

  const loadInventory = async () => {
    try {
      const res = await api.sellerProducts();
      setInventory(res.items.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category?.name ?? 'Uncategorized',
        price: Number(p.price ?? 0),
        discount: Number(p.discount_percent ?? 0),
        stock: Number(p.stock ?? 0),
        status: API_TO_STATUS[p.status] ?? 'Active',
        approvalStatus: p.approvalStatus ?? 'approved',
        rejectionReason: p.rejectionReason ?? null,
        description: p.description || '',
        images: p.images?.map((i) => i.url) ?? [],
      })));
    } catch (err) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const cats = await api.categories();
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      } catch {
        // categories are a nicety for the add form; non-fatal
      }
    })();
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddProduct = async ({ name, category, price, discount, stock, status, description, images }) => {
    setBusy(true);
    try {
      const categoryId = categories.find((c) => c.name === category)?.id ?? null;
      const created = await api.createProduct({
        name,
        description,
        price,
        discount_percent: discount,
        stock,
        status: STATUS_TO_API[status] ?? 'active',
        category_id: categoryId,
      });
      const files = images.filter((i) => i.file).map((i) => i.file);
      if (files.length) {
        await api.uploadProductImages(created.id, files);
      }
      setModalOpen(false);
      addToast(`"${name}" added to your inventory!`, 'success');
      await loadInventory();
    } catch (err) {
      addToast(err.message || 'Failed to add product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleEditProduct = async (id, { name, category, price, discount, stock, status, description, images }) => {
    setBusy(true);
    try {
      const categoryId = categories.find((c) => c.name === category)?.id ?? null;
      await api.updateProduct(id, {
        name,
        description,
        price,
        discount_percent: discount,
        stock,
        status: STATUS_TO_API[status] ?? 'active',
        category_id: categoryId,
      });
      const files = images.filter((i) => i.file).map((i) => i.file);
      if (files.length) {
        await api.uploadProductImages(id, files);
      }
      setModalOpen(false);
      setEditing(null);
      addToast(`"${name}" updated!`, 'success');
      await loadInventory();
    } catch (err) {
      addToast(err.message || 'Failed to update product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openModal = (item = null) => {
    setEditing(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    const item = inventory.find((i) => i.id === id);
    setBusy(true);
    try {
      await api.deleteProduct(id);
      setInventory((prev) => prev.filter((i) => i.id !== id));
      addToast(`"${item ? item.name : 'Product'}" removed from inventory.`, 'error');
    } catch (err) {
      addToast(err.message || 'Failed to delete product.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResubmit = async (item) => {
    if (resubmittingId) return;
    setResubmittingId(item.id);
    try {
      await api.resubmitProduct(item.id);
      addToast(`"${item.name}" resubmitted for approval.`, 'success');
      await loadInventory();
    } catch (err) {
      addToast(err.message || 'Failed to resubmit product.', 'error');
    } finally {
      setResubmittingId(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? inventory.filter(
        (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || String(i.id) === q
      )
    : inventory;

  const getApprovalBadge = (approval) => {
    switch (approval) {
      case 'approved':
        return <span className="flex items-center gap-1.5 text-[#E0A11C] bg-[#B7322A]/10 border border-[#B7322A]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="flex items-center gap-1.5 text-[#B3261E] bg-[#FBE3E1]/20 border border-[#B3261E]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="flex items-center gap-1.5 text-[#C8901A] bg-[#B8860B]/20 border border-[#C8901A]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="font-[Outfit] text-2xl sm:text-4xl font-bold text-[#231A16] mb-2 text-glow">Inventory Management</h1>
          <p className="text-[#7A6A5B]">Manage your product listings, update stock levels, and add new items.</p>
        </div>
      <button
        onClick={() => openModal()}
        className="py-3 px-6 rounded-lg bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] font-[Outfit] text-base font-semibold hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all flex items-center justify-center gap-2 w-full md:w-auto"
      >
          <PlusCircle size={20} /> Add New Product
        </button>
      </header>

      <GlassCard className="p-6 md:p-8" hover={false}>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 pb-6 border-b border-[#231a16]/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5B]" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name, category or ID..."
              className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all"
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto items-center">
            <span className="text-xs text-[#8A7B6B] whitespace-nowrap hidden md:block">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F0E7DA]/50 border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading inventory...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 text-[#B3261E]">{error}</div>
        ) : (
        /* Inventory Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-[#231a16]/10 text-[#7A6A5B] text-xs uppercase tracking-wider bg-[#FDF8F0]/30">
                <th className="py-4 px-4 font-semibold rounded-tl-lg">Product Name</th>
                <th className="py-4 px-4 font-semibold">Category</th>
                <th className="py-4 px-4 font-semibold text-right">Price</th>
                <th className="py-4 px-4 font-semibold text-center">Stock Level</th>
                <th className="py-4 px-4 font-semibold">Status</th>
                <th className="py-4 px-4 font-semibold text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const finalPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
                return (
                  <tr key={item.id} className="border-b border-[#231a16]/5 hover:bg-[#231a16]/5 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#FDF8F0]/60 border border-[#231a16]/10 flex items-center justify-center shrink-0">
                          {item.images && item.images[0]
                            ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                            : <Package size={18} className="text-[#C4B5A2]" />}
                        </div>
                        <span className="font-[Outfit] text-base font-semibold text-[#2A211B]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[#7A6A5B] text-sm">{item.category}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[#B7322A] font-semibold">{inr(finalPrice)}</span>
                        {item.discount > 0 && (
                          <span className="text-[10px] text-[#7A6A5B] flex items-center gap-1">
                            <span className="line-through">{inr(item.price)}</span>
                            <span className="text-[#E0A11C] font-bold">-{item.discount}%</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={item.stock === 0 ? 'text-[#B3261E] font-semibold' : 'text-[#231A16]'}>{item.stock}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {getApprovalBadge(item.approvalStatus)}
                        {item.status === 'Out of Stock' && (
                          <span className="text-[10px] text-[#8A7B6B] uppercase tracking-wider">Out of stock</span>
                        )}
                        {item.approvalStatus === 'rejected' && item.rejectionReason && (
                          <span className="text-[10px] text-[#B3261E]/80 max-w-[220px]">{item.rejectionReason}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.approvalStatus === 'rejected' && (
                          <button
                            onClick={() => handleResubmit(item)}
                            disabled={resubmittingId === item.id}
                            className="px-3 py-1.5 rounded-lg bg-[#B7322A]/10 text-[#B7322A] hover:bg-[#B7322A]/20 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                            title="Resubmit for approval"
                          >
                            {resubmittingId === item.id ? '...' : 'Resubmit'}
                          </button>
                        )}
                        <button onClick={() => openModal(item)} className="p-2 rounded-lg bg-[#B7322A]/10 text-[#B7322A] hover:bg-[#B7322A]/20 transition-colors" title="Edit Product">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-[#B3261E]/10 text-[#B3261E] hover:bg-[#B3261E]/20 transition-colors" title="Delete Product">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Package size={40} className="mx-auto text-[#C4B5A2] mb-3" />
                    <p className="text-[#7A6A5B]">
                      {query ? `No products match "${query}".` : 'No products yet. Click "Add New Product" to get started.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

      </GlassCard>

      {modalOpen && (
        <ProductFormModal
          categories={categories}
          busy={busy}
          product={editing}
          onClose={closeModal}
          onSubmit={editing ? (payload) => handleEditProduct(editing.id, payload) : handleAddProduct}
        />
      )}
    </div>
  );
}

function ProductFormModal({ categories = [], busy = false, product = null, onClose, onSubmit }) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(() => {
    const catName = product?.category;
    if (catName && categories.some((c) => c.name === catName)) return catName;
    return categories[0]?.name ?? '';
  });
  const [price, setPrice] = useState(product ? String(product.price ?? '') : '');
  const [discount, setDiscount] = useState(product ? String(product.discount ?? '') : '');
  const [stock, setStock] = useState(product ? String(product.stock ?? '') : '');
  const [status, setStatus] = useState(product?.status ?? 'Active');
  const [description, setDescription] = useState(product?.description ?? '');
  const [images, setImages] = useState(() =>
    (product?.images ?? []).map((url, idx) => ({ url, name: `image-${idx + 1}`, file: null }))
  );
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileInputRef = useRef(null);

  // Close on Escape + lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const addFiles = (fileList) => {
    const mapped = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({ url: URL.createObjectURL(f), name: f.name, file: f }));
    if (mapped.length) setImages((prev) => [...prev, ...mapped]);
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const priceNum = parseFloat(price) || 0;
  const discountNum = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const salePrice = priceNum * (1 - discountNum / 100);
  const nameValid = name.trim().length > 0;
  const priceValid = priceNum > 0;
  const canSubmit = nameValid && priceValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      category,
      price: priceNum,
      discount: discountNum,
      stock: parseInt(stock, 10) || 0,
      status,
      description: description.trim(),
      images,
    });
  };

  const inputClass = 'w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-lg py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]';
  const labelClass = 'block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add new product"
    >
      <GlassCard
        hover={false}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
      >
        {/* Stop backdrop-close when interacting inside the panel */}
        <form onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()} className="flex flex-col min-h-0">

          {/* Header */}
          <div className="shrink-0 flex items-start justify-between px-6 md:px-8 py-5 border-b border-[#231a16]/10">
            <div>
              <h2 className="font-[Outfit] text-2xl font-bold text-[#231A16] flex items-center gap-2">
                <PlusCircle className="text-[#B7322A]" size={24} /> {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-[#7A6A5B] text-xs mt-1">
                {isEdit ? 'Update the details of your listed item.' : 'Fill in the details to list a new item in your store.'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg text-[#7A6A5B] hover:text-[#231A16] hover:bg-[#231a16]/5 transition-colors" aria-label="Close">
              <X size={22} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 py-6 flex flex-col gap-5">

            {/* Image uploader */}
            <div>
              <label className={labelClass}>Product Images</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className={`cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-8 px-4 text-center transition-all ${dragging ? 'border-[#B7322A] bg-[#B7322A]/5' : 'border-[#231a16]/15 hover:border-[#B7322A]/40 hover:bg-white/[0.03]'}`}
              >
                <UploadCloud size={30} className="text-[#B7322A]" />
                <p className="text-sm text-[#2A211B] font-semibold">Drop images here or click to browse</p>
                <p className="text-[11px] text-[#8A7B6B]">PNG, JPG or WEBP — add as many as you like</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </div>

              {images.length > 0 && (
                <div className="flex gap-3 flex-wrap mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#231a16]/10 group/thumb">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-[#B3261E] hover:text-[#F7D5D2]"
                        aria-label={`Remove ${img.name}`}
                      >
                        <X size={12} />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-[#B7322A]/85 text-[#FDF8F0] text-[9px] font-bold text-center py-0.5 tracking-wider">COVER</span>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border border-dashed border-[#231a16]/15 flex items-center justify-center text-[#8A7B6B] hover:border-[#B7322A]/40 hover:text-[#B7322A] transition-colors"
                    aria-label="Add more images"
                  >
                    <ImagePlus size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>Product Name <span className="text-[#B3261E]">*</span></label>
              <input
                className={`${inputClass} ${touched && !nameValid ? 'border-[#B3261E]/60' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nova Pro X-15 Gaming Laptop"
              />
              {touched && !nameValid && <p className="text-[11px] text-[#B3261E] mt-1.5">Please enter a product name.</p>}
            </div>

            {/* Category + Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Category</label>
                <div className="relative">
                  <select className={`${inputClass} appearance-none pr-10 cursor-pointer`} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.length === 0 && <option value="">No categories</option>}
                    {categories.map((c) => <option key={c.id} value={c.name} className="bg-[#F5ECDE]">{c.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A5B] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Stock Quantity</label>
                <input type="number" min="0" className={inputClass} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Price + Discount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Price (INR) <span className="text-[#B3261E]">*</span></label>
                <input
                  type="number" min="0" step="0.01"
                  className={`${inputClass} ${touched && !priceValid ? 'border-[#B3261E]/60' : ''}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
                {touched && !priceValid && <p className="text-[11px] text-[#B3261E] mt-1.5">Enter a price greater than 0.</p>}
              </div>
              <div>
                <label className={labelClass}>Discount (%)</label>
                <input type="number" min="0" max="100" className={inputClass} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Live sale-price preview */}
            {priceValid && (
              <div className="flex flex-wrap items-center gap-2 -mt-1 text-sm bg-[#FDF8F0]/40 border border-[#231a16]/5 rounded-lg px-4 py-3">
                <span className="text-[#7A6A5B]">Customers pay</span>
                <span className="text-[#B7322A] font-[Outfit] font-bold text-lg">{inr(salePrice)}</span>
                {discountNum > 0 && (
                  <>
                    <span className="text-[#8A7B6B] line-through text-xs">{inr(priceNum)}</span>
                    <span className="text-[#E0A11C] text-xs bg-[#B7322A]/10 border border-[#B7322A]/20 px-2 py-0.5 rounded-full font-semibold">
                      save {inr(priceNum - salePrice)} ({discountNum}% off)
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <div className="relative md:w-1/2">
                <select className={`${inputClass} appearance-none pr-10 cursor-pointer`} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s} className="bg-[#F5ECDE]">{s}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A5B] pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={4}
                className={`${inputClass} resize-none`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product's key features, specs, and what makes it stand out..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 md:px-8 py-4 border-t border-[#231a16]/10 bg-[#FDF8F0]/30">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg border border-[#231a16]/10 text-[#2A211B] text-sm font-semibold hover:bg-[#231a16]/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || busy}
              className={`px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold flex items-center gap-2 transition-all ${canSubmit && !busy ? 'bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)]' : 'bg-[#F0E7DA]/50 text-[#8A7B6B] cursor-not-allowed'}`}
            >
              <PlusCircle size={18} /> {busy ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
