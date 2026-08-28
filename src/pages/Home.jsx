import { useEffect, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';

export const products = [
  { id: 1, title: "Nexus VR Headset Pro", price: 499, desc: "Immersive next-gen virtual reality with crystal clear 8K resolution per eye.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD7QjgUiH2X2Nl5GbUpyOAB-G15qLHjtgK5o2UGEujI09voh9Owk8qeEkhwKZIPrR5wjTu54QR2r7ja11K__ILU7uFr-Xzf1VWzor6CsmHr1fGvTrJ6lzsk9R4mlsFR3W3CWrB1BeFIPMd2vZNMHYqLUTDE5P-lvMgz_LHqnnQX4utFlp7iedNnQzll3-SnlVh3iLwMf4VEBsolvFL2yPZ9HQiIfGef8TZonXDDJh6e99SgWz5OSV1G", badge: "NEW", badgeColor: "secondary", category: "Gaming" },
  { id: 2, title: "AeroBuds Quantum", price: 129, oldPrice: 150, desc: "Active noise cancellation with quantum audio processing for studio-quality sound.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBj9VZiL_pSiwp-oF28r9E7HwdAehUhFVhbs2DS8TaTp1D7bnzwwCeLtFSFcxoNLXBJ9tDpU6ipY8LN_9uTeti7b7gwSCLyfAd2nwn_XxeEdyUmbmIyz4VoXHIjk_eyxyuaCfiaGjXGTieRkW-cdlzRHie10fBUxpJvUonE-TjCzDyqw4FGAGlsiXQFEz-1ssuJJK2ieOCa7Grbv1cypCMJbBhtmxyZBfOp2F2ltZzTJ7Uwppi-GE6f", badge: "-15% OFF", badgeColor: "error", category: "Audio" },
  { id: 3, title: "ChronoSync Ultra", price: 299, desc: "Titanium body smartwatch with advanced biometric sensors and 30-day battery life.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDb4ZPINC5pjIYCY3G7UREExJuGFCqNceKgqe7K2_x5uqIJKtAzrVCcLk9TrF7eq7aH6Fannr3oJrneNzcYwQhoVaEDM_eLTKo9gZ-Qi9rBQ9PEDNM4FJ6IXWZP7V7C_3pcmRgh68yPFs_A3PVuBDLpeilRFPcXrm1KCvGV7HHLgzgnaR8VdUFcVbovlkhzs6CYH5vZHAJ83Q_jR45Ki7XR8Q10R0GmZXTWgR9wSL-OYG2y6nyhqi4D", category: "Wearables" },
  { id: 4, title: "MechKeys K-900", price: 159, desc: "Tactile mechanical switches with per-key RGB lighting and aerospace-grade aluminum frame.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAuHZ2rsQC1W59LmJKzXT30EIgwnX4gKNNurCgniuGnz6yXkpSuNSo5WOmlZ1UrqnkeH702g85_WfwpidzIfmoRhz9nsQgfsAcC8CVAUDhfv0x_6ngTeu9-bGfdTYuIPxLgJz57NsPQHuu6qERawADaaOByJ_QsvoTv8q9S9D13B9aLO-1kYgzHgs_cneFKOjP-tf5n1yHTvZ6yiejTOsrxvT1o4xGgO9ycVatsPkMwZS_9pwZuNjZT", category: "Accessories" },
  { id: 5, title: "Quantum Core Q-7", price: 1299, desc: "Monolithic obsidian chassis with sub-zero liquid cooling architecture.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUZ1mtXhm-phI7GUylKqznDVbR02gvK0mX1HYreTeYzgfJRi-XUk9T2IZA34HO6BBlqHoEwIYgGQZwyDR5gppehxKRHKAQwvb3NxyHKNI2d5_U1lwK05KtdBUWJvfBgZ6z2xnrp2JIoecHHQF18aEXMNvElxZM5zTPQaAcrJ68L5KeVxaokpx97Lxc1rIVhkSPFE8HrpNrSSf-EGvs1Aajh9HG1Zf71arasK80Bc8rUYSGN0NeS0Ga", badge: "PRO", badgeColor: "secondary", category: "Components" }
];

const CATEGORIES = ['All', 'Gaming', 'Audio', 'Wearables', 'Accessories', 'Components'];

export function ProductGrid({ items, adminMode = false }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map(product => (
        <ProductCard key={product.id} {...product} adminMode={adminMode} />
      ))}
    </div>
  );
}

function ProductCard({ id, title, price, oldPrice, desc, img, badge, badgeColor, adminMode }) {
  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);
  const [added, setAdded] = useState(false);

  const badgeColors = {
    secondary: 'bg-[#c98a12]/30 text-[#ffd27a] border-[#ffd27a]/30',
    error: 'bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/30'
  };

  const handleAdd = () => {
    addItem({ id, title, price, img });
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
        <p className="text-[#cbb89d] text-xs leading-relaxed mb-4 line-clamp-2 flex-1">
          {desc}
        </p>
        
        {adminMode ? (
          <button className="w-full py-2.5 rounded-lg bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs font-semibold tracking-wider hover:bg-[#93000a]/40 transition-colors mt-auto">
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

  // The URL's ?category= param is the single source of truth for the active filter
  const paramCategory = searchParams.get('category');
  const activeCategory = paramCategory && CATEGORIES.includes(paramCategory) ? paramCategory : 'All';

  const setActiveCategory = (cat) => {
    setSearchParams(cat === 'All' ? {} : { category: cat }, { replace: true });
  };

  const filtered = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

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
            {CATEGORIES.map(cat => (
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

        {filtered.length > 0 ? (
          <ProductGrid items={filtered} adminMode={false} />
        ) : (
          <div className="flex items-center justify-center h-40 text-[#cbb89d]">No products in this category.</div>
        )}
      </section>
    </div>
  );
}
