import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'loading';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  progress?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeProgress, setTimeProgress] = useState(100);
  const duration = toast.duration || 3000;

  useEffect(() => {
    // Trigger animation
    const animTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(animTimer);
  }, []);

  useEffect(() => {
    if (toast.type !== 'loading' && toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, duration);

      // Animate progress bar
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setTimeProgress(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [toast.id, toast.type, toast.duration, duration, onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    warning: <AlertCircle size={18} className="text-amber-400" />,
    loading: <Loader2 size={18} className="text-blue-400 animate-spin" />
  };

  const backgrounds = {
    success: 'bg-emerald-900/30 border-emerald-700/50',
    error: 'bg-red-900/30 border-red-700/50',
    warning: 'bg-amber-900/30 border-amber-700/50',
    loading: 'bg-blue-900/30 border-blue-700/50'
  };

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    loading: 'bg-blue-500'
  };

  return (
    <div
      className={`flex flex-col rounded-lg border ${backgrounds[toast.type]} backdrop-blur-sm shadow-lg transition-all duration-300 overflow-hidden`}
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {icons[toast.type]}
        <span className="text-sm text-white flex-1">{toast.message}</span>
        {toast.type !== 'loading' && (
          <button
            onClick={() => onClose(toast.id)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>
      {toast.type === 'loading' && toast.progress !== undefined ? (
        <div className="w-full h-1 bg-gray-700/50">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${toast.progress}%` }}
          />
        </div>
      ) : toast.type !== 'loading' && (
        <div className="w-full h-0.5 bg-gray-700/30">
          <div
            className={`h-full ${progressColors[toast.type]} transition-none`}
            style={{ width: `${timeProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default Toast;
