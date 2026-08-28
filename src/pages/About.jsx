import GlassCard from '../components/GlassCard';

export default function About() {
  return (
    <div className="max-w-[1200px] mx-auto px-12 py-16 animate-fade-in-up">
      <div className="text-center mb-16">
        <h1 className="text-glow font-[Outfit] text-5xl font-bold text-[#fff4e6] mb-6">About NovaMarket</h1>
        <p className="text-[#cbb89d] text-lg max-w-3xl mx-auto leading-relaxed">
          Pioneering the future of digital commerce. We are building a borderless platform connecting tech enthusiasts with next-generation hardware and software solutions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
        <GlassCard className="p-10 flex flex-col justify-center border-l-4 border-l-[#ff9933]">
          <h2 className="font-[Outfit] text-3xl font-bold text-[#fff4e6] mb-4">Our Vision</h2>
          <p className="text-[#cbb89d] leading-relaxed">
            To create a seamless, visually immersive marketplace where the latest technology is accessible to everyone. We believe in high-performance hardware, sleek aesthetics, and uncompromising user experience.
          </p>
        </GlassCard>
        
        <GlassCard className="p-10 flex flex-col justify-center border-l-4 border-l-[#c98a12]">
          <h2 className="font-[Outfit] text-3xl font-bold text-[#fff4e6] mb-4">Our Mission</h2>
          <p className="text-[#cbb89d] leading-relaxed">
            Empowering creators, gamers, and professionals by providing a curated platform for the most advanced tech. We strictly vet our sellers to ensure you receive only authentic, premium products.
          </p>
        </GlassCard>
      </div>

      <div className="text-center">
        <h2 className="font-[Outfit] text-3xl font-bold text-[#fff4e6] mb-8">Why Choose Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-8">
            <h3 className="font-[Outfit] text-xl font-bold text-[#ff9933] mb-3">Futuristic UI</h3>
            <p className="text-[#cbb89d] text-sm">A seamless glassmorphic design that puts your shopping experience first.</p>
          </GlassCard>
          <GlassCard className="p-8">
            <h3 className="font-[Outfit] text-xl font-bold text-[#ff9933] mb-3">Verified Sellers</h3>
            <p className="text-[#cbb89d] text-sm">Every seller is strictly vetted by our admin team before listing products.</p>
          </GlassCard>
          <GlassCard className="p-8">
            <h3 className="font-[Outfit] text-xl font-bold text-[#ff9933] mb-3">Next-Gen Tech</h3>
            <p className="text-[#cbb89d] text-sm">We focus exclusively on high-performance, futuristic electronics and gear.</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
