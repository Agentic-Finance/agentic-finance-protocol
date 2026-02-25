/**
 * SSE Server - Server-Sent Events for Real-Time Dashboard
 *
 * Subscribes to the protocol event bus and pushes events to
 * connected dashboard clients via SSE. Includes heartbeat keepalive.
 */

import { Request, Response, Router } from 'express';
import { eventBus, ProtocolEvent } from './event-bus';

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds

export const sseRouter = Router();

// Active SSE connections
let connectionCount = 0;

/**
 * GET /api/live/stream - SSE event stream
 */
sseRouter.get('/api/live/stream', (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  connectionCount++;
  console.log(`[sse] Client connected (total: ${connectionCount})`);

  // Send initial state
  const initialData = {
    type: 'init',
    stats: eventBus.getStats(),
    recentEvents: eventBus.getRecentEvents(20),
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Subscribe to protocol events
  const onEvent = (event: ProtocolEvent) => {
    try {
      res.write(`event: protocol-event\ndata: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      // Client disconnected
    }
  };
  eventBus.on('protocol-event', onEvent);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now(), connections: connectionCount })}\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_INTERVAL);

  // Cleanup on disconnect
  req.on('close', () => {
    connectionCount--;
    clearInterval(heartbeat);
    eventBus.off('protocol-event', onEvent);
    console.log(`[sse] Client disconnected (total: ${connectionCount})`);
  });
});

/**
 * GET /api/live/events - Get recent events (REST fallback)
 */
sseRouter.get('/api/live/events', (_req: Request, res: Response) => {
  const limit = Number(_req.query.limit) || 50;
  res.json({
    events: eventBus.getRecentEvents(limit),
    stats: eventBus.getStats(),
    connections: connectionCount,
  });
});

/**
 * GET /api/live/stats - Get protocol stats
 */
sseRouter.get('/api/live/stats', (_req: Request, res: Response) => {
  res.json({
    stats: eventBus.getStats(),
    connections: connectionCount,
    timestamp: Date.now(),
  });
});

/**
 * POST /api/notify - Push a notification event into the SSE bus
 *
 * Called by the dashboard backend (notify.ts) to broadcast
 * stream events to connected SSE clients in real-time.
 *
 * Body: { type: string, data: { wallet, title, message, ... } }
 */
sseRouter.post('/api/notify', (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data' });
    }

    eventBus.emitEvent({
      type: type as any,
      data: {
        ...data,
        source: 'notification',
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
