import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'

type Bindings = {
  PASSWORD: string
  JWT_SECRET: string
  ENVIRONMENT: string
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
  KV_SESSIONS: KVNamespace
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

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:"],
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
    if (c.env.ENVIRONMENT === 'production') {
      return origin.endsWith('.pages.dev') ? origin : null
    }
    return origin
  },
  allowMethods: ['POST', 'GET', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.use('*', async (c, next) => {
  await next()
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
 * Generates a secure random session token
 */
const generateToken = (): string => {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post('/auth', async (c) => {
  try {
    const body = await c.req.json()
    const { password } = body

    if (!password) {
      return c.json({ success: false, message: 'Password is required' }, 400)
    }

    const correctPassword = c.env.PASSWORD
    if (!correctPassword) {
      return c.json({ success: false, message: 'Server misconfiguration: PASSWORD secret not set' }, 500)
    }

    if (password !== correctPassword) {
      return c.json({ success: false, message: 'Invalid password' }, 401)
    }

    // Create session token
    const token = generateToken()
    const sessionData = JSON.stringify({
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      userAgent: c.req.header('User-Agent') || 'unknown',
    })

    // Store in KV if available, otherwise use cookie only
    if (c.env.KV_SESSIONS) {
      await c.env.KV_SESSIONS.put(token, sessionData, { expirationTtl: 7 * 24 * 60 * 60 })
    }

    // Set secure session cookie
    const isProduction = c.env.ENVIRONMENT === 'production'
    const cookieFlags = isProduction
      ? `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
      : `HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`

    c.header('Set-Cookie', `NMLR_SESSION=${token}; ${cookieFlags}`)
    return c.json({ success: true, redirect: '/dashboard.html' })
  } catch (e) {
    return c.json({ success: false, message: 'Malformed request' }, 400)
  }
})

app.post('/logout', async (c) => {
  const cookies = c.req.header('Cookie') || ''
  const token = cookies.split(';').map(s => s.trim()).find(s => s.startsWith('NMLR_SESSION='))?.split('=')[1]
  if (token && c.env.KV_SESSIONS) {
    await c.env.KV_SESSIONS.delete(token)
  }
  c.header('Set-Cookie', 'NMLR_SESSION=; HttpOnly; Path=/; Max-Age=0')
  return c.json({ success: true })
})

// ─── BOOKS ───────────────────────────────────────────────────────────────────

app.get('/books', async (c) => {
  const allBooks: any[] = []
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
  return c.json(allBooks.sort((a: any, b: any) => b.uploaded_at - a.uploaded_at))
})

app.get('/books/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDB(c.env, id)
  if (!db) return c.json({ error: 'Database not available' }, 503)
  try {
    const book = await db.prepare('SELECT * FROM books WHERE id = ?').bind(id).first()
    if (!book) return c.json({ error: 'Book not found' }, 404)
    return c.json(book)
  } catch (e) {
    return c.json({ error: 'Failed to fetch book' }, 500)
  }
})

app.delete('/books/:id', async (c) => {
  const id = c.req.param('id')
  const db = getDB(c.env, id)
  if (!db) return c.json({ error: 'Database not available' }, 503)
  try {
    await db.prepare('DELETE FROM books WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Failed to delete book' }, 500)
  }
})

export const onRequest = handle(app)
