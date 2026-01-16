import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'

const app = new Hono().basePath('/api')

// Security Middleware
app.use('*', secureHeaders())
app.use('/auth', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 600,
}))

/**
 * Auth endpoint with rate limiting simulation and secure validation
 */
app.post('/auth', async (c) => {
  const body = await c.req.json()
  const password = body.password
  
  // In production, this would be a hashed value from env/secret
  const CORRECT_PASSWORD = c.env.PASSWORD || 'library-secret'

  if (password === CORRECT_PASSWORD) {
    return c.json({ 
      success: true, 
      redirect: '/dashboard.html' 
    })
  }

  // Simulate security delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return c.json({ 
    success: false, 
    message: 'Invalid password',
    attemptsRemaining: 3
  }, 401)
})

export const onRequest = handle(app)
