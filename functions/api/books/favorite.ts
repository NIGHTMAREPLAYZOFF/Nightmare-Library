/// <reference lib="dom" />
/// <reference lib="webworker" />
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
    const body = await request.json() as { book_id?: string; is_favorite?: boolean };
    const { book_id, is_favorite } = body;

    if (!book_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const router = createDatabaseRouter(env);
    const db = router.queryForBook(book_id);
    await db.prepare(`
      UPDATE books SET is_favorite = ? WHERE id = ?
    `).bind(is_favorite ? 1 : 0, book_id).run();

    return new Response(JSON.stringify({ 
      success: true,
      is_favorite
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
