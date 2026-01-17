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
  
  // Database Bindings (D1)
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
app.use('*', secureHeaders())
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

app.post('/auth', async (c) => {
  try {
    const { password } = await c.req.json()
    // Validation using Cloudflare Dashboard Secrets
    if (password === c.env.PASSWORD) {
      return c.json({ success: true, redirect: '/dashboard.html' })
    }
    return c.json({ success: false, message: 'Invalid credentials' }, 401)
  } catch (e) {
    return c.json({ success: false, message: 'Malformed request' }, 400)
  }
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
