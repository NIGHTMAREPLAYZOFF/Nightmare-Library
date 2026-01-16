import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

/**
 * Sharded Database Router
 * Routes to DB_1 through DB_10 based on content ID
 */
const getDB = (env: any, id: string) => {
  const shard = (Math.abs(id.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 10) + 1
  return env[`DB_${shard}`]
}

app.get('/books', async (c) => {
  const results = []
  for (let i = 1; i <= 10; i++) {
    const db = c.env[`DB_${i}`]
    if (db) {
      const { results: shardResults } = await db.prepare('SELECT * FROM books').all()
      results.push(...shardResults)
    }
  }
  return c.json(results)
})

app.post('/auth', async (c) => {
  const { password } = await c.req.json()
  if (password === c.env.PASSWORD) {
    return c.json({ success: true })
  }
  return c.json({ success: false }, 401)
})

export const onRequest = handle(app)
