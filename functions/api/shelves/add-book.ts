/**
 * Add Book to Shelf API
 * POST /api/shelves/add-book - Add book to shelf
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { bookId?: string; shelfId?: string };
    const { bookId, shelfId } = body;

    if (!bookId || !shelfId) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book ID and Shelf ID are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already in shelf
    const existing = await env.DB.prepare(`
      SELECT 1 FROM shelf_items WHERE shelf_id = ? AND book_id = ?
    `).bind(shelfId, bookId).first();

    if (existing) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book is already in this shelf' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO shelf_items (shelf_id, book_id, added_at)
      VALUES (?, ?, ?)
    `).bind(shelfId, bookId, now).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Add to shelf error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to add book to shelf' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
