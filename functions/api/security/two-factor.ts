/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Two-Factor Authentication API
 * Optional 2FA to lock all books under user-defined password
 */

import { createDatabaseRouter } from '../../db-router';

interface Env {
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
  KV_SESSIONS: KVNamespace;
  KV_CACHE: KVNamespace;
}

interface TwoFactorSettings {
  enabled: boolean;
  password_hash: string;
  created_at: number;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'nightmare-library-2fa-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  // Constant-time comparison
  if (passwordHash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < passwordHash.length; i++) {
    result |= passwordHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

// GET - Check 2FA status
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Settings stored in DB_1
    
    const settings = await db.prepare(
      'SELECT * FROM settings WHERE id = 1'
    ).first() as { two_factor_enabled?: number } | null;

    return new Response(JSON.stringify({
      success: true,
      enabled: Boolean(settings?.two_factor_enabled)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to get 2FA status'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Enable/Disable/Verify 2FA
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as {
      action: 'enable' | 'disable' | 'verify';
      password?: string;
      newPassword?: string;
    };

    const { action, password, newPassword } = body;

    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Settings stored in DB_1

    // Get current session token
    const cookies = request.headers.get('Cookie') || '';
    const sessionToken = cookies
      .split(';')
      .map((c: string) => c.trim())
      .find((c: string) => c.startsWith('NMLR_SESSION='))
      ?.split('=')[1];

    if (!sessionToken) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Not authenticated'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'enable': {
        if (!newPassword || newPassword.length < 4) {
          return new Response(JSON.stringify({
            success: false,
            message: '2FA password must be at least 4 characters'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const passwordHash = await hashPassword(newPassword);

        // Update settings
        await db.prepare(`
          UPDATE settings 
          SET two_factor_enabled = 1, 
              two_factor_hash = ?,
              updated_at = ?
          WHERE id = 1
        `).bind(passwordHash, Date.now()).run();

        // Store 2FA verified state in session
        const sessionData = await env.KV_SESSIONS.get(sessionToken);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.twoFactorVerified = true;
          await env.KV_SESSIONS.put(sessionToken, JSON.stringify(session), {
            expirationTtl: 86400
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: '2FA enabled successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'disable': {
        if (!password) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Current 2FA password required'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Get stored hash
        const settings = await db.prepare(
          'SELECT two_factor_hash FROM settings WHERE id = 1'
        ).first() as { two_factor_hash: string } | null;

        if (!settings?.two_factor_hash) {
          return new Response(JSON.stringify({
            success: false,
            message: '2FA is not enabled'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const isValid = await verifyPassword(password, settings.two_factor_hash);
        if (!isValid) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Invalid 2FA password'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Disable 2FA
        await db.prepare(`
          UPDATE settings 
          SET two_factor_enabled = 0, 
              two_factor_hash = NULL,
              updated_at = ?
          WHERE id = 1
        `).bind(Date.now()).run();

        return new Response(JSON.stringify({
          success: true,
          message: '2FA disabled successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'verify': {
        if (!password) {
          return new Response(JSON.stringify({
            success: false,
            message: '2FA password required'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Get stored hash
        const settings = await db.prepare(
          'SELECT two_factor_hash, two_factor_enabled FROM settings WHERE id = 1'
        ).first() as { two_factor_hash: string; two_factor_enabled: number } | null;

        if (!settings?.two_factor_enabled || !settings.two_factor_hash) {
          return new Response(JSON.stringify({
            success: true,
            verified: true,
            message: '2FA is not enabled'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const isValid = await verifyPassword(password, settings.two_factor_hash);
        if (!isValid) {
          return new Response(JSON.stringify({
            success: false,
            verified: false,
            message: 'Invalid 2FA password'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Store verification in session
        const sessionData = await env.KV_SESSIONS.get(sessionToken);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          session.twoFactorVerified = true;
          session.twoFactorVerifiedAt = Date.now();
          await env.KV_SESSIONS.put(sessionToken, JSON.stringify(session), {
            expirationTtl: 86400
          });
        }

        return new Response(JSON.stringify({
          success: true,
          verified: true,
          message: '2FA verified successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid action'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('2FA error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to process 2FA request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
