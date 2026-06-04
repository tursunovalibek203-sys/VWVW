import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Notification Types
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  LOADING = 'loading',
}

// Notification Position
export enum NotificationPosition {
  TOP_RIGHT = 'top-right',
  TOP_LEFT = 'top-left',
  TOP_CENTER = 'top-center',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_CENTER = 'bottom-center',
}

// Notification Interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
  onClose?: () => void;
  timestamp: Date;
  progress?: number;
}

// Notification Context Interface
export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
}

// Notification Context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Notification Provider Component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (if not persistent)
    if (!notification.persistent && notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration ?? 5000);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification?.onClose) {
        notification.onClose();
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, ...updates }
          : notification
      )
    );
  }, []);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    updateNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// Hook for using notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Notification Container Component
function NotificationContainer() {
  const { notifications } = useNotifications();
  const position = NotificationPosition.TOP_RIGHT;

  return createPortal(
    <div className={`notification-container notification-${position}`}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => notificationService.removeNotification(notification.id)}
        />
      ))}
    </div>,
    document.body
  );
}

// Notification Item Component
function NotificationItem({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);

    // Progress animation for auto-dismiss notifications
    if (notification.duration && notification.duration > 0 && !notification.persistent) {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 100 / (notification.duration! / 100);
        if (currentProgress >= 100) {
          setProgress(100);
          clearInterval(interval);
        } else {
          setProgress(currentProgress);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [notification.duration, notification.persistent]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getNotificationStyles = () => {
    const baseStyles = 'notification-item';
    const typeStyles = `notification-${notification.type}`;
    const visibleStyles = isVisible ? 'notification-visible' : 'notification-hidden';
    
    return `${baseStyles} ${typeStyles} ${visibleStyles}`;
  };

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return 'success-icon';
      case NotificationType.ERROR:
        return 'error-icon';
      case NotificationType.WARNING:
        return 'warning-icon';
      case NotificationType.INFO:
        return 'info-icon';
      case NotificationType.LOADING:
        return 'loading-icon';
      default:
        return 'info-icon';
    }
  };

  return (
    <div className={getNotificationStyles()}>
      <div className="notification-content">
        <div className="notification-icon">
          {getIcon()}
        </div>
        <div className="notification-body">
          <div className="notification-title">
            {notification.title}
          </div>
          <div className="notification-message">
            {notification.message}
          </div>
          {notification.action && (
            <button
              className="notification-action"
              onClick={() => {
                notification.action!.handler();
                handleClose();
              }}
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          className="notification-close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      {notification.duration && notification.duration > 0 && !notification.persistent && (
        <div className="notification-progress">
          <div 
            className="notification-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Professional Notification Service Class
export class ProfessionalNotificationService {
  private static instance: ProfessionalNotificationService;
  private context: NotificationContextType | null = null;

  static getInstance(): ProfessionalNotificationService {
    if (!ProfessionalNotificationService.instance) {
      ProfessionalNotificationService.instance = new ProfessionalNotificationService();
    }
    return ProfessionalNotificationService.instance;
  }

  // Set context (called by NotificationProvider)
  setContext(context: NotificationContextType): void {
    this.context = context;
  }

  // Success notification
  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: NotificationType.SUCCESS,
      title,
      message,
      ...options,
    });
  }

  // Error notification
  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: NotificationType.ERROR,
      title,
      message,
      persistent: true,
      ...options,
    });
  }

  // Warning notification
  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: NotificationType.WARNING,
      title,
      message,
      ...options,
    });
  }

  // Info notification
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: NotificationType.INFO,
      title,
      message,
      ...options,
    });
  }

  // Loading notification
  loading(title: string, message: string, options?: Partial<Notification>): string {
    return this.addNotification({
      type: NotificationType.LOADING,
      title,
      message,
      persistent: true,
      duration: 0,
      ...options,
    });
  }

  // Add custom notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    if (!this.context) {
      console.warn('Notification context not set. Please ensure NotificationProvider is used.');
      return '';
    }
    return this.context.addNotification(notification);
  }

  // Remove notification
  removeNotification(id: string): void {
    if (this.context) {
      this.context.removeNotification(id);
    }
  }

  // Update notification
  updateNotification(id: string, updates: Partial<Notification>): void {
    if (this.context) {
      this.context.updateNotification(id, updates);
    }
  }

  // Clear all notifications
  clearNotifications(): void {
    if (this.context) {
      this.context.clearNotifications();
    }
  }

  // Show operation result
  showOperationResult<T>(
    operation: () => Promise<T>,
    options: {
      loadingTitle?: string;
      loadingMessage?: string;
      successTitle?: string;
      successMessage?: string;
      errorTitle?: string;
    } = {}
  ): Promise<T> {
    const {
      loadingTitle = 'Amal bajarilmoqda...',
      loadingMessage = 'Iltimos, kuting',
      successTitle = 'Muvaffaqiyatli',
      successMessage = 'Amal muvaffaqiyatli bajarildi',
      errorTitle = 'Xatolik',
    } = options;

    const loadingId = this.loading(loadingTitle, loadingMessage);

    return operation()
      .then((result) => {
        this.removeNotification(loadingId);
        this.success(successTitle, successMessage);
        return result;
      })
      .catch((error) => {
        this.removeNotification(loadingId);
        this.error(errorTitle, error.message || 'Noma\'lum xatolik yuz berdi');
        throw error;
      });
  }

  // Show confirmation dialog
  showConfirmation(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): string {
    return this.addNotification({
      type: NotificationType.WARNING,
      title,
      message,
      persistent: true,
      duration: 0,
      action: {
        label: 'Tasdiqlash',
        handler: onConfirm,
      },
      onClose: onCancel,
    });
  }
}

// Create singleton instance
export const notificationService = ProfessionalNotificationService.getInstance();

// Convenience functions
export const notify = {
  success: (title: string, message: string, options?: Partial<Notification>) => 
    notificationService.success(title, message, options),
  error: (title: string, message: string, options?: Partial<Notification>) => 
    notificationService.error(title, message, options),
  warning: (title: string, message: string, options?: Partial<Notification>) => 
    notificationService.warning(title, message, options),
  info: (title: string, message: string, options?: Partial<Notification>) => 
    notificationService.info(title, message, options),
  loading: (title: string, message: string, options?: Partial<Notification>) => 
    notificationService.loading(title, message, options),
  remove: (id: string) => notificationService.removeNotification(id),
  clear: () => notificationService.clearNotifications(),
  showOperationResult: <T,>(operation: () => Promise<T>, options?: any) =>
    notificationService.showOperationResult(operation, options),
  showConfirmation: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) =>
    notificationService.showConfirmation(title, message, onConfirm, onCancel),
};

// Enhanced Notification Provider with context setup
export function EnhancedNotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, addNotification, removeNotification, clearNotifications, updateNotification } = useNotifications();

  // Set context for notification service
  useEffect(() => {
    notificationService.setContext({
      notifications,
      addNotification,
      removeNotification,
      clearNotifications,
      updateNotification,
    });
  }, [notifications, addNotification, removeNotification, clearNotifications, updateNotification]);

  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}

export default ProfessionalNotificationService;
