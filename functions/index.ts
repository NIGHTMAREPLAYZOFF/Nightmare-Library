/// <reference lib="dom" />
/// <reference lib="webworker" />
import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-pages';

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

interface SessionData {
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper: Check session validity
async function validateSession(c: any): Promise<string | null> {
  const cookies = c.req.header('Cookie') || '';
  const sessionToken = cookies
    .split(';')
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith('NMLR_SESSION='))
    ?.split('=')[1];

  if (!sessionToken) return null;

  try {
    const sessionData = await c.env.KV_SESSIONS.get(sessionToken);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData) as SessionData;
    const clientIP = c.req.header('CF-Connecting-IP') || 
                     c.req.header('X-Forwarded-For') || 
                     'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';

    if (session.expiresAt && Date.now() > session.expiresAt) {
      await c.env.KV_SESSIONS.delete(sessionToken);
      return null;
    }

    if (session.ip !== clientIP || session.userAgent !== userAgent) {
      await c.env.KV_SESSIONS.delete(sessionToken);
      return null;
    }

    return sessionToken;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Middleware: Protect routes
app.use('/dashboard', async (c, next) => {
  const session = await validateSession(c);
  if (!session) return c.redirect('/');
  await next();
});

app.use('/reader', async (c, next) => {
  const session = await validateSession(c);
  if (!session) return c.redirect('/');
  await next();
});

app.use('/api/*', async (c, next) => {
  const session = await validateSession(c);
  if (!session) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }
  await next();
});

// Public routes
app.get('/', serveStatic({ path: './index.html' }));

// Protected page routes
app.get('/dashboard', serveStatic({ path: './frontend/dashboard.html' }));
app.get('/reader', serveStatic({ path: './frontend/reader.html' }));

// Static assets (no cache)
app.use('/frontend/*', async (c) => {
  const path = c.req.path;
  
  // Assets can be cached, HTML cannot
  if (path.endsWith('.html')) {
    c.header('Cache-Control', 'no-cache, must-revalidate');
  }
  
  return serveStatic({ path: '.' })(c);
});

// API routes - import from existing functions
export default app;
