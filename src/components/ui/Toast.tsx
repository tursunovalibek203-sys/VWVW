import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.persistent) return;

    const duration = toast.duration || 5000;
    const interval = 50;
    const startedAt = Date.now();

    const closeTimer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(next);
    }, interval);

    return () => {
      clearTimeout(closeTimer);
      clearInterval(progressTimer);
    };
  }, [toast.id, toast.duration, toast.persistent, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`
      relative flex items-start gap-3 p-4 rounded-lg border shadow-lg
      transition-all duration-300 ease-in-out
      ${bgColors[toast.type]}
    `}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="mt-1 text-sm text-gray-600">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors"
        aria-label="Close notification"
        title="Close"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>

      {!toast.persistent && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-300 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-gray-500 transition-all ease-linear"
            style={{ width: `${progress}%` }} // eslint-disable-line react/no-inline-styles
          />
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast context and hook
interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience functions
export const toast = {
  success: (title: string, message?: string) => ({
    type: 'success' as const,
    title,
    message,
  }),
  error: (title: string, message?: string) => ({
    type: 'error' as const,
    title,
    message,
  }),
  warning: (title: string, message?: string) => ({
    type: 'warning' as const,
    title,
    message,
  }),
  info: (title: string, message?: string) => ({
    type: 'info' as const,
    title,
    message,
  }),
};
