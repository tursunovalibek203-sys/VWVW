import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export type RealtimeEventType = 
  | 'product:created' 
  | 'product:updated' 
  | 'product:deleted' 
  | 'stock:adjusted' 
  | 'product:settings:changed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  product: any;
  timestamp: string;
}

export interface UseRealtimeOptions {
  onProductCreated?: (product: any) => void;
  onProductUpdated?: (product: any) => void;
  onProductDeleted?: (product: any) => void;
  onStockAdjusted?: (product: any) => void;
  onSettingsChanged?: (product: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  
  const { token } = useAuthStore();

  const connect = useCallback(() => {
    if (!token) {
      console.log('[Realtime] No token available, skipping connection');
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003';
    const url = `${apiUrl}/api/realtime/events`;
    
    // Create EventSource with token in query param (for SSE compatibility)
    const es = new EventSource(`${url}?token=${token}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      reconnectAttemptsRef.current = 0;
      options.onConnected?.();
    };

    es.onmessage = (event) => {
      try {
        // Skip heartbeat messages
        if (event.data.startsWith(':heartbeat')) {
          return;
        }

        const data = JSON.parse(event.data) as RealtimeEvent;
        
        // Skip connection message
        if ((data as any).type === 'connected') {
          return;
        }

        // Route events to appropriate handlers
        switch (data.type) {
          case 'product:created':
            options.onProductCreated?.(data.product);
            break;
          case 'product:updated':
            options.onProductUpdated?.(data.product);
            break;
          case 'product:deleted':
            options.onProductDeleted?.(data.product);
            break;
          case 'stock:adjusted':
            options.onStockAdjusted?.(data.product);
            break;
          case 'product:settings:changed':
            options.onSettingsChanged?.(data.product);
            break;
        }
      } catch (error) {
        // Event parsing error
      }
    };

    es.onerror = (error) => {
      options.onError?.(error);
      
      // Close current connection
      es.close();
      eventSourceRef.current = null;
      options.onDisconnected?.();

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [token, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: !!eventSourceRef.current,
    reconnect: connect,
    disconnect,
  };
}

export default useRealtime;
