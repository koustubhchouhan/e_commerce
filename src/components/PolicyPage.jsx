import { BUSINESS } from '../lib/business';

// Shared presentation for the public policy pages so every legal page has the
// same heading, "last updated" stamp and typography (see .policy-prose in
// index.css).
export default function PolicyPage({ title, intro, updated = BUSINESS.effectiveDate, children }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-14 animate-fade-in-up">
      <header className="mb-10 border-b border-white/10 pb-6">
        <h1 className="text-glow font-[Outfit] text-3xl sm:text-4xl font-bold text-[#fff4e6] mb-3">{title}</h1>
        <p className="text-[#9e8c73] text-sm">Last updated: {updated}</p>
        {intro && <p className="text-[#cbb89d] mt-4 leading-relaxed">{intro}</p>}
      </header>
      <div className="policy-prose">{children}</div>
    </div>
  );
}
