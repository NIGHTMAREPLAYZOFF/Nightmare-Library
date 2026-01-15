/**
 * Cloudflare Workers Helper Utilities (TypeScript)
 * Utilities for common Cloudflare Workers patterns
 */

/**
 * CORS response helper
 */
export function createCORSResponse(
    body: any,
    status: number = 200,
    headers?: Record<string, string>
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            ...headers
        }
    });
}

/**
 * Handle CORS preflight requests
 */
export function handleCORSPreflight(request: Request): Response | null {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }
    return null;
}

/**
 * Parse request body safely
 */
export async function parseRequestBody<T>(request: Request): Promise<T | null> {
    try {
        if (request.method === 'GET' || request.method === 'HEAD') {
            return null;
        }
        const contentType = request.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            return (await request.json()) as T;
        }
        return null;
    } catch (error) {
        console.error('Parse body error:', error);
        return null;
    }
}

/**
 * Hash API routes to database shards (consistent hashing)
 */
export function hashToShard(key: string, shardCount: number = 10): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % shardCount;
}

/**
 * Rate limit helper using Cloudflare Cache API
 */
export async function checkRateLimit(
    cache: Cache,
    key: string,
    limit: number = 100,
    windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const cacheKey = new Request(`https://rate-limit/${key}`, {
        method: 'GET'
    });

    const cached = await cache.match(cacheKey);
    let count = 0;
    
    if (cached) {
        count = parseInt(cached.headers.get('X-Count') || '0');
    }

    count++;
    const allowed = count <= limit;
    const reset = Math.floor(Date.now() / 1000) + windowSeconds;

    if (allowed) {
        const response = new Response(null, {
            headers: {
                'X-Count': String(count),
                'Cache-Control': `max-age=${windowSeconds}`
            }
        });
        await cache.put(cacheKey, response);
    }

    return {
        allowed,
        remaining: Math.max(0, limit - count),
        reset
    };
}

/**
 * Stream a large response efficiently
 */
export async function streamResponse(
    generator: AsyncGenerator<string>,
    contentType: string = 'application/json'
): Promise<Response> {
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of generator) {
                    controller.enqueue(new TextEncoder().encode(chunk));
                }
            } catch (error) {
                controller.error(error);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': contentType,
            'Transfer-Encoding': 'chunked'
        }
    });
}

/**
 * Request context helper
 */
export interface RequestContext {
    method: string;
    url: URL;
    headers: Record<string, string>;
    ip: string;
    country?: string;
    colo?: string;
}

export function extractContext(request: Request): RequestContext {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    
    request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });

    return {
        method: request.method,
        url,
        headers,
        ip: headers['cf-connecting-ip'] || 'unknown',
        country: headers['cf-ipcountry'],
        colo: headers['cf-ray']?.split('-')[1]
    };
}

/**
 * Environment variable helper with validation
 */
export function getEnvVar(key: string, defaultValue?: string): string {
    if (typeof process !== 'undefined' && process.env?.[key]) {
        return process.env[key];
    }
    if (defaultValue) return defaultValue;
    throw new Error(`Missing environment variable: ${key}`);
}

/**
 * D1 error helper
 */
export function handleD1Error(error: unknown): Response {
    console.error('D1 Error:', error);
    
    let message = 'Database error';
    let status = 500;

    if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            message = 'Resource already exists';
            status = 409;
        } else if (error.message.includes('no such table')) {
            message = 'Database schema error';
            status = 500;
        }
    }

    return createCORSResponse({ success: false, message }, status);
}

/**
 * Middleware pattern for request processing
 */
export type RequestHandler = (context: {
    request: Request;
    env: Record<string, any>;
    next?: () => Promise<Response>;
}) => Promise<Response>;

export function compose(...handlers: RequestHandler[]): RequestHandler {
    return async (context) => {
        let index = -1;

        const next = async (): Promise<Response> => {
            index++;
            if (index >= handlers.length) {
                return createCORSResponse({ error: 'No handler found' }, 404);
            }
            return await handlers[index]({ ...context, next });
        };

        return next();
    };
}
