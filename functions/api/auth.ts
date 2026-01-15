/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Authentication Handler with Security Measures
 * POST /api/auth - Login with password
 */

import { createDatabaseRouter } from '../../db-router';

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

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

interface SessionPayload {
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') || 
                     'unknown';
    
    // Check rate limiting
    const rateLimitKey = `login_attempts:${clientIP}`;
    const attemptData = await env.KV_RATE_LIMIT.get(rateLimitKey);
    
    let attempts: LoginAttempt = attemptData 
      ? JSON.parse(attemptData)
      : { count: 0, firstAttempt: Date.now() };

    // Check if account is locked
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60);
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Too many failed attempts. Account locked for ${remainingTime} more minutes.`,
        locked: true
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Reset attempts if window expired
    if (Date.now() - attempts.firstAttempt > ATTEMPT_WINDOW) {
      attempts = { count: 0, firstAttempt: Date.now() };
    }

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

    // Validate password length (prevent timing attacks on empty passwords)
    if (password.length < 1 || password.length > 128) {
      attempts.count++;
      await env.KV_RATE_LIMIT.put(rateLimitKey, JSON.stringify(attempts), {
        expirationTtl: 3600
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid password' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password (constant-time comparison would be ideal)
    if (password !== env.PASSWORD) {
      attempts.count++;
      
      // Lock account if max attempts reached
      if (attempts.count >= MAX_ATTEMPTS) {
        attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
      }
      
      await env.KV_RATE_LIMIT.put(rateLimitKey, JSON.stringify(attempts), {
        expirationTtl: 3600
      });

      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid password',
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Successful login - clear rate limit
    await env.KV_RATE_LIMIT.delete(rateLimitKey);

    // Generate secure session token
    const sessionToken = await generateSecureToken();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store session with metadata
    const sessionPayload: SessionPayload = {
      createdAt: Date.now(),
      expiresAt,
      ip: clientIP,
      userAgent: request.headers.get('User-Agent') || 'unknown'
    };
    await env.KV_SESSIONS.put(sessionToken, JSON.stringify(sessionPayload), {
      expirationTtl: 86400 // 24 hours in seconds
    });

    // Set secure cookie with additional flags
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
        'Set-Cookie': cookie,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
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

async function generateSecureToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
}
