/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Hono API Router for Nightmare Library
 * Unified error handling, health checks, and API consolidation
 */
import { Hono } from 'hono';

interface Env {
  PASSWORD: string;
  JWT_SECRET: string;
  KV_SESSIONS: KVNamespace;
  KV_RATE_LIMIT: KVNamespace;
  DB_1?: D1Database;
  DB_2?: D1Database;
  DB_3?: D1Database;
  DB_4?: D1Database;
  DB_5?: D1Database;
  DB_6?: D1Database;
  DB_7?: D1Database;
  DB_8?: D1Database;
  DB_9?: D1Database;
  DB_10?: D1Database;
}

const api = new Hono<{ Bindings: Env }>();

// Global error handler
api.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ 
    success: false, 
    message: 'API Error', 
    error: err.message 
  }, 500);
});

// Health check endpoint
api.get('/health', (c) => {
  return c.json({ 
    success: true, 
    status: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
api.get('/api', (c) => {
  return c.json({
    success: true,
    name: 'Nightmare Library API',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'POST /api/auth',
      'GET/POST /api/books/*',
      'GET/POST /api/shelves/*',
      'GET/POST /api/settings/*'
    ]
  });
});

// Export for Cloudflare Pages
export default api;
