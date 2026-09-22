import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ProductGrid } from './Home';
import { api } from '../lib/api';
import { toProductCardList } from '../lib/productShape';

export default function SearchResults() {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await api.products({ search: query, limit: 100 });
        if (!cancelled) setResults(toProductCardList(res.items));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Search failed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-full bg-[#B7322A]/10 text-[#B7322A] flex items-center justify-center shrink-0 border border-[#B7322A]/20">
          <Search size={22} />
        </div>
        <div>
          <h1 className="font-[Outfit] text-3xl font-bold text-[#231A16]">
            Search Results for <span className="text-[#B7322A]">"{query}"</span>
          </h1>
          <p className="text-[#7A6A5B] text-sm mt-1">
            {loading ? 'Searching...' : error || (results.length === 0 ? 'No products found.' : `${results.length} product${results.length > 1 ? 's' : ''} found.`)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#7A6A5B]">Loading...</div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Search size={60} className="text-[#F0E7DA]" />
          <p className="text-[#B3261E] text-xl">{error}</p>
        </div>
      ) : results.length > 0 ? (
        <ProductGrid items={results} adminMode={false} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Search size={60} className="text-[#F0E7DA]" />
          <p className="text-[#7A6A5B] text-xl">No results for <span className="text-[#231A16] font-semibold">"{query}"</span></p>
          <p className="text-[#8A7B6B] text-sm">Try a different keyword or browse our catalog.</p>
          <Link to="/home" className="mt-2 px-6 py-3 rounded-lg bg-[#F0E7DA]/50 border border-[#231a16]/10 text-[#2A211B] font-[Outfit] font-semibold text-base hover:bg-[#231a16]/5 transition-all">
            Browse All Products
          </Link>
        </div>
      )}
    </div>
  );
}
