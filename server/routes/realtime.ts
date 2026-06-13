import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { realtimeEvents, EVENT_TYPES } from '../utils/eventEmitter.js';
import { logger } from '../utils/logger.js';
import { VALIDATED_JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// SSE authentication middleware (supports both header and query param)
const authenticateSSE = (req: Request, res: Response, next: Function) => {
  try {
    // Try header first, then query param (for SSE compatibility)
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, VALIDATED_JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// SSE endpoint for real-time product updates
router.get('/events', authenticateSSE, (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  logger.info('SSE client connected', { userId: (req as any).user?.id });

  // Event handler
  const sendEvent = (data: any) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error('Error sending SSE event', { error });
    }
  };

  // Subscribe to all product events
  realtimeEvents.on(EVENT_TYPES.PRODUCT_CREATED, sendEvent);
  realtimeEvents.on(EVENT_TYPES.PRODUCT_UPDATED, sendEvent);
  realtimeEvents.on(EVENT_TYPES.PRODUCT_DELETED, sendEvent);
  realtimeEvents.on(EVENT_TYPES.STOCK_ADJUSTED, sendEvent);
  realtimeEvents.on(EVENT_TYPES.PRODUCT_SETTINGS_CHANGED, sendEvent);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeEvents.off(EVENT_TYPES.PRODUCT_CREATED, sendEvent);
    realtimeEvents.off(EVENT_TYPES.PRODUCT_UPDATED, sendEvent);
    realtimeEvents.off(EVENT_TYPES.PRODUCT_DELETED, sendEvent);
    realtimeEvents.off(EVENT_TYPES.STOCK_ADJUSTED, sendEvent);
    realtimeEvents.off(EVENT_TYPES.PRODUCT_SETTINGS_CHANGED, sendEvent);
    logger.info('SSE client disconnected', { userId: (req as any).user?.id });
  });

  // Handle errors
  req.on('error', (error) => {
    clearInterval(heartbeat);
    logger.error('SSE connection error', { error });
  });
});

export default router;
