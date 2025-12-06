/**
 * Update Book API
 * PUT /api/books/update - Update book metadata
 */

interface Env {
  DB: D1Database;
  KV_CACHE: KVNamespace;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { 
      id?: string;
      title?: string;
      author?: string;
      tags?: string;
    };

    const { id, title, author, tags } = body;

    if (!id) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Title is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update book
    await env.DB.prepare(`
      UPDATE books 
      SET title = ?, author = ?, tags = ?
      WHERE id = ?
    `).bind(title, author || null, tags || null, id).run();

    // Clear cache
    await env.KV_CACHE.delete('books_list');
    await env.KV_CACHE.delete(`book_${id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Update failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
