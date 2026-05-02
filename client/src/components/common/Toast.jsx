import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

const ICON_STYLES = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-emergency',
};

function Toast({ toast }) {
  const { removeToast } = useApp();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  const Icon = ICONS[toast.type] || ICONS.success;

  useEffect(() => {
    const step = 50;
    const decrement = (step / duration) * 100;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          setVisible(false);
          setTimeout(() => removeToast(toast.id), 300);
          return 0;
        }
        return prev - decrement;
      });
    }, step);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-card min-w-72 max-w-sm transition-all duration-300 ${
        STYLES[toast.type]
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} toast-enter`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm">{toast.title}</p>
        )}
        <p className="text-sm">{toast.message}</p>
        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-current opacity-30 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-0.5 hover:opacity-60 transition-opacity flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { state } = useApp();

  if (!state.toasts.length) return null;

  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifications"
    >
      {state.toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
