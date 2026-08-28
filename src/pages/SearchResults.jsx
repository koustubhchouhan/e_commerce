import { useLocation, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { products } from './Home';
import { ProductGrid } from './Home';

export default function SearchResults() {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get('q') || '';
  
  const results = query
    ? products.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.desc.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-full bg-[#ff9933]/10 text-[#ff9933] flex items-center justify-center shrink-0 border border-[#ff9933]/20">
          <Search size={22} />
        </div>
        <div>
          <h1 className="font-[Outfit] text-3xl font-bold text-[#fff4e6]">
            Search Results for <span className="text-[#ff9933]">"{query}"</span>
          </h1>
          <p className="text-[#cbb89d] text-sm mt-1">
            {results.length === 0 ? 'No products found.' : `${results.length} product${results.length > 1 ? 's' : ''} found.`}
          </p>
        </div>
      </div>

      {results.length > 0 ? (
        <ProductGrid items={results} adminMode={false} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Search size={60} className="text-[#34250f]" />
          <p className="text-[#cbb89d] text-xl">No results for <span className="text-[#fff4e6] font-semibold">"{query}"</span></p>
          <p className="text-[#9e8c73] text-sm">Try a different keyword or browse our catalog.</p>
          <Link to="/home" className="mt-2 px-6 py-3 rounded-lg bg-[#34250f]/50 border border-white/10 text-[#f1e7d7] font-[Outfit] font-semibold text-base hover:bg-white/5 transition-all">
            Browse All Products
          </Link>
        </div>
      )}
    </div>
  );
}
