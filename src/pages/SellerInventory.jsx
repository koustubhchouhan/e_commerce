import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Edit, Trash2, PlusCircle, CheckCircle, Clock, XCircle, X, UploadCloud, ChevronDown, Package, ImagePlus } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToastStore } from '../store/toastStore';

const CATEGORIES = ['Gaming', 'Audio', 'Wearables', 'Accessories', 'Components'];
const STATUSES = ['Active', 'Out of Stock', 'Pending Approval'];

const INITIAL_INVENTORY = [
  { id: 1, name: 'Nova Pro X-15 Gaming Laptop', category: 'Gaming', price: 2499, discount: 0, stock: 45, status: 'Active', description: '', images: [] },
  { id: 2, name: 'Aura Sound V2 Headphones', category: 'Audio', price: 349.99, discount: 0, stock: 0, status: 'Out of Stock', description: '', images: [] },
  { id: 3, name: 'ChronoSync Ultra Smartwatch', category: 'Wearables', price: 299, discount: 0, stock: 120, status: 'Active', description: '', images: [] },
  { id: 4, name: 'Quantum Core Q-7 GPU', category: 'Components', price: 1299, discount: 0, stock: 12, status: 'Pending Approval', description: '', images: [] },
  { id: 5, name: 'MechKeys K-900 Keyboard', category: 'Accessories', price: 159, discount: 0, stock: 85, status: 'Active', description: '', images: [] },
];

const formatPrice = (n) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SellerInventory() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const handleAddProduct = (product) => {
    const nextId = inventory.length ? Math.max(...inventory.map((i) => i.id)) + 1 : 1;
    setInventory((prev) => [{ id: nextId, ...product }, ...prev]);
    setModalOpen(false);
    addToast(`"${product.name}" added to your inventory!`, 'success');
  };

  const handleDelete = (id) => {
    const item = inventory.find((i) => i.id === id);
    setInventory((prev) => prev.filter((i) => i.id !== id));
    addToast(`"${item ? item.name : 'Product'}" removed from inventory.`, 'error');
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? inventory.filter(
        (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || String(i.id) === q
      )
    : inventory;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="flex items-center gap-1.5 text-[#ffbf66] bg-[#ff9933]/10 border border-[#ff9933]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"><CheckCircle size={12} /> Active</span>;
      case 'Out of Stock':
        return <span className="flex items-center gap-1.5 text-[#ffb4ab] bg-[#93000a]/20 border border-[#ffb4ab]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"><XCircle size={12} /> Out of Stock</span>;
      case 'Pending Approval':
        return <span className="flex items-center gap-1.5 text-[#ffd27a] bg-[#c98a12]/20 border border-[#ffd27a]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"><Clock size={12} /> Pending</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Inventory Management</h1>
          <p className="text-[#cbb89d]">Manage your product listings, update stock levels, and add new items.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="py-3 px-6 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-base font-semibold hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <PlusCircle size={20} /> Add New Product
        </button>
      </header>

      <GlassCard className="p-6 md:p-8" hover={false}>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 pb-6 border-b border-white/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cbb89d]" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name, category or ID..."
              className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all"
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto items-center">
            <span className="text-xs text-[#9e8c73] whitespace-nowrap hidden md:block">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#34250f]/50 border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider bg-[#100901]/30">
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
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#100901]/60 border border-white/10 flex items-center justify-center shrink-0">
                          {item.images && item.images[0]
                            ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                            : <Package size={18} className="text-[#4b3d2a]" />}
                        </div>
                        <span className="font-[Outfit] text-base font-semibold text-[#f1e7d7]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[#cbb89d] text-sm">{item.category}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[#ff9933] font-semibold">{formatPrice(finalPrice)}</span>
                        {item.discount > 0 && (
                          <span className="text-[10px] text-[#cbb89d] flex items-center gap-1">
                            <span className="line-through">{formatPrice(item.price)}</span>
                            <span className="text-[#ffbf66] font-bold">-{item.discount}%</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={item.stock === 0 ? 'text-[#ffb4ab] font-semibold' : 'text-[#fff4e6]'}>{item.stock}</span>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-lg bg-[#ff9933]/10 text-[#ff9933] hover:bg-[#ff9933]/20 transition-colors" title="Edit Product">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab]/20 transition-colors" title="Delete Product">
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
                    <Package size={40} className="mx-auto text-[#4b3d2a] mb-3" />
                    <p className="text-[#cbb89d]">
                      {query ? `No products match "${query}".` : 'No products yet. Click "Add New Product" to get started.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </GlassCard>

      {modalOpen && <AddProductModal onClose={() => setModalOpen(false)} onAdd={handleAddProduct} />}
    </div>
  );
}

function AddProductModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('Active');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]); // [{ url, name }]
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
      .map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
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
    onAdd({
      name: name.trim(),
      category,
      price: priceNum,
      discount: discountNum,
      stock: parseInt(stock, 10) || 0,
      status,
      description: description.trim(),
      images: images.map((i) => i.url),
    });
  };

  const inputClass = 'w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all placeholder:text-[#6f6048]';
  const labelClass = 'block text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2';

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
          <div className="shrink-0 flex items-start justify-between px-6 md:px-8 py-5 border-b border-white/10">
            <div>
              <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] flex items-center gap-2">
                <PlusCircle className="text-[#ff9933]" size={24} /> Add New Product
              </h2>
              <p className="text-[#cbb89d] text-xs mt-1">Fill in the details to list a new item in your store.</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 transition-colors" aria-label="Close">
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
                className={`cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-8 px-4 text-center transition-all ${dragging ? 'border-[#ff9933] bg-[#ff9933]/5' : 'border-white/15 hover:border-[#ff9933]/40 hover:bg-white/[0.03]'}`}
              >
                <UploadCloud size={30} className="text-[#ff9933]" />
                <p className="text-sm text-[#f1e7d7] font-semibold">Drop images here or click to browse</p>
                <p className="text-[11px] text-[#9e8c73]">PNG, JPG or WEBP — add as many as you like</p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </div>

              {images.length > 0 && (
                <div className="flex gap-3 flex-wrap mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group/thumb">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-[#ffb4ab] hover:text-[#690005]"
                        aria-label={`Remove ${img.name}`}
                      >
                        <X size={12} />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-[#ff9933]/85 text-[#2e1800] text-[9px] font-bold text-center py-0.5 tracking-wider">COVER</span>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border border-dashed border-white/15 flex items-center justify-center text-[#9e8c73] hover:border-[#ff9933]/40 hover:text-[#ff9933] transition-colors"
                    aria-label="Add more images"
                  >
                    <ImagePlus size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>Product Name <span className="text-[#ffb4ab]">*</span></label>
              <input
                className={`${inputClass} ${touched && !nameValid ? 'border-[#ffb4ab]/60' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nova Pro X-15 Gaming Laptop"
              />
              {touched && !nameValid && <p className="text-[11px] text-[#ffb4ab] mt-1.5">Please enter a product name.</p>}
            </div>

            {/* Category + Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Category</label>
                <div className="relative">
                  <select className={`${inputClass} appearance-none pr-10 cursor-pointer`} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#1c1206]">{c}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#cbb89d] pointer-events-none" />
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
                <label className={labelClass}>Price (USD) <span className="text-[#ffb4ab]">*</span></label>
                <input
                  type="number" min="0" step="0.01"
                  className={`${inputClass} ${touched && !priceValid ? 'border-[#ffb4ab]/60' : ''}`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
                {touched && !priceValid && <p className="text-[11px] text-[#ffb4ab] mt-1.5">Enter a price greater than 0.</p>}
              </div>
              <div>
                <label className={labelClass}>Discount (%)</label>
                <input type="number" min="0" max="100" className={inputClass} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Live sale-price preview */}
            {priceValid && (
              <div className="flex flex-wrap items-center gap-2 -mt-1 text-sm bg-[#100901]/40 border border-white/5 rounded-lg px-4 py-3">
                <span className="text-[#cbb89d]">Customers pay</span>
                <span className="text-[#ff9933] font-[Outfit] font-bold text-lg">{formatPrice(salePrice)}</span>
                {discountNum > 0 && (
                  <>
                    <span className="text-[#9e8c73] line-through text-xs">{formatPrice(priceNum)}</span>
                    <span className="text-[#ffbf66] text-xs bg-[#ff9933]/10 border border-[#ff9933]/20 px-2 py-0.5 rounded-full font-semibold">
                      save {formatPrice(priceNum - salePrice)} ({discountNum}% off)
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
                  {STATUSES.map((s) => <option key={s} value={s} className="bg-[#1c1206]">{s}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#cbb89d] pointer-events-none" />
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
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 md:px-8 py-4 border-t border-white/10 bg-[#100901]/30">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold flex items-center gap-2 transition-all ${canSubmit ? 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)]' : 'bg-[#34250f]/50 text-[#6f6048] cursor-not-allowed'}`}
            >
              <PlusCircle size={18} /> Add Product
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
