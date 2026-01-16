import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { secureHeaders } from 'hono/secure-headers'

// Define the environment types for Cloudflare Bindings and Secrets
type Bindings = {
  PASSWORD: string
  JWT_SECRET: string
  SUPABASE_URL: string
  SUPABASE_KEY: string
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

app.use('*', secureHeaders())

/**
 * Sharded D1 Router
 */
const getDB = (env: Bindings, id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const shard = (Math.abs(hash) % 10) + 1
  return (env as any)[`DB_${shard}`] as D1Database
}

app.post('/auth', async (c) => {
  try {
    const { password } = await c.req.json()
    // Using c.env.PASSWORD which points to the Cloudflare Secret
    if (password === c.env.PASSWORD) {
      return c.json({ success: true })
    }
    return c.json({ success: false, message: 'Invalid password' }, 401)
  } catch (e) {
    return c.json({ success: false, message: 'Bad request' }, 400)
  }
})

app.get('/books', async (c) => {
  const allBooks = []
  for (let i = 1; i <= 10; i++) {
    const db = (c.env as any)[`DB_${i}`] as D1Database
    if (db) {
      try {
        const { results } = await db.prepare('SELECT * FROM books').all()
        if (results) allBooks.push(...results)
      } catch (e) {
        console.error(`Error querying DB_${i}:`, e)
      }
    }
  }
  return c.json(allBooks)
})

export const onRequest = handle(app)
