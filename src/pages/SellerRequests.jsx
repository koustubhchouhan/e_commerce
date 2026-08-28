import { MessageSquareWarning, Check, X, Clock, HelpCircle, PackageX } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function SellerRequests() {
  const requests = [
    {
      id: "REQ-091",
      customer: "Alex Mercer",
      type: "Return Request",
      product: "Nova Pro X-15 Gaming Laptop",
      date: "2 hours ago",
      status: "Pending",
      message: "The cooling fans seem unusually loud during standard usage. Requesting a replacement or return."
    },
    {
      id: "REQ-090",
      customer: "Jordan Lee",
      type: "Restock Inquiry",
      product: "Aura Sound V2 Headphones",
      date: "1 day ago",
      status: "Resolved",
      message: "When will the Midnight Black version be back in stock?"
    },
    {
      id: "REQ-089",
      customer: "Taylor Smith",
      type: "Order Modification",
      product: "ChronoSync Ultra Smartwatch",
      date: "2 days ago",
      status: "Pending",
      message: "I accidentally ordered the Silver variant instead of Titanium. Can you update the order before shipping?"
    }
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'Return Request': return <PackageX className="text-[#ffb4ab]" size={20} />;
      case 'Restock Inquiry': return <HelpCircle className="text-[#ff9933]" size={20} />;
      case 'Order Modification': return <Clock className="text-[#ffd27a]" size={20} />;
      default: return <MessageSquareWarning className="text-[#f1e7d7]" size={20} />;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 animate-fade-in-up flex flex-col gap-8">
      <header>
        <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Customer Requests</h1>
        <p className="text-[#cbb89d]">Manage incoming inquiries, return requests, and order modifications.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Request List */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {requests.map((req) => (
            <GlassCard key={req.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-white/5 rounded-full border border-white/10 shrink-0">
                    {getIcon(req.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="font-[Outfit] text-xl font-semibold text-[#fff4e6]">{req.type}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        req.status === 'Pending' ? 'bg-[#c98a12]/20 text-[#ffd27a] border-[#ffd27a]/30' : 'bg-[#ff9933]/10 text-[#ff9933] border-[#ff9933]/20'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[#cbb89d] text-sm mt-1">
                      From: <span className="font-semibold text-[#f1e7d7]">{req.customer}</span> • {req.date}
                    </p>
                    <p className="text-[#cbb89d] text-sm">
                      Product: <span className="text-[#ff7418] hover:underline cursor-pointer">{req.product}</span>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-[Inter] font-bold tracking-wider text-[#cbb89d] uppercase shrink-0">
                  {req.id}
                </span>
              </div>
              
              <div className="bg-[#221708]/80 p-4 rounded-lg border border-white/5 mb-4 text-[#f1e7d7] text-sm italic">
                "{req.message}"
              </div>

              {req.status === 'Pending' && (
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
                  <button className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#9c5214]/50 hover:bg-[#ff9933]/20 border border-[#ff9933]/30 text-[#fff4e6] text-sm font-semibold transition-all">
                    <Check size={16} /> Approve Request
                  </button>
                  <button className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#690005]/50 hover:bg-[#ffb4ab]/20 border border-[#ffb4ab]/30 text-[#ffdad6] text-sm font-semibold transition-all">
                    <X size={16} /> Decline
                  </button>
                  <button className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#34250f]/50 hover:bg-white/10 border border-white/10 text-[#f1e7d7] text-sm font-semibold transition-all ml-auto">
                    Reply to Customer
                  </button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>

        {/* Right Column: Analytics / Status Summary */}
        <div className="lg:col-span-1">
          <GlassCard className="p-8 sticky top-28">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6">Request Overview</h2>
            
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-[#cbb89d] text-sm">Pending Requests</span>
                <span className="font-[Outfit] text-2xl font-bold text-[#ffd27a]">2</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <span className="text-[#cbb89d] text-sm">Resolved (Last 7 Days)</span>
                <span className="font-[Outfit] text-2xl font-bold text-[#ff9933]">14</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-[#cbb89d] text-sm">Average Response Time</span>
                <span className="font-[Outfit] text-xl font-bold text-[#fff4e6]">3h 45m</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#c98a12]/10 border border-[#ffd27a]/20 rounded-lg">
              <div className="flex gap-3">
                <MessageSquareWarning className="text-[#ffd27a] shrink-0" size={20} />
                <p className="text-[#f1e7d7] text-sm leading-relaxed">
                  You have 2 pending requests that require attention. Prompt responses improve your seller rating.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
