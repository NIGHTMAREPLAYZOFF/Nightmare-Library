import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'

/**
 * Cloudflare Bindings and Secrets Interface
 * All configurations are injected from the Cloudflare Dashboard
 */
type Bindings = {
  // Authentication & Security
  PASSWORD: string
  JWT_SECRET: string
  ENVIRONMENT: string

  // KV Namespaces
  KV_SESSIONS: KVNamespace
  KV_RATE_LIMIT: KVNamespace

  // Storage Providers (Secrets)
  GDRIVE_ACCESS_TOKEN: string
  DROPBOX_ACCESS_TOKEN: string
  ONEDRIVE_ACCESS_TOKEN: string
  PCLOUD_ACCESS_TOKEN: string
  BOX_ACCESS_TOKEN: string
  YANDEX_ACCESS_TOKEN: string
  KOOFR_ACCESS_TOKEN: string
  B2_APPLICATION_KEY: string
  B2_KEY_ID: string
  MEGA_EMAIL: string
  MEGA_PASSWORD: string
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string

  // Database Bindings (D1) — 10 shards
  DB_1: D1Database
  DB_2: D1Database
  DB_3: D1Database
  DB_4: D1Database
  DB_5: D1Database
  DB_6: D1Database
  DB_7: D1Database
  DB_8: D1Database
  DB_9: D1Database
  DB_10: D1Database
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// Security Middleware
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    upgradeInsecureRequests: [],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xXSSProtection: '1; mode=block',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
}))
app.use('*', cors({
  origin: (origin, c) => {
    // In production, restrict to actual domain. In dev, allow localhost.
    if (c.env.ENVIRONMENT === 'production') {
      return origin.endsWith('.pages.dev') ? origin : null
    }
    return origin
  },
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Environment check to prevent leakage
app.use('*', async (c, next) => {
  await next()
  c.header('X-Environment', c.env.ENVIRONMENT || 'production')
  // Ensure no dev-only headers are exposed
  c.res.headers.delete('X-Powered-By')
})

/**
 * Sharded Database Router
 * Distributes books across 10 D1 databases using consistent hashing
 */
const getDB = (env: Bindings, bookId: string): D1Database => {
  const hash = bookId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const shard = (Math.abs(hash) % 10) + 1
  return (env as any)[`DB_${shard}`]
}

/**
 * Generate a cryptographically secure random session token
 */
const generateSessionToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

app.post('/auth', async (c) => {
  try {
    const { password } = await c.req.json()
    if (!password) {
      return c.json({ success: false, message: 'Password required' }, 400)
    }

    // Rate limiting check
    const clientIP = c.req.header('CF-Connecting-IP') || 'unknown'
    if (c.env.KV_RATE_LIMIT) {
      const attempts = await c.env.KV_RATE_LIMIT.get(`auth:${clientIP}`)
      if (attempts && parseInt(attempts) >= 10) {
        return c.json({ success: false, message: 'Too many attempts. Try again later.', locked: true }, 429)
      }
    }

    if (password !== c.env.PASSWORD) {
      // Increment failed attempts
      if (c.env.KV_RATE_LIMIT) {
        const attempts = await c.env.KV_RATE_LIMIT.get(`auth:${clientIP}`)
        const count = (parseInt(attempts || '0') + 1)
        await c.env.KV_RATE_LIMIT.put(`auth:${clientIP}`, String(count), { expirationTtl: 900 })
        const remaining = Math.max(0, 10 - count)
        return c.json({ success: false, message: 'Invalid credentials', attemptsRemaining: remaining }, 401)
      }
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    // Clear rate limit on success
    if (c.env.KV_RATE_LIMIT) {
      await c.env.KV_RATE_LIMIT.delete(`auth:${clientIP}`)
    }

    // Create session in KV
    const sessionToken = generateSessionToken()
    const sessionData = JSON.stringify({
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      ip: clientIP,
      userAgent: c.req.header('User-Agent') || 'unknown'
    })

    if (c.env.KV_SESSIONS) {
      await c.env.KV_SESSIONS.put(`session:${sessionToken}`, sessionData, {
        expirationTtl: 7 * 24 * 60 * 60
      })
    }

    const isProd = c.env.ENVIRONMENT === 'production'
    const cookieFlags = `HttpOnly; Path=/; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}${isProd ? '; Secure' : ''}`

    return c.json(
      { success: true, redirect: '/dashboard.html' },
      200,
      { 'Set-Cookie': `NMLR_SESSION=${sessionToken}; ${cookieFlags}` }
    )
  } catch (e) {
    return c.json({ success: false, message: 'Malformed request' }, 400)
  }
})

app.post('/auth/logout', async (c) => {
  const cookies = c.req.header('Cookie') || ''
  const sessionToken = cookies
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('NMLR_SESSION='))
    ?.split('=')[1]

  if (sessionToken && c.env.KV_SESSIONS) {
    await c.env.KV_SESSIONS.delete(`session:${sessionToken}`)
  }

  return c.json(
    { success: true },
    200,
    { 'Set-Cookie': 'NMLR_SESSION=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict' }
  )
})

app.get('/books', async (c) => {
  const allBooks: any[] = []
  // Aggregate metadata from all 10 sharded databases
  for (let i = 1; i <= 10; i++) {
    const db = (c.env as any)[`DB_${i}`] as D1Database
    if (db) {
      try {
        const { results } = await db.prepare('SELECT * FROM books ORDER BY uploaded_at DESC').all()
        if (results) allBooks.push(...results)
      } catch (e) {
        console.error(`DB_${i} retrieval failed:`, e)
      }
    }
  }
  return c.json(allBooks.sort((a, b) => b.uploaded_at - a.uploaded_at))
})

export const onRequest = handle(app)
