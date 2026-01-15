/**
 * Reading Progress API
 * GET /api/books/progress?bookId=xxx - Get progress
 * POST /api/books/progress - Save progress
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
  KV_CACHE?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId');

  if (!bookId) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Book ID is required' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const router = createDatabaseRouter(env);
    const db = router.queryForBook(bookId);
    const progress = await db.prepare(`
      SELECT percent, current_page, current_chapter, last_read_at
      FROM progress WHERE book_id = ?
    `).bind(bookId).first();

    return new Response(JSON.stringify({ 
      success: true,
      progress: progress || { percent: 0, current_page: 1 }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to get progress' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as {
      bookId?: string;
      percent?: number;
      currentPage?: number;
      currentChapter?: string;
    };

    const { bookId, percent, currentPage, currentChapter } = body;

    if (!bookId) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Date.now();

    const router = createDatabaseRouter(env);
    const db = router.queryForBook(bookId);

    // Upsert progress
    await db.prepare(`
      INSERT INTO progress (book_id, percent, current_page, current_chapter, last_read_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(book_id) DO UPDATE SET
        percent = excluded.percent,
        current_page = excluded.current_page,
        current_chapter = excluded.current_chapter,
        last_read_at = excluded.last_read_at
    `).bind(bookId, percent || 0, currentPage || null, currentChapter || null, now).run();

    // Update book's last_read_at
    await db.prepare(`
      UPDATE books SET last_read_at = ? WHERE id = ?
    `).bind(now, bookId).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Save progress error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to save progress' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
