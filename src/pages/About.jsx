import GlassCard from '../components/GlassCard';

export default function About() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 md:px-12 md:py-16 animate-fade-in-up">
      <div className="text-center mb-16">
        <h1 className="text-glow font-display text-5xl font-bold text-[#231A16] mb-6">About Arghya</h1>
        <p className="text-[#7A6A5B] text-lg max-w-3xl mx-auto leading-relaxed">
          Pandit-verified puja kits, havan samagri and everyday devotional essentials — sourced with shraddha and delivered before your muhurat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
        <GlassCard className="p-10 flex flex-col justify-center border-l-4 border-l-[#B7322A]">
          <h2 className="font-display text-3xl font-bold text-[#231A16] mb-4">Our Vision</h2>
          <p className="text-[#7A6A5B] leading-relaxed">
            To make shuddh, vidhi-correct samagri available to every household — so no ritual is delayed or compromised by time, distance or availability.
          </p>
        </GlassCard>
        
        <GlassCard className="p-10 flex flex-col justify-center border-l-4 border-l-[#B8860B]">
          <h2 className="font-display text-3xl font-bold text-[#231A16] mb-4">Our Mission</h2>
          <p className="text-[#7A6A5B] leading-relaxed">
            We source directly from trusted suppliers, verify every batch and assemble each kit against the vidhi — then deliver it to your door, or keep it ready for pickup at a store near you.
          </p>
        </GlassCard>
      </div>

      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-[#231A16] mb-8">Why Choose Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-8">
            <h3 className="font-display text-xl font-bold text-[#B7322A] mb-3">Pandit-Verified Kits</h3>
            <p className="text-[#7A6A5B] text-sm">Every kit is assembled and checked against the vidhi by experienced pandits, so nothing is missing on the day.</p>
          </GlassCard>
          <GlassCard className="p-8">
            <h3 className="font-display text-xl font-bold text-[#B7322A] mb-3">Shuddh Sourcing</h3>
            <p className="text-[#7A6A5B] text-sm">Authentic samagri, bilona gau ghee and pure kapoor — checked for purity before they reach you.</p>
          </GlassCard>
          <GlassCard className="p-8">
            <h3 className="font-display text-xl font-bold text-[#B7322A] mb-3">Delivered Before Muhurat</h3>
            <p className="text-[#7A6A5B] text-sm">Timed city delivery, store pickup and monthly top-ups keep your puja ready before the muhurat.</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
