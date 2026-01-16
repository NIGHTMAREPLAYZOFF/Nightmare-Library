import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono().basePath('/api')

app.use('*', secureHeaders())

/**
 * Sharded D1 Router
 */
const getDB = (env: any, id: string) => {
  // Consistent hashing to select DB_1 through DB_10
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const shard = (hash % 10) + 1
  return env[`DB_${shard}`]
}

app.post('/auth', async (c) => {
  const { password } = await c.req.json()
  if (password === c.env.PASSWORD) {
    return c.json({ success: true })
  }
  return c.json({ success: false, message: 'Invalid password' }, 401)
})

app.get('/books', async (c) => {
  const allBooks = []
  // Aggregating from all 10 sharded D1 databases
  for (let i = 1; i <= 10; i++) {
    const db = c.env[`DB_${i}`]
    if (db) {
      try {
        const { results } = await db.prepare('SELECT * FROM books').all()
        allBooks.push(...results)
      } catch (e) {
        console.error(`Error querying DB_${i}:`, e)
      }
    }
  }
  return c.json(allBooks)
})

export const onRequest = handle(app)
