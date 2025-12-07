
/**
 * List Annotations API
 * GET /api/annotations/list - Get all annotations for a book
 */

interface Env {
  DB: D1Database;
  KV_CACHE: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const bookId = url.searchParams.get('bookId');

    if (!bookId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Book ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check cache
    const cacheKey = `annotations:${bookId}`;
    const cached = await env.KV_CACHE.get(cacheKey, 'json');
    
    if (cached) {
      return new Response(JSON.stringify({
        success: true,
        annotations: cached
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB.prepare(`
      SELECT id, book_id, chapter, position, type, color, text, note, created_at, updated_at
      FROM annotations
      WHERE book_id = ?
      ORDER BY created_at DESC
    `).bind(bookId).all();

    const annotations = result.results || [];

    // Cache for 5 minutes
    await env.KV_CACHE.put(cacheKey, JSON.stringify(annotations), {
      expirationTtl: 300
    });

    return new Response(JSON.stringify({
      success: true,
      annotations
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('List annotations error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to load annotations'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
