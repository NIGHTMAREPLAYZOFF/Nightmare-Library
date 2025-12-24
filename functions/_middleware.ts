/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Cloudflare Pages Middleware
 * Handles authentication for protected routes
 */

interface Env {
  KV_SESSIONS: KVNamespace;
  JWT_SECRET: string;
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

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/index.html',
  '/api/auth',
  '/frontend/assets/favicon.svg',
  '/frontend/assets/broken-image.svg'
];

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/reader',
  '/frontend/dashboard.html',
  '/frontend/reader.html',
  '/frontend/scripts/',
  '/frontend/styles/',
  '/api/'
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  let path = url.pathname;

  // Normalize dashboard and reader routes to serve HTML
  if (path === '/dashboard') {
    path = '/frontend/dashboard.html';
  } else if (path === '/reader') {
    path = '/frontend/reader.html';
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(p => path === p || path.startsWith('/frontend/assets/'))) {
    return next();
  }

  // Check for session cookie on protected routes
  if (PROTECTED_PATHS.some(p => path.startsWith(p)) || path === '/frontend/dashboard.html' || path === '/frontend/reader.html') {
    const cookies = request.headers.get('Cookie') || '';
    const sessionToken = cookies
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('NMLR_SESSION='))
      ?.split('=')[1];

    if (!sessionToken) {
      // Redirect to login for page requests, 401 for API
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return Response.redirect(new URL('/', request.url).toString(), 302);
    }

    // Validate session
    try {
      const sessionData = await env.KV_SESSIONS.get(sessionToken);
      if (!sessionData) {
        // Session expired or invalid
        if (path.startsWith('/api/')) {
          return new Response(JSON.stringify({ success: false, message: 'Session expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return Response.redirect(new URL('/', request.url).toString(), 302);
      }

      // Parse session and validate metadata
      const session = JSON.parse(sessionData) as SessionData;
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                       request.headers.get('X-Forwarded-For') || 
                       'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      // Check if session expired
      if (session.expiresAt && Date.now() > session.expiresAt) {
        await env.KV_SESSIONS.delete(sessionToken);
        if (path.startsWith('/api/')) {
          return new Response(JSON.stringify({ success: false, message: 'Session expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return Response.redirect(new URL('/', request.url).toString(), 302);
      }

      // Validate IP and User Agent for session hijacking protection
      if (session.ip !== clientIP || session.userAgent !== userAgent) {
        // Session potentially hijacked - invalidate it
        await env.KV_SESSIONS.delete(sessionToken);
        if (path.startsWith('/api/')) {
          return new Response(JSON.stringify({ success: false, message: 'Session invalid' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return Response.redirect(new URL('/', request.url).toString(), 302);
      }

      // Session valid, continue
      return next();
    } catch (error) {
      console.error('Session validation error:', error);
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ success: false, message: 'Authentication error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return Response.redirect(new URL('/', request.url).toString(), 302);
    }
  }

  return next();
};
