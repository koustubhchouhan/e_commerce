import { useState } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight, CheckCircle, Star, StarHalf, PackageX } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { products } from './Home';

export default function ProductDetails() {
  const { id } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();

  const product = products.find(p => String(p.id) === String(id));

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 animate-fade-in-up">
        <GlassCard className="p-12 max-w-md w-full text-center flex flex-col items-center gap-5" hover={false}>
          <PackageX size={56} className="text-[#34250f]" />
          <h1 className="font-[Outfit] text-3xl font-bold text-[#fff4e6]">Product not found</h1>
          <p className="text-[#cbb89d] text-sm">This item may have been removed or the link is incorrect.</p>
          <Link to="/home" className="mt-2 px-6 py-3 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] font-bold hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all">
            Back to Shop
          </Link>
        </GlassCard>
      </div>
    );
  }

  const images = [product.img];
  const hasGallery = images.length > 1;
  const savePct = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) addItem(product);
    addToast(`${product.title} added to cart!`, 'success');
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) addItem(product);
    navigate('/checkout');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-16 py-12 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">

        {/* Left: Image Slider */}
        <div className="flex flex-col gap-4">
          <GlassCard className="relative aspect-square flex items-center justify-center p-6 bg-[#100901]/50" hover={false}>
            <img src={images[activeImage]} alt={product.title} className="w-full h-full object-contain transition-opacity duration-500" />
            {hasGallery && (
              <>
                <button onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#221708]/80 backdrop-blur-md flex items-center justify-center text-[#ff9933] border border-white/10 hover:bg-[#3b2a14] transition-colors" aria-label="Previous image">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => setActiveImage((prev) => (prev + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#221708]/80 backdrop-blur-md flex items-center justify-center text-[#ff9933] border border-white/10 hover:bg-[#3b2a14] transition-colors" aria-label="Next image">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            {product.badge && (
              <span className="absolute top-6 left-6 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border bg-[#c98a12]/30 text-[#ffd27a] border-[#ffd27a]/30">
                {product.badge}
              </span>
            )}
          </GlassCard>
          {hasGallery && (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button key={idx} onClick={() => setActiveImage(idx)} className={`w-24 h-24 rounded-lg overflow-hidden shrink-0 transition-all ${activeImage === idx ? 'border-2 border-[#ff9933] opacity-100' : 'border border-white/10 opacity-60 hover:opacity-100'}`}>
                  <img src={img} alt={`${product.title} view ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <GlassCard className="p-10 flex flex-col" hover={false}>
          <div className="flex items-center gap-2 mb-4 text-[#ff7418]">
            <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><StarHalf size={16} fill="currentColor" />
            <span className="text-[#cbb89d] text-xs font-semibold tracking-wider ml-2">4.8 (124 Reviews)</span>
          </div>
          <span className="text-[#ff9933] text-xs font-bold uppercase tracking-widest mb-2">{product.category}</span>
          <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-4 leading-tight">{product.title}</h1>
          <div className="flex items-baseline gap-4 mb-8 pb-6 border-b border-white/10">
            <span className="font-[Outfit] text-4xl font-bold text-white">${product.price.toLocaleString()}</span>
            {product.oldPrice && <span className="text-[#cbb89d] text-lg line-through">${product.oldPrice.toLocaleString()}</span>}
            {savePct !== null && savePct > 0 && (
              <span className="ml-auto px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/30">SAVE {savePct}%</span>
            )}
          </div>
          <div className="mb-10">
            <h3 className="text-[#ff9933] font-[Outfit] text-xl font-semibold mb-3">Description</h3>
            <p className="text-[#cbb89d] text-base leading-relaxed">{product.desc}</p>
          </div>
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-6 mb-6">
              <span className="text-[#cbb89d] text-xs font-semibold tracking-wider uppercase">Quantity</span>
              <div className="flex items-center border border-[#4b3d2a] rounded-lg bg-[#221708] overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-[#f1e7d7] hover:bg-white/5 transition-colors" aria-label="Decrease quantity">-</button>
                <input type="number" value={qty} readOnly className="w-12 h-10 bg-transparent text-center text-[#f1e7d7] outline-none" aria-label="Quantity" />
                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center text-[#f1e7d7] hover:bg-white/5 transition-colors" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleAddToCart} className={`py-3.5 rounded-lg font-[Outfit] text-xl font-semibold flex items-center justify-center gap-2 transition-all border ${added ? 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] border-transparent' : 'bg-[#1a1307]/50 text-[#ff9933] border-[#ff9933] hover:bg-[#ff9933]/10'}`}>
                {added ? <><CheckCircle size={20} /> Added!</> : <><ShoppingCart size={20} /> Add to Cart</>}
              </button>
              <button onClick={handleBuyNow} className="py-3.5 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-xl font-semibold neon-glow hover:shadow-[0_0_14px_rgba(255,153,51,0.28)] transition-all">
                Buy Now
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Reviews */}
      <div>
        <h2 className="font-[Outfit] text-3xl font-bold text-[#fff4e6] mb-8">Customer Reviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReviewCard initials="JD" name="J. Doe" role="Verified Buyer" text="Incredible piece of hardware. The aesthetic perfectly matches my dark-mode setup, and the performance for data rendering is unmatched." stars={5} />
          <ReviewCard initials="SA" name="Sarah A." role="Tech Enthusiast" text="Runs slightly warmer than expected under full load, but the cooling system handles it gracefully. The build quality is phenomenally solid." stars={4.5} />
          <ReviewCard initials="MR" name="Mark R." role="Developer" text="Worth every penny. It integrated seamlessly into my existing architecture. The glass interface panels are a brilliant touch." stars={5} />
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ initials, name, role, text, stars }) {
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3b2a14] flex items-center justify-center text-[#ff9933] font-[Outfit] font-semibold border border-white/10 shrink-0">{initials}</div>
          <div>
            <div className="font-[Outfit] text-xl font-semibold text-[#f1e7d7]">{name}</div>
            <div className="text-[#cbb89d] text-xs font-semibold tracking-wider">{role}</div>
          </div>
        </div>
        <div className="flex gap-0.5 text-[#ff7418]">
          {[...Array(fullStars)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
          {hasHalfStar && <StarHalf size={16} fill="currentColor" />}
        </div>
      </div>
      <p className="text-[#cbb89d] text-sm leading-relaxed">{text}</p>
    </GlassCard>
  );
}
