/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Add Book to Shelf API
 * POST /api/shelves/add-book - Add book to shelf
 */

import { createDatabaseRouter } from '../../db-router';

interface Env {
  DB_1?: D1Database;
  DB_2?: D1Database;
  DB_3?: D1Database;
  DB_4?: D1Database;
  DB_5?: D1Database;
  DB_6?: D1Database;
  DB_7?: D1Database;
  DB_8?: D1Database;
  DB_9?: D1Database;
  DB_10?: D1Database;
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

    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Shelves in DB_1
    
    // Check if already in shelf
    const existing = await db.prepare(`
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

    await db.prepare(`
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
