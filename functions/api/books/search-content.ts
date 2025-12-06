
/**
 * Full-Text Search API
 * POST /api/books/search-content - Search inside book contents
 */

interface Env {
  DB: D1Database;
  KV_CACHE: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { query?: string; bookId?: string };
    const { query, bookId } = body;

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Query must be at least 2 characters' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check cache first
    const cacheKey = `search:${bookId || 'all'}:${query}`;
    const cached = await env.KV_CACHE.get(cacheKey, 'json');
    
    if (cached) {
      return new Response(JSON.stringify({ 
        success: true, 
        results: cached,
        cached: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Search in indexed content
    let searchResults;
    
    if (bookId) {
      searchResults = await env.DB.prepare(`
        SELECT book_id, chapter, snippet, position
        FROM book_content_index
        WHERE book_id = ? AND content_text LIKE ?
        ORDER BY position
        LIMIT 50
      `).bind(bookId, `%${query}%`).all();
    } else {
      searchResults = await env.DB.prepare(`
        SELECT book_id, chapter, snippet, position
        FROM book_content_index
        WHERE content_text LIKE ?
        ORDER BY book_id, position
        LIMIT 100
      `).bind(`%${query}%`).all();
    }

    const results = searchResults.results || [];

    // Cache for 10 minutes
    await env.KV_CACHE.put(cacheKey, JSON.stringify(results), {
      expirationTtl: 600
    });

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      count: results.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Search failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
