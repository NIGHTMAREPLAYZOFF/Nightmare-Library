/**
 * Cloudflare Pages Middleware
 * Handles authentication for protected routes
 */

interface Env {
  KV_SESSIONS: KVNamespace;
  JWT_SECRET: string;
}

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/index.html',
  '/api/auth',
  '/frontend/assets/favicon.svg',
  '/frontend/assets/broken-image.svg'
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => path === p || path.startsWith('/frontend/assets/'))) {
    return next();
  }

  // Check for session cookie on protected routes
  if (path.startsWith('/frontend/') || path.startsWith('/api/')) {
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
      const session = await env.KV_SESSIONS.get(sessionToken);
      if (!session) {
        // Session expired or invalid
        if (path.startsWith('/api/')) {
          return new Response(JSON.stringify({ success: false, message: 'Session expired' }), {
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
