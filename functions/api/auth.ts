/**
 * Authentication Handler
 * POST /api/auth - Login with password
 */

interface Env {
  PASSWORD: string;
  JWT_SECRET: string;
  KV_SESSIONS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { password?: string };
    const { password } = body;

    if (!password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Password is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password
    if (password !== env.PASSWORD) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid password' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate session token
    const sessionToken = generateToken();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store session in KV
    await env.KV_SESSIONS.put(sessionToken, JSON.stringify({
      createdAt: Date.now(),
      expiresAt
    }), {
      expirationTtl: 86400 // 24 hours in seconds
    });

    // Set cookie
    const cookie = [
      `NMLR_SESSION=${sessionToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
      'Max-Age=86400'
    ].join('; ');

    return new Response(JSON.stringify({ 
      success: true,
      redirect: '/frontend/dashboard.html'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Authentication failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
