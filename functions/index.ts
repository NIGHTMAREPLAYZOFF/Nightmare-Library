/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Hono API Router for Nightmare Library
 * Consolidates all API endpoints with unified middleware and error handling
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

// API error handler middleware
api.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ success: false, message: 'API Error', error: err.message }, 500);
});

// Health check endpoint
api.get('/health', (c) => {
  return c.json({ success: true, status: 'API is running' });
});

// Export for Cloudflare Pages
export default api;
