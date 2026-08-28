import { useToastStore } from '../store/toastStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-[#ff9933] shrink-0" />,
  error:   <XCircle size={18} className="text-[#ffb4ab] shrink-0" />,
  info:    <Info size={18} className="text-[#ffd27a] shrink-0" />,
};

const borders = {
  success: 'border-l-[#ff9933]',
  error:   'border-l-[#ffb4ab]',
  info:    'border-l-[#ffd27a]',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-[#221708]/95 backdrop-blur-xl border border-white/10 border-l-4 ${borders[toast.type]} shadow-xl max-w-sm animate-fade-in-up`}
        >
          {icons[toast.type]}
          <p className="text-sm text-[#f1e7d7] font-[Inter] font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#9e8c73] hover:text-[#fff4e6] transition-colors ml-2"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
