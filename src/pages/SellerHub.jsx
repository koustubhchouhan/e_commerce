import { Package, TrendingUp, DollarSign, Eye, PlusCircle, ShoppingBag, LayoutDashboard, BarChart3, MessageSquareWarning, HelpCircle, Clock, PackageX, Check } from 'lucide-react';
import { useState } from 'react';
import GlassCard from '../components/GlassCard';

export default function SellerHub() {
  const [activeTab, setActiveTab] = useState('overview');

  const inventory = [
    { id: 1, name: "Nova Pro X-15 Gaming Laptop", price: "$2,499.00", status: "Approved", sales: 12 },
    { id: 2, name: "Aura Sound V2 Headphones", price: "$349.99", status: "Pending", sales: 0 }
  ];

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
    }
  ];

  const storeOrders = [
    { id: "ORD-501", customer: "Liam Smith", product: "Nova Pro X-15 Gaming Laptop", date: "Today", status: "Processing", amount: "$2,499.00" },
    { id: "ORD-502", customer: "Emma Johnson", product: "Nova Pro X-15 Gaming Laptop", date: "Yesterday", status: "Shipped", amount: "$2,499.00" },
  ];

  const getRequestIcon = (type) => {
    switch (type) {
      case 'Return Request': return <PackageX className="text-[#ffb4ab]" size={20} />;
      case 'Restock Inquiry': return <HelpCircle className="text-[#ff9933]" size={20} />;
      case 'Order Modification': return <Clock className="text-[#ffd27a]" size={20} />;
      default: return <MessageSquareWarning className="text-[#f1e7d7]" size={20} />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] animate-fade-in-up">
      
      {/* ═══ Left Sidebar ═══ */}
      <aside className="w-[280px] bg-[#221708]/90 backdrop-blur-xl border-r border-white/5 p-6 flex flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto">
        
        {/* Profile Info */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-24 h-24 rounded-full bg-[#170e03] border-2 border-[#ff9933]/50 overflow-hidden mb-4 shadow-[0_0_7px_rgba(255,153,51,0.11)]">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" 
              alt="Seller Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="font-[Outfit] text-xl font-bold text-[#fff4e6]">Sarah Jenkins</h2>
          <p className="text-[#cbb89d] text-xs font-semibold tracking-wider uppercase mt-1">NeonTech Store</p>
          <span className="px-3 py-1 rounded-full bg-[#ffbf66]/10 text-[#ffbf66] text-[10px] font-bold uppercase tracking-wider mt-3 border border-[#ffbf66]/20">
            Verified Seller
          </span>
        </div>
        
        {/* Navigation Options */}
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarLink icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarLink icon={<LayoutDashboard size={20} />} label="Store Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <SidebarLink icon={<BarChart3 size={20} />} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <SidebarLink icon={<MessageSquareWarning size={20} />} label="Messages & Complaints" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
        </nav>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto h-[calc(100vh-80px)]">
        
        {activeTab === 'overview' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Store Overview</h1>
              <p className="text-[#cbb89d]">Monitor your recent analytics, add new products, and track inventory.</p>
            </header>

            {/* Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard icon={<DollarSign size={24} />} title="Total Revenue" value="$45,230" trend="+12.5%" />
              <StatCard icon={<Package size={24} />} title="Products Sold" value="124" trend="+8.2%" />
              <StatCard icon={<Eye size={24} />} title="Store Views" value="12.4K" trend="+22.1%" />
              <StatCard icon={<TrendingUp size={24} />} title="Conversion Rate" value="3.2%" trend="-0.4%" negative />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Add Product Form */}
              <div className="xl:col-span-1">
                <GlassCard className="p-6 lg:p-8">
                  <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6 flex items-center gap-2">
                    <PlusCircle className="text-[#ff9933]" /> Add Product
                  </h2>
                  <form className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Product Name</label>
                      <input type="text" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors" placeholder="Enter name..." />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Price ($)</label>
                        <input type="number" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Category</label>
                        <select className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors">
                          <option>Gaming</option>
                          <option>Audio</option>
                          <option>Components</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[#cbb89d] font-bold uppercase tracking-wider mb-2 block">Description</label>
                      <textarea rows="3" className="w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-colors resize-none" placeholder="Details..."></textarea>
                    </div>

                    <button type="button" className="w-full py-3 rounded-lg bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] font-[Outfit] text-lg font-semibold mt-2 hover:shadow-[0_0_7px_rgba(255,153,51,0.22)] transition-all">
                      Submit for Approval
                    </button>
                  </form>
                </GlassCard>
              </div>

              {/* Inventory List */}
              <div className="xl:col-span-2">
                <GlassCard className="p-6 lg:p-8 min-h-[500px]">
                  <h2 className="font-[Outfit] text-2xl font-semibold text-[#fff4e6] mb-6">Your Inventory</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                          <th className="py-4 px-4 font-semibold">Product</th>
                          <th className="py-4 px-4 font-semibold text-right">Price</th>
                          <th className="py-4 px-4 font-semibold text-center">Sales</th>
                          <th className="py-4 px-4 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map(item => (
                          <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 font-[Outfit] text-lg font-semibold text-[#f1e7d7]">{item.name}</td>
                            <td className="py-4 px-4 text-right text-[#ff9933] font-semibold">{item.price}</td>
                            <td className="py-4 px-4 text-center text-[#fff4e6]">{item.sales}</td>
                            <td className="py-4 px-4 text-right">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                                item.status === 'Approved' ? 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30' : 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Store Orders</h1>
              <p className="text-[#cbb89d]">Products ordered from your store by customers.</p>
            </header>
            
            <GlassCard className="p-6 lg:p-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[#cbb89d] text-xs uppercase tracking-wider">
                      <th className="py-4 px-4 font-semibold">Order ID</th>
                      <th className="py-4 px-4 font-semibold">Customer</th>
                      <th className="py-4 px-4 font-semibold">Product</th>
                      <th className="py-4 px-4 font-semibold text-right">Amount</th>
                      <th className="py-4 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeOrders.map(order => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-[Inter] text-sm text-[#cbb89d] uppercase">{order.id}</td>
                        <td className="py-4 px-4 text-[#f1e7d7] font-semibold">{order.customer}</td>
                        <td className="py-4 px-4 text-[#fff4e6]">{order.product}</td>
                        <td className="py-4 px-4 text-right text-[#ff9933] font-semibold">{order.amount}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            order.status === 'Shipped' ? 'bg-[#ff9933]/20 text-[#ffbf66] border-[#ff9933]/30' : 'bg-[#ffd27a]/20 text-[#ffd27a] border-[#ffd27a]/30'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Messages & Complaints</h1>
              <p className="text-[#cbb89d]">Manage incoming inquiries, return requests, and order modifications.</p>
            </header>
            
            <div className="flex flex-col gap-6 max-w-4xl">
              {requests.map((req) => (
                <GlassCard key={req.id} className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-white/5 rounded-full border border-white/10 shrink-0">
                        {getRequestIcon(req.type)}
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
                        <Check size={16} /> Resolve Request
                      </button>
                      <button className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#34250f]/50 hover:bg-white/10 border border-white/10 text-[#f1e7d7] text-sm font-semibold transition-all">
                        Reply to Customer
                      </button>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in-up">
            <header className="mb-10">
              <h1 className="font-[Outfit] text-4xl font-bold text-[#fff4e6] mb-2 text-glow">Store Analytics</h1>
              <p className="text-[#cbb89d]">Visualizations and in-depth metrics for your store performance.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ff9933]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Revenue Timeline Graph</p>
              </GlassCard>
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ffd27a]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Top Selling Categories Pie Chart</p>
              </GlassCard>
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ffbf66]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Store Traffic Bar Chart</p>
              </GlassCard>
              <GlassCard className="h-[300px] flex items-center justify-center border-t-2 border-t-[#ffb4ab]">
                <p className="text-[#cbb89d] font-[Outfit] text-xl">Conversion Funnel</p>
              </GlassCard>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all duration-200 w-full text-left ${
        active 
          ? 'bg-[#ff9933]/20 text-[#ff9933] border border-[#ff9933]/30 shadow-[0_0_7px_rgba(255,153,51,0.06)]' 
          : 'text-[#cbb89d] hover:bg-[#34250f]/50 hover:text-[#f1e7d7]'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ icon, title, value, trend, negative }) {
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[#ff9933] bg-[#ff9933]/10 p-3 rounded-lg border border-[#ff9933]/20">
          {icon}
        </div>
        <span className={`text-xs font-bold tracking-wider px-2 py-1 rounded-full ${negative ? 'bg-[#ffb4ab]/20 text-[#ffb4ab]' : 'bg-[#ff9933]/20 text-[#ff9933]'}`}>
          {trend}
        </span>
      </div>
      <div>
        <h3 className="text-[#cbb89d] text-sm font-semibold uppercase tracking-wider mb-1">{title}</h3>
        <p className="font-[Outfit] text-3xl font-bold text-[#fff4e6]">{value}</p>
      </div>
    </GlassCard>
  );
}
