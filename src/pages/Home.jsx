import { useEffect, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { inr } from '../lib/money';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';
import { toProductCardList } from '../lib/productShape';

// Built-in color treatments an admin can pick for a hero slide.
const SLIDE_THEMES = {
  orange: {
    accent: 'text-[#B7322A]',
    button: 'bg-[#B7322A] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)]',
  },
  gold: {
    accent: 'text-[#C8901A]',
    button: 'bg-[#C8901A] text-[#231A16] hover:shadow-[0_0_9px_rgba(224,161,28,0.22)]',
  },
};

export function ProductGrid({ items, adminMode = false, adminOnDelete }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map(product => (
        <ProductCard key={product.id} {...product} adminMode={adminMode} adminOnDelete={adminOnDelete} />
      ))}
    </div>
  );
}

function ProductCard({ id, title, price, oldPrice, desc, img, badge, badgeColor, storeName, adminMode, adminOnDelete }) {
  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);
  const [added, setAdded] = useState(false);

  const badgeColors = {
    secondary: 'bg-[#B8860B]/30 text-[#C8901A] border-[#C8901A]/30',
    error: 'bg-[#B3261E]/20 text-[#B3261E] border-[#B3261E]/30'
  };

  const handleAdd = () => {
    addItem({ id, title, price, img, storeName });
    addToast(`${title} added to cart!`, 'success');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <GlassCard className="flex flex-col group overflow-hidden relative">
      <div className="relative h-[220px] bg-[#FDF8F0]/50 p-4">
        <Link to={`/product/${id}`}>
          <img src={img} alt={title} className="w-full h-full object-cover rounded-xl border border-[#231a16]/5 transition-transform duration-700 group-hover:scale-105" />
        </Link>
        {badge && (
          <span className={`absolute top-6 left-6 px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <Link to={`/product/${id}`} className="font-[Outfit] text-lg font-semibold text-[#2A211B] hover:text-[#B7322A] transition-colors line-clamp-1">
            {title}
          </Link>
          <div className="flex flex-col items-end shrink-0 pl-2">
            <span className="font-[Outfit] text-lg font-semibold text-[#231A16]">{inr(price)}</span>
            {oldPrice && <span className="text-[#7A6A5B] text-[10px] line-through">{inr(oldPrice)}</span>}
          </div>
        </div>
        {storeName && <p className="text-xs text-[#8A7B6B] font-[Inter] tracking-[0.05em] uppercase mb-1">by {storeName}</p>}
        <p className="text-[#7A6A5B] text-xs leading-relaxed mb-4 line-clamp-2 flex-1">
          {desc}
        </p>
        
        {adminMode ? (
          <button
            onClick={() => adminOnDelete?.(id)}
            className="w-full py-2.5 rounded-lg bg-[#FBE3E1]/20 border border-[#B3261E]/30 text-[#B3261E] text-xs font-semibold tracking-wider hover:bg-[#FBE3E1]/40 transition-colors mt-auto"
          >
            Remove Product
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold tracking-wider flex items-center justify-center gap-2 mt-auto transition-all ${added ? 'bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] border-transparent' : 'bg-[#F0E7DA]/50 border border-[#B7322A]/30 text-[#231A16] hover:bg-gradient-to-br hover:from-[#B7322A] hover:to-[#8F2620] hover:text-[#FDF8F0] hover:border-transparent'}`}
          >
            {added ? <><CheckCircle size={16} /> Added!</> : <><ShoppingCart size={16} /> Add to Cart</>}
          </button>
        )}
      </div>
    </GlassCard>
  );
}

export default function Home() {
  const sliderRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const [products, setProducts] = useState([]);
  const [slides, setSlides] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [productRes, categoryRes] = await Promise.all([
          api.products({ page: 1, limit: PAGE_SIZE }),
          api.categories(),
        ]);
        if (cancelled) return;
        setProducts(toProductCardList(productRes.items));
        setTotal(productRes.total ?? 0);
        setPage(productRes.page ?? 1);
        setCategories(['All', ...categoryRes.map((c) => c.name)]);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hero slides are optional storefront content; load them separately so a
  // missing or failing slides endpoint never blocks the product catalog.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.heroSlides();
        if (!cancelled) setSlides(res.items ?? []);
      } catch {
        if (!cancelled) setSlides([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.products({ page: page + 1, limit: PAGE_SIZE });
      setProducts((prev) => [...prev, ...toProductCardList(res.items)]);
      setTotal(res.total ?? total);
      setPage(res.page ?? page + 1);
    } catch (err) {
      setError(err.message || 'Failed to load more products.');
    } finally {
      setLoadingMore(false);
    }
  };

  // The URL's ?category= param is the single source of truth for the active filter
  const paramCategory = searchParams.get('category');
  const activeCategory = paramCategory && categories.includes(paramCategory) ? paramCategory : 'All';

  const setActiveCategory = (cat) => {
    setSearchParams(cat === 'All' ? {} : { category: cat }, { replace: true });
  };

  const filtered = activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sliderRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          sliderRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col animate-fade-in-up overflow-hidden">
      {/* ══ Mobile Search ══ */}
      <section className="px-6 pt-6 md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A6A5B]" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search products..."
            className="w-full bg-[#F5ECDE]/70 border border-[#231a16]/10 rounded-full py-3 pl-11 pr-4 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] transition-all placeholder:text-[#8A7B6B]"
          />
        </div>
      </section>

      {/* ══ Slider Section ══ */}
      {slides.length > 0 && (
        <section className="w-full pt-10 px-8 pb-12">
          <div ref={sliderRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6 scroll-smooth">
            {slides.map((slide) => {
              const theme = SLIDE_THEMES[slide.theme] ?? SLIDE_THEMES.orange;
              const isExternal = /^https?:\/\//i.test(slide.buttonLink || '');
              const buttonClass = `w-fit ${theme.button} px-8 py-3 rounded-full font-bold transition-shadow`;
              return (
                <div key={slide.id} className="shrink-0 w-[85vw] md:w-[60vw] h-[350px] snap-center rounded-3xl relative overflow-hidden group">
                  <img src={slide.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={slide.title} />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FDF8F0]/90 via-[#FDF8F0]/50 to-transparent" />
                  <div className="absolute inset-0 p-12 flex flex-col justify-center">
                    {slide.eyebrow && (
                      <span className={`${theme.accent} font-bold tracking-widest text-xs uppercase mb-4`}>{slide.eyebrow}</span>
                    )}
                    <h2 className="text-glow font-[Outfit] text-5xl font-bold text-[#231A16] mb-4 max-w-lg">{slide.title}</h2>
                    {slide.description && <p className="text-[#7A6A5B] max-w-md mb-8">{slide.description}</p>}
                    {slide.buttonLabel && (
                      isExternal ? (
                        <a href={slide.buttonLink} target="_blank" rel="noopener noreferrer" className={buttonClass}>{slide.buttonLabel}</a>
                      ) : (
                        <Link to={slide.buttonLink || '/'} className={buttonClass}>{slide.buttonLabel}</Link>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ Main Product Grid ══ */}
      <section className={`flex-1 px-6 md:px-12 pb-24 ${slides.length === 0 ? 'pt-8 md:pt-10' : ''}`}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#231A16]">Discover Products</h2>
            <p className="text-[#7A6A5B] text-sm mt-1">Browse our entire futuristic catalog.</p>
          </div>
          {/* Category Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#B7322A]/20 text-[#B7322A] border-[#B7322A]/40'
                    : 'text-[#7A6A5B] border-[#231a16]/10 hover:text-[#2A211B] hover:border-[#231a16]/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading products...</div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center h-40 text-[#B3261E]">{error}</div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <>
            <ProductGrid items={filtered} adminMode={false} />
            {filtered.length < total && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 rounded-full border border-[#B7322A]/40 text-[#B7322A] text-sm font-bold tracking-wider hover:bg-[#B7322A]/10 hover:shadow-[0_0_9px_rgba(183,50,42,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading more...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center h-40 text-[#7A6A5B]">No products in this category.</div>
        )}
      </section>
    </div>
  );
}
