import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Loader2, Mail, MessageSquare, Reply } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusOf = (msg) => {
  if (msg.reply) return { label: 'Replied', className: 'bg-[#E0A11C]/20 text-[#E0A11C] border-[#E0A11C]/30' };
  if (msg.isRead) return { label: 'Read', className: 'bg-[#231a16]/10 text-[#7A6A5B] border-[#231a16]/10' };
  return { label: 'Sent', className: 'bg-[#B7322A]/20 text-[#C8901A] border-[#B7322A]/30' };
};

export default function MyMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.myContactMessages();
        if (cancelled) return;
        setMessages(res.items ?? []);
        setError('');
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load messages.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setError('');
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-12 py-16 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
        <div>
          <h1 className="text-glow font-[Outfit] text-4xl sm:text-5xl font-bold text-[#231A16] mb-3 flex items-center gap-3">
            <Inbox className="text-[#B7322A]" size={38} /> My Messages
          </h1>
          <p className="text-[#7A6A5B] text-lg">
            Questions you have sent us and any replies from our support team or sellers.
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-[Outfit] text-sm font-bold bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all shrink-0"
        >
          <MessageSquare size={18} /> New Message
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 h-40 text-[#7A6A5B]">
          <Loader2 size={20} className="animate-spin text-[#B7322A]" /> Loading your messages...
        </div>
      )}

      {!loading && error && (
        <GlassCard hover={false} className="p-10 flex flex-col items-center text-center gap-4">
          <Inbox className="text-[#B3261E]" size={40} />
          <div>
            <p className="text-[#B3261E] font-semibold">Could not load your messages</p>
            <p className="text-[#8A7B6B] text-sm mt-1 break-words max-w-md">{error}</p>
          </div>
          <button
            onClick={retry}
            className="px-5 py-2.5 rounded-lg font-[Outfit] text-sm font-bold bg-gradient-to-br from-[#B7322A] to-[#8F2620] text-[#FDF8F0] hover:shadow-[0_0_9px_rgba(183,50,42,0.22)] transition-all"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {!loading && !error && messages.length === 0 && (
        <GlassCard hover={false} className="p-12 flex flex-col items-center text-center gap-4">
          <Mail className="text-[#8A7B6B]" size={40} />
          <div>
            <p className="text-[#2A211B] font-semibold">No messages yet</p>
            <p className="text-[#8A7B6B] text-sm mt-1">
              Anything you send through the Contact page will show up here with our reply.
            </p>
          </div>
          <Link to="/contact" className="text-[#B7322A] font-semibold hover:underline">
            Send your first message
          </Link>
        </GlassCard>
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="flex flex-col gap-6">
          {messages.map((msg) => {
            const status = statusOf(msg);
            const recipient = msg.storeName || 'NovaMarket Support';
            return (
              <GlassCard key={msg.id} hover={false} className="p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="font-[Outfit] text-xl font-bold text-[#231A16] break-words">{msg.subject}</h2>
                    <p className="text-[#8A7B6B] text-xs mt-1">
                      To {recipient} · {formatDate(msg.createdAt)}
                      {msg.productName ? ` · About ${msg.productName}` : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="rounded-lg border border-[#231a16]/10 bg-[#F5ECDE]/60 p-4">
                  <p className="text-[#8A7B6B] text-xs font-semibold uppercase tracking-wider mb-2">Your message</p>
                  <p className="text-[#2A211B] text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>

                {msg.reply ? (
                  <div className="mt-4 rounded-r-lg border-l-4 border-[#B7322A] bg-[#B7322A]/5 p-4">
                    <p className="text-[#E0A11C] text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Reply size={14} /> Reply from {recipient}
                    </p>
                    <p className="text-[#2A211B] text-sm whitespace-pre-wrap">{msg.reply}</p>
                    {msg.repliedAt && (
                      <p className="text-[#8A7B6B] text-xs mt-3">{formatDateTime(msg.repliedAt)}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-[#8A7B6B] text-xs">Awaiting a reply.</p>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
