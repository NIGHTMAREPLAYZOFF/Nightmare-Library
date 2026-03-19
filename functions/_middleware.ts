/// <reference lib="dom" />
/// <reference lib="webworker" />

interface Env {
  KV_SESSIONS: KVNamespace;
  PASSWORD: string;
  ENVIRONMENT: string;
}

interface SessionData {
  createdAt: number;
  expiresAt: number;
  userAgent: string;
}

const PUBLIC_PATHS = [
  '/',
  '/index.html',
  '/api/auth',
];

const PROTECTED_PATHS = [
  '/dashboard.html',
  '/reader.html',
  '/api/',
];

const STATIC_EXTENSIONS = ['.css', '.js', '.svg', '.ico', '.png', '.jpg', '.webp', '.woff', '.woff2'];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Always allow static assets
  if (STATIC_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return next();
  }

  // Always allow public paths
  if (PUBLIC_PATHS.includes(path)) {
    return next();
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p));
  if (!isProtected) {
    return next();
  }

  // Extract session cookie
  const cookies = request.headers.get('Cookie') || '';
  const sessionToken = cookies
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('NMLR_SESSION='))
    ?.split('=')[1];

  if (!sessionToken) {
    return redirectToLogin(request, path);
  }

  // If KV is not configured, allow any session cookie through (dev mode)
  if (!env.KV_SESSIONS) {
    return next();
  }

  // Validate session from KV
  try {
    const sessionData = await env.KV_SESSIONS.get(sessionToken);
    if (!sessionData) {
      return redirectToLogin(request, path);
    }

    const session = JSON.parse(sessionData) as SessionData;

    if (session.expiresAt && Date.now() > session.expiresAt) {
      await env.KV_SESSIONS.delete(sessionToken);
      return redirectToLogin(request, path);
    }

    return next();
  } catch (error) {
    console.error('Session validation error:', error);
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ success: false, message: 'Authentication error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return redirectToLogin(request, path);
  }
};

function redirectToLogin(request: Request, path: string): Response {
  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return Response.redirect(new URL('/', request.url).toString(), 302);
}
