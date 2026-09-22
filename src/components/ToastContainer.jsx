import { useToastStore } from '../store/toastStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-[#B7322A] shrink-0" />,
  error:   <XCircle size={18} className="text-[#B3261E] shrink-0" />,
  info:    <Info size={18} className="text-[#C8901A] shrink-0" />,
};

const borders = {
  success: 'border-l-[#B7322A]',
  error:   'border-l-[#B3261E]',
  info:    'border-l-[#C8901A]',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F5ECDE]/95 backdrop-blur-xl border border-[#231a16]/10 border-l-4 ${borders[toast.type]} shadow-xl max-w-sm animate-fade-in-up`}
        >
          {icons[toast.type]}
          <p className="text-sm text-[#2A211B] font-[Inter] font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#8A7B6B] hover:text-[#231A16] transition-colors ml-2"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
