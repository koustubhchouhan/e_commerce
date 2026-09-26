import { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export function ProductGrid({ items, adminMode = false, adminOnDelete }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

  const off = oldPrice && price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const badgeClass = badgeColor === 'error'
    ? 'bg-[#B7322A] text-[#FDF8F0]'
    : 'bg-[#231A16] text-[#FDF8F0]';

  const handleAdd = () => {
    addItem({ id, title, price, img, storeName });
    addToast(`${title} added to cart!`, 'success');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#E7DAC8] bg-[#FFFCF7] transition-shadow duration-300 hover:shadow-[0_14px_30px_rgba(60,40,25,0.10)]">
      <Link to={`/product/${id}`} className="relative block aspect-[4/3] stripe-placeholder overflow-hidden">
        <img
          src={img}
          alt={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {badge && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${badgeClass}`}>
            {badge}
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/product/${id}`} className="font-display text-base sm:text-lg font-semibold text-[#231A16] leading-snug line-clamp-2 hover:text-[#B7322A] transition-colors">
          {title}
        </Link>
        {storeName && <p className="micro-label mt-1.5">by {storeName}</p>}
        {desc && <p className="text-[#8A7B6B] text-xs leading-relaxed mt-1.5 line-clamp-2 flex-1">{desc}</p>}

        <div className="flex items-baseline gap-2 mt-3">
          <span className="font-display text-lg font-bold text-[#231A16]">{inr(price)}</span>
          {oldPrice && <span className="text-[#A79684] text-xs line-through">{inr(oldPrice)}</span>}
          {off > 0 && <span className="text-[#B7322A] text-[11px] font-semibold">{off}% off</span>}
        </div>

        {adminMode ? (
          <button
            onClick={() => adminOnDelete?.(id)}
            className="btn btn-outline w-full mt-4 py-2 text-xs text-[#B3261E] border-[#B3261E]/50 hover:bg-[#B3261E] hover:text-[#FDF8F0]"
          >
            Remove Product
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className={`btn w-full mt-4 py-2.5 text-sm ${added ? 'btn-primary' : 'btn-outline'}`}
          >
            {added ? <><CheckCircle size={16} /> Added</> : <><ShoppingCart size={16} /> Add to cart</>}
          </button>
        )}
      </div>
    </article>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer text-sm text-[#4A3B30] hover:text-[#231A16]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded accent-[#B7322A]"
      />
      {label}
    </label>
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
  const [hasMore, setHasMore] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(null);
  const [sort, setSort] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
        setHasMore(Boolean(productRes.hasMore));
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
      setHasMore(Boolean(res.hasMore));
      setPage(res.page ?? page + 1);
    } catch (err) {
      setError(err.message || 'Failed to load more products.');
    } finally {
      setLoadingMore(false);
    }
  };

  // The URL's ?category= param is the single source of truth for the active category
  const paramCategory = searchParams.get('category');
  const activeCategory = paramCategory && categories.includes(paramCategory) ? paramCategory : 'All';

  const setActiveCategory = (cat) => {
    setSearchParams(cat === 'All' ? {} : { category: cat }, { replace: true });
  };

  const priceCap = useMemo(
    () => Math.max(1, ...products.map((p) => Number(p.price) || 0)),
    [products]
  );
  const priceLimit = maxPrice ?? priceCap;

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'All') list = list.filter((p) => p.category === activeCategory);
    if (inStockOnly) list = list.filter((p) => (p.stock ?? 1) > 0);
    if (onSaleOnly) list = list.filter((p) => p.oldPrice);
    list = list.filter((p) => Number(p.price) <= priceLimit);
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [products, activeCategory, inStockOnly, onSaleOnly, priceLimit, sort]);

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

  const activeChips = [];
  if (activeCategory !== 'All') activeChips.push({ key: 'cat', label: activeCategory, clear: () => setActiveCategory('All') });
  if (inStockOnly) activeChips.push({ key: 'stock', label: 'In stock', clear: () => setInStockOnly(false) });
  if (onSaleOnly) activeChips.push({ key: 'sale', label: 'On sale', clear: () => setOnSaleOnly(false) });
  if (maxPrice !== null) activeChips.push({ key: 'price', label: `Up to ${inr(maxPrice)}`, clear: () => setMaxPrice(null) });

  const clearAll = () => {
    setActiveCategory('All');
    setInStockOnly(false);
    setOnSaleOnly(false);
    setMaxPrice(null);
  };

  const filtersPanel = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-[#231A16]">Filters</h2>
        {activeChips.length > 0 && (
          <button onClick={clearAll} className="text-xs font-semibold text-[#B7322A] hover:text-[#8F2620]">
            Clear
          </button>
        )}
      </div>

      <div className="border-t border-[#E7DAC8] pt-4">
        <p className="micro-label mb-1">Category</p>
        <div className="max-h-56 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <CheckRow
              key={cat}
              checked={activeCategory === cat}
              onChange={() => setActiveCategory(cat)}
              label={cat}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-[#E7DAC8] pt-4">
        <p className="micro-label mb-3">Price</p>
        <input
          type="range"
          min={0}
          max={priceCap}
          step={1}
          value={priceLimit}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#B7322A] cursor-pointer"
          aria-label="Maximum price"
        />
        <div className="flex justify-between text-xs text-[#8A7B6B] mt-1.5">
          <span>{inr(0)}</span>
          <span>{inr(priceLimit)}</span>
        </div>
      </div>

      <div className="border-t border-[#E7DAC8] pt-4">
        <p className="micro-label mb-1">Availability</p>
        <CheckRow checked={inStockOnly} onChange={() => setInStockOnly(v => !v)} label="In stock only" />
        <CheckRow checked={onSaleOnly} onChange={() => setOnSaleOnly(v => !v)} label="On sale" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col animate-fade-in-up overflow-hidden">
      {/* ══ Mobile Search ══ */}
      <section className="px-4 pt-4 md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7B6B]" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search products…"
            className="field pl-11"
          />
        </div>
      </section>

      {/* ══ Slider Section ══ */}
      {slides.length > 0 && (
        <section className="w-full pt-6 md:pt-10 px-4 md:px-8 pb-8">
          <div ref={sliderRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 scroll-smooth">
            {slides.map((slide) => {
              const theme = SLIDE_THEMES[slide.theme] ?? SLIDE_THEMES.orange;
              const isExternal = /^https?:\/\//i.test(slide.buttonLink || '');
              const buttonClass = `btn ${theme.button} w-fit px-7 py-3 text-sm`;
              return (
                <div key={slide.id} className="shrink-0 w-[85vw] md:w-[62vw] h-[320px] snap-center rounded-3xl relative overflow-hidden group border border-[#E7DAC8]">
                  <img src={slide.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt={slide.title} />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FDF8F0]/95 via-[#FDF8F0]/60 to-transparent" />
                  <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-center">
                    {slide.eyebrow && (
                      <span className={`${theme.accent} font-semibold tracking-widest text-xs uppercase mb-3`}>{slide.eyebrow}</span>
                    )}
                    <h2 className="font-display text-3xl md:text-5xl font-semibold text-[#231A16] mb-3 max-w-lg leading-tight">{slide.title}</h2>
                    {slide.description && <p className="text-[#7A6A5B] max-w-md mb-6 text-sm">{slide.description}</p>}
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

      {/* ══ Catalog ══ */}
      <section className={`flex-1 px-4 md:px-8 pb-24 ${slides.length === 0 ? 'pt-4 md:pt-8' : ''}`}>
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">

          {/* Sidebar (desktop) / collapsible panel (mobile) */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block glass-panel p-5 h-fit lg:sticky lg:top-24`}>
            {filtersPanel}
          </aside>

          <div>
            {/* Toolbar: active chips + sort */}
            <div className="flex items-center gap-3 flex-wrap mb-6">
              <button
                onClick={() => setFiltersOpen(v => !v)}
                className="lg:hidden btn btn-outline px-4 py-2 text-sm"
              >
                <SlidersHorizontal size={16} /> Filters
                {activeChips.length > 0 && <span className="text-[#B7322A]">({activeChips.length})</span>}
              </button>

              {activeChips.map((chip) => (
                <span key={chip.key} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border border-[#E3D5C1] bg-[#FBF3E7] text-xs text-[#4A3B30]">
                  {chip.label}
                  <button onClick={chip.clear} aria-label={`Remove ${chip.label} filter`} className="text-[#8A7B6B] hover:text-[#B7322A]">
                    <X size={13} />
                  </button>
                </span>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-[#8A7B6B] hidden sm:inline">Sort</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none rounded-full border border-[#E3D5C1] bg-[#FFFCF7] pl-4 pr-9 py-2 text-sm text-[#2A211B] outline-none focus:border-[#B7322A] cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7B6B] pointer-events-none" />
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center h-40 text-[#7A6A5B]">Loading products…</div>
            )}
            {error && !loading && (
              <div className="flex items-center justify-center h-40 text-[#B3261E]">{error}</div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <>
                <ProductGrid items={filtered} adminMode={false} />
                {hasMore && (
                  <div className="flex justify-center mt-12">
                    <button onClick={loadMore} disabled={loadingMore} className="btn btn-outline px-8 py-3 text-sm">
                      {loadingMore ? 'Loading more…' : 'Load more products'}
                    </button>
                  </div>
                )}
              </>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-[#7A6A5B]">
                <p>No products match these filters.</p>
                {activeChips.length > 0 && (
                  <button onClick={clearAll} className="btn btn-outline px-5 py-2 text-sm">Clear filters</button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
