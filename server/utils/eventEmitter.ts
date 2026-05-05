import { EventEmitter } from 'events';
import { logger } from './logger.js';

// Global event emitter for real-time updates
export const realtimeEvents = new EventEmitter();

// Event types
export const EVENT_TYPES = {
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  STOCK_ADJUSTED: 'stock:adjusted',
  PRODUCT_SETTINGS_CHANGED: 'product:settings:changed',
} as const;

// Emit product change event
export const emitProductChange = (type: string, product: any) => {
  const eventData = {
    type,
    product,
    timestamp: new Date().toISOString(),
  };
  
  realtimeEvents.emit(type, eventData);
  realtimeEvents.emit('product:all', eventData); // General channel
  
  logger.debug('Product change emitted', { type, productId: product?.id });
};

// Get connected clients count (for monitoring)
export const getConnectedClients = () => {
  return realtimeEvents.listenerCount('product:all');
};
