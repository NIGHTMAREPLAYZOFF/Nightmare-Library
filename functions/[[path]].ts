import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono().basePath('/api')

app.post('/auth', async (c) => {
  const { password } = await c.req.json()
  
  // Basic security: In production, use environment variables for this
  const CORRECT_PASSWORD = 'library-secret' 

  if (password === CORRECT_PASSWORD) {
    return c.json({ 
      success: true, 
      redirect: '/dashboard.html' 
    })
  }

  return c.json({ 
    success: false, 
    message: 'Invalid password',
    attemptsRemaining: 3
  }, 401)
})

export const onRequest = handle(app)
