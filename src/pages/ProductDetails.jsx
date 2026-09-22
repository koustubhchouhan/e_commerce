import { useEffect, useState } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight, CheckCircle, Star, StarHalf, PackageX, MessageCircle } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { toProductCard } from '../lib/productShape';
import { inr } from '../lib/money';

export default function ProductDetails() {
  const { id } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState('');
  const [canReview, setCanReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReviewLoading(true);
      setReviewError('');
      try {
        const res = await api.productReviews(id);
        if (!cancelled) setReviews(res.items ?? []);
      } catch (err) {
        if (!cancelled) setReviewError(err?.message || 'Could not load reviews.');
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.reviewEligibility(id);
        if (!cancelled) setCanReview(Boolean(res.canReview));
      } catch {
        if (!cancelled) setCanReview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const p = await api.product(id);
        if (!cancelled) {
          setProduct({
            ...toProductCard(p),
            images: (p.images && p.images.length ? p.images : [{ url: p.coverImage }]).map((i) => i.url),
          });
        }
      } catch (err) {
        if (!cancelled && err.status === 404) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 animate-fade-in-up">
        <div className="text-[#7A6A5B]">Loading product...</div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 animate-fade-in-up">
        <GlassCard className="p-12 max-w-md w-full text-center flex flex-col items-center gap-5" hover={false}>
          <PackageX size={56} className="text-[#F0E7DA]" />
          <h1 className="font-[Outfit] text-3xl font-bold text-[#231A16]">Product not found</h1>
          <p className="text-[#7A6A5B] text-sm">This item may have been removed or the link is incorrect.</p>
          <Link to="/home" className="mt-2 px-6 py-3 rounded-lg bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] font-[Outfit] font-bold hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all">
            Back to Shop
          </Link>
        </GlassCard>
      </div>
    );
  }

  const images = product.images && product.images.length ? product.images : [product.img];
  const hasGallery = images.length > 1;
  const savePct = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null;
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const reviewSummary = avgRating > 0
    ? `${avgRating.toFixed(1)} (${reviews.length} ${reviews.length === 1 ? 'Review' : 'Reviews'})`
    : 'No reviews yet';

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      const created = await api.createProductReview(id, { rating, comment: comment.trim() });
      setReviews((prev) => {
        const idx = prev.findIndex((r) => r.userId === created.userId);
        const next = [...prev];
        if (idx >= 0) next[idx] = created;
        else next.unshift(created);
        return next;
      });
      setRating(0);
      setComment('');
      addToast('Thanks! Your review was posted.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to post review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          <GlassCard className="relative w-full max-w-[560px] mx-auto aspect-square flex items-center justify-center p-6 bg-[#FDF8F0]/50" hover={false}>
            <img src={images[activeImage]} alt={product.title} className="w-full h-full object-contain transition-opacity duration-500" />
            {hasGallery && (
              <>
                <button onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#F5ECDE]/80 backdrop-blur-md flex items-center justify-center text-[#B7322A] border border-[#231a16]/10 hover:bg-[#EDE2D2] transition-colors" aria-label="Previous image">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => setActiveImage((prev) => (prev + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#F5ECDE]/80 backdrop-blur-md flex items-center justify-center text-[#B7322A] border border-[#231a16]/10 hover:bg-[#EDE2D2] transition-colors" aria-label="Next image">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            {product.badge && (
              <span className="absolute top-6 left-6 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border bg-[#B8860B]/30 text-[#C8901A] border-[#C8901A]/30">
                {product.badge}
              </span>
            )}
          </GlassCard>
          {hasGallery && (
            <div className="flex gap-4 overflow-x-auto pb-1 w-full max-w-[560px] mx-auto">
              {images.map((img, idx) => (
                <button key={idx} onClick={() => setActiveImage(idx)} className={`w-24 h-24 rounded-lg overflow-hidden shrink-0 transition-all ${activeImage === idx ? 'border-2 border-[#B7322A] opacity-100' : 'border border-[#231a16]/10 opacity-60 hover:opacity-100'}`}>
                  <img src={img} alt={`${product.title} view ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <GlassCard className="p-10 flex flex-col" hover={false}>
          <div className="flex items-center gap-2 mb-4 text-[#8F2620]">
            <StarRating value={avgRating} />
            <span className="text-[#7A6A5B] text-xs font-semibold tracking-wider ml-2">{reviewSummary}</span>
          </div>
          <span className="text-[#B7322A] text-xs font-bold uppercase tracking-widest mb-2">{product.category}</span>
          <h1 className="font-[Outfit] text-4xl font-bold text-[#231A16] mb-4 leading-tight">{product.title}</h1>
          <div className="flex items-baseline gap-4 mb-8 pb-6 border-b border-[#231a16]/10">
            <span className="font-[Outfit] text-4xl font-bold text-[#231A16]">{inr(product.price)}</span>
            {product.oldPrice && <span className="text-[#7A6A5B] text-lg line-through">{inr(product.oldPrice)}</span>}
            {savePct !== null && savePct > 0 && (
              <span className="ml-auto px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-[#B7322A]/20 text-[#B7322A] border border-[#B7322A]/30">SAVE {savePct}%</span>
            )}
          </div>
          <div className="mb-10">
            <h3 className="text-[#B7322A] font-[Outfit] text-xl font-semibold mb-3">Description</h3>
            <p className="text-[#7A6A5B] text-base leading-relaxed">{product.desc}</p>
          </div>
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-6 mb-6">
              <span className="text-[#7A6A5B] text-xs font-semibold tracking-wider uppercase">Quantity</span>
              <div className="flex items-center border border-[#C4B5A2] rounded-lg bg-[#F5ECDE] overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-[#2A211B] hover:bg-[#231a16]/5 transition-colors" aria-label="Decrease quantity">-</button>
                <input type="number" value={qty} readOnly className="w-12 h-10 bg-transparent text-center text-[#2A211B] outline-none" aria-label="Quantity" />
                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center text-[#2A211B] hover:bg-[#231a16]/5 transition-colors" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleAddToCart} className={`py-3.5 rounded-lg font-[Outfit] text-xl font-semibold flex items-center justify-center gap-2 transition-all border ${added ? 'bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] border-transparent' : 'bg-[#F5ECDE]/50 text-[#B7322A] border-[#B7322A] hover:bg-[#B7322A]/10'}`}>
                {added ? <><CheckCircle size={20} /> Added!</> : <><ShoppingCart size={20} /> Add to Cart</>}
              </button>
              <button onClick={handleBuyNow} className="py-3.5 rounded-lg bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] font-[Outfit] text-xl font-semibold neon-glow hover:shadow-[0_0_14px_rgba(183,50,42,0.28)] transition-all">
                Buy Now
              </button>
            </div>
            {userRole === 'customer' && product.storeName && (
              <Link
                to={`/contact?product=${product.id}`}
                className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-[#7A6A5B] border border-[#231a16]/10 hover:text-[#B7322A] hover:border-[#B7322A]/40 transition-colors"
              >
                <MessageCircle size={16} /> Ask {product.storeName} a question
              </Link>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Reviews */}
      <div>
        <h2 className="font-[Outfit] text-3xl font-bold text-[#231A16] mb-8">Customer Reviews</h2>

        {/* Write a review — the form is only shown to verified buyers */}
        {!isLoggedIn ? (
          <p className="text-[#7A6A5B] text-sm mb-8">
            <Link to="/login" className="text-[#B7322A] font-semibold hover:underline">Sign in</Link> to leave a review.
          </p>
        ) : canReview === null ? (
          <p className="text-[#7A6A5B] text-sm mb-8">Checking your review eligibility...</p>
        ) : !canReview ? (
          <div className="bg-[#F0E7DA]/30 p-6 rounded-lg border border-dashed border-[#231a16]/10 text-sm text-[#7A6A5B] mb-8">
            Only verified buyers can review this product. Once your order is delivered, you'll be able to share your experience here.
          </div>
        ) : (
          <GlassCard className="p-6 mb-8" hover={false}>
            <h3 className="font-[Outfit] text-xl font-semibold text-[#2A211B] mb-1">Write a Review</h3>
            <p className="text-[#8A7B6B] text-xs mb-4">You purchased this product — share your experience.</p>
            <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
              <div>
                <span className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Your Rating</span>
                <div className="flex gap-1 text-[#8F2620]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n === 1 ? '' : 's'}`}
                      className="transition-transform hover:scale-110"
                    >
                      <Star size={28} fill={n <= rating ? 'currentColor' : 'none'} className={n <= rating ? '' : 'text-[#C4B5A2]'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[#7A6A5B] text-xs font-semibold uppercase tracking-wider mb-2">Your Review</label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you think of this product?"
                  className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-lg py-2.5 px-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all resize-none placeholder:text-[#8A7B6B]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={rating < 1 || submitting}
                  className={`px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold transition-all ${rating >= 1 && !submitting ? 'bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)]' : 'bg-[#F0E7DA]/50 text-[#8A7B6B] cursor-not-allowed'}`}
                >
                  {submitting ? 'Posting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </GlassCard>
        )}

        {reviewLoading ? (
          <div className="flex items-center justify-center h-32 text-[#7A6A5B]">Loading reviews...</div>
        ) : reviewError ? (
          <div className="bg-[#F7D5D2]/20 p-8 rounded-lg border border-[#B3261E]/30 text-center text-[#B3261E] text-sm">
            {reviewError}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-[#F0E7DA]/30 p-8 rounded-lg border border-dashed border-[#231a16]/10 text-center text-[#8A7B6B] text-sm">
            No reviews yet — be the first to review this product.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                initials={(r.author || 'A').slice(0, 1).toUpperCase()}
                name={r.author}
                role={r.createdAt ? `Reviewed ${new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Verified Buyer'}
                text={r.comment || 'This customer did not leave a written comment.'}
                stars={r.rating}
                sellerReply={r.sellerReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StarRating({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <>
      {[...Array(5)].map((_, i) => {
        if (i < full) return <Star key={i} size={16} fill="currentColor" />;
        if (i === full && half) return <StarHalf key={i} size={16} fill="currentColor" />;
        return <Star key={i} size={16} className="text-[#C4B5A2]" />;
      })}
    </>
  );
}

function ReviewCard({ initials, name, role, text, stars, sellerReply }) {
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 !== 0;
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EDE2D2] flex items-center justify-center text-[#B7322A] font-[Outfit] font-semibold border border-[#231a16]/10 shrink-0">{initials}</div>
          <div>
            <div className="font-[Outfit] text-xl font-semibold text-[#2A211B]">{name}</div>
            <div className="text-[#7A6A5B] text-xs font-semibold tracking-wider">{role}</div>
          </div>
        </div>
        <div className="flex gap-0.5 text-[#8F2620]">
          {[...Array(fullStars)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
          {hasHalfStar && <StarHalf size={16} fill="currentColor" />}
        </div>
      </div>
      <p className="text-[#7A6A5B] text-sm leading-relaxed">{text}</p>
      {sellerReply && (
        <div className="mt-4 pt-4 border-t border-[#231a16]/10">
          <div className="flex items-center gap-2 text-[#B7322A] text-xs font-semibold uppercase tracking-wider mb-2">
            <MessageCircle size={14} /> Store Reply
          </div>
          <p className="text-[#7A6A5B] text-sm leading-relaxed">{sellerReply}</p>
        </div>
      )}
    </GlassCard>
  );
}
