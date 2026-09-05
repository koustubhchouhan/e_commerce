import { useEffect, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { api } from '../lib/api';
import { toProductCardList } from '../lib/productShape';

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
    secondary: 'bg-[#c98a12]/30 text-[#ffd27a] border-[#ffd27a]/30',
    error: 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30'
  };

  const handleAdd = () => {
    addItem({ id, title, price, img, storeName });
    addToast(`${title} added to cart!`, 'success');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <GlassCard className="flex flex-col group overflow-hidden relative">
      <div className="relative h-[220px] bg-[#100901]/50 p-4">
        <Link to={`/product/${id}`}>
          <img src={img} alt={title} className="w-full h-full object-cover rounded-xl border border-white/5 transition-transform duration-700 group-hover:scale-105" />
        </Link>
        {badge && (
          <span className={`absolute top-6 left-6 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <Link to={`/product/${id}`} className="font-[Outfit] text-lg font-semibold text-[#f1e7d7] hover:text-[#ff9933] transition-colors line-clamp-1">
            {title}
          </Link>
          <div className="flex flex-col items-end shrink-0 pl-2">
            <span className="font-[Outfit] text-lg font-semibold text-[#fff4e6]">${price}</span>
            {oldPrice && <span className="text-[#cbb89d] text-[10px] line-through">${oldPrice}</span>}
          </div>
        </div>
        {storeName && <p className="text-[10px] text-[#9e8c73] font-[Inter] tracking-[0.05em] uppercase mb-1">by {storeName}</p>}
        <p className="text-[#cbb89d] text-xs leading-relaxed mb-4 line-clamp-2 flex-1">
          {desc}
        </p>
        
        {adminMode ? (
          <button
            onClick={() => adminOnDelete?.(id)}
            className="w-full py-2.5 rounded-lg bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs font-semibold tracking-wider hover:bg-[#93000a]/40 transition-colors mt-auto"
          >
            Remove Product
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold tracking-wider flex items-center justify-center gap-2 mt-auto transition-all ${added ? 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] border-transparent' : 'bg-[#34250f]/50 border border-[#ff9933]/30 text-[#fff4e6] hover:bg-gradient-to-br hover:from-[#ff9933] hover:to-[#ff7418] hover:text-[#2e1800] hover:border-transparent'}`}
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
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
      {/* ══ Slider Section ══ */}
      <section className="w-full pt-10 px-8 pb-12">
        <div ref={sliderRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6 scroll-smooth">
          
          <div className="shrink-0 w-[85vw] md:w-[60vw] h-[350px] snap-center rounded-3xl relative overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=1600" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Audio" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#100901]/90 via-[#100901]/50 to-transparent" />
            <div className="absolute inset-0 p-12 flex flex-col justify-center">
              <span className="text-[#ff9933] font-bold tracking-widest text-xs uppercase mb-4">New Arrivals</span>
              <h2 className="text-glow font-[Outfit] text-5xl font-bold text-white mb-4 max-w-lg">Next-Gen Audio Experience</h2>
              <p className="text-[#cbb89d] max-w-md mb-8">Discover our new line of quantum-processed wireless earbuds.</p>
              <button className="w-fit bg-[#ff9933] text-[#2e1800] px-8 py-3 rounded-full font-bold hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-shadow">Shop Now</button>
            </div>
          </div>

          <div className="shrink-0 w-[85vw] md:w-[60vw] h-[350px] snap-center rounded-3xl relative overflow-hidden group">
            <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1600" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Gaming" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#100901]/90 via-[#100901]/50 to-transparent" />
            <div className="absolute inset-0 p-12 flex flex-col justify-center">
              <span className="text-[#ffd27a] font-bold tracking-widest text-xs uppercase mb-4">Best Sellers</span>
              <h2 className="text-glow font-[Outfit] text-5xl font-bold text-white mb-4 max-w-lg">Dominate Your Arena</h2>
              <p className="text-[#cbb89d] max-w-md mb-8">Top-rated mechanical keyboards and ultra-lightweight mice.</p>
              <button className="w-fit bg-[#ffd27a] text-[#5c3f05] px-8 py-3 rounded-full font-bold hover:shadow-[0_0_9px_rgba(255,210,122,0.22)] transition-shadow">Explore Gear</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Main Product Grid ══ */}
      <section className="flex-1 px-6 md:px-12 pb-24">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6]">Discover Products</h2>
            <p className="text-[#cbb89d] text-sm mt-1">Browse our entire futuristic catalog.</p>
          </div>
          {/* Category Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
                  activeCategory === cat
                    ? 'bg-[#ff9933]/20 text-[#ff9933] border-[#ff9933]/40'
                    : 'text-[#cbb89d] border-white/10 hover:text-[#f1e7d7] hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-40 text-[#cbb89d]">Loading products...</div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center h-40 text-[#ffb4ab]">{error}</div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <>
            <ProductGrid items={filtered} adminMode={false} />
            {filtered.length < total && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 rounded-full border border-[#ff9933]/40 text-[#ff9933] text-sm font-bold tracking-wider hover:bg-[#ff9933]/10 hover:shadow-[0_0_9px_rgba(255,153,51,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading more...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center h-40 text-[#cbb89d]">No products in this category.</div>
        )}
      </section>
    </div>
  );
}
