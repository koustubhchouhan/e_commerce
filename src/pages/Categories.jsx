import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';

export default function Categories() {
  const categories = [
    {
      title: "Indian Festive Season",
      desc: "Exclusive deals for Diwali, Navratri, and more.",
      img: "https://images.unsplash.com/photo-1605330310243-d8b375d045d6?auto=format&fit=crop&q=80&w=800",
      theme: "festive",
      filter: "All",
    },
    {
      title: "Gaming & VR",
      desc: "Next-gen consoles, VR headsets, and accessories.",
      img: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800",
      theme: "neon",
      filter: "Gaming",
    },
    {
      title: "Smart Home",
      desc: "Automate your life with futuristic smart devices.",
      img: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=800",
      theme: "blue",
      filter: "All",
    },
    {
      title: "Audio & Sound",
      desc: "Studio-quality headphones, soundbars, and mics.",
      img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
      theme: "purple",
      filter: "Audio",
    },
    {
      title: "PC Components",
      desc: "Processors, GPUs, and liquid cooling systems.",
      img: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=800",
      theme: "cyan",
      filter: "Components",
    },
    {
      title: "Wearables",
      desc: "Smartwatches, fitness trackers, and AR glasses.",
      img: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=800",
      theme: "blue",
      filter: "Wearables",
    }
  ];

  const getThemeClasses = (theme) => {
    switch (theme) {
      case 'festive':
        return 'from-[#ffa500]/60 to-[#ff4500]/80 border-[#ffd700]/50 shadow-[0_0_9px_rgba(255,165,0,0.17)] hover:shadow-[0_0_14px_rgba(255,165,0,0.33)]';
      case 'neon':
        return 'from-[#ff9933]/40 to-[#c98a12]/60 border-[#ff9933]/30 shadow-[0_0_7px_rgba(201,138,18,0.17)] hover:shadow-[0_0_11px_rgba(255,153,51,0.28)]';
      case 'purple':
        return 'from-[#c98a12]/40 to-[#5c3f05]/60 border-[#ffd27a]/30 hover:shadow-[0_0_11px_rgba(201,138,18,0.28)]';
      case 'cyan':
      case 'blue':
      default:
        return 'from-[#100901]/80 to-[#221708]/90 border-white/10 hover:border-[#ff9933]/30 hover:shadow-[0_0_11px_rgba(255,153,51,0.17)]';
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-12 py-12 animate-fade-in-up">
      <header className="mb-12 text-center">
        <h1 className="font-[Outfit] text-5xl font-bold text-[#fff4e6] mb-4 text-glow">Browse Categories</h1>
        <p className="text-[#cbb89d] max-w-2xl mx-auto">Explore our curated collections of futuristic tech, smart gadgets, and seasonal deals.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat, idx) => (
          <Link key={idx} to={`/home?category=${encodeURIComponent(cat.filter)}`} className="block">
            <GlassCard hover={false} className={`relative overflow-hidden group cursor-pointer transition-all duration-500 border ${getThemeClasses(cat.theme)}`}>
              <div className="absolute inset-0 z-0">
                <img src={cat.img} alt={cat.title} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" />
              </div>
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.theme === 'festive' ? 'from-[#4a0000]/90 to-transparent' : 'from-[#170e03]/90 to-transparent'} z-10`} />

              <div className="relative z-20 p-8 h-[300px] flex flex-col justify-end">
                {cat.theme === 'festive' && (
                  <span className="absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/50 animate-pulse">
                    SPECIAL EVENT
                  </span>
                )}
                <h2 className={`font-[Outfit] text-3xl font-bold mb-2 ${cat.theme === 'festive' ? 'text-[#ffd700] drop-shadow-[0_0_4px_rgba(255,215,0,0.44)]' : 'text-[#fff4e6]'}`}>
                  {cat.title}
                </h2>
                <p className="text-[#f1e7d7] text-sm opacity-90">{cat.desc}</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
