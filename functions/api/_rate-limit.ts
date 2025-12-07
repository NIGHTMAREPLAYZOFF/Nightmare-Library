
/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per IP
 */

interface Env {
  KV_RATE_LIMIT: KVNamespace;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000 // 1 minute
};

export async function checkRateLimit(
  env: Env,
  clientIP: string,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_LIMIT
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:${endpoint}:${clientIP}`;
  const now = Date.now();
  
  const data = await env.KV_RATE_LIMIT.get(key);
  let requests: { count: number; resetAt: number };

  if (data) {
    requests = JSON.parse(data);
    
    if (now > requests.resetAt) {
      requests = { count: 1, resetAt: now + config.windowMs };
    } else {
      requests.count++;
    }
  } else {
    requests = { count: 1, resetAt: now + config.windowMs };
  }

  await env.KV_RATE_LIMIT.put(key, JSON.stringify(requests), {
    expirationTtl: Math.ceil(config.windowMs / 1000)
  });

  const allowed = requests.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - requests.count);

  return { allowed, remaining, resetAt: requests.resetAt };
}
