/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * List Shelves API
 * GET /api/shelves/list - Returns all shelves with book IDs
 */

import { generateShelfItemHtml } from '../../html-snippets';
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Get all shelves
    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Shelves in DB_1
    const shelvesResult = await db.prepare(`
      SELECT id, name, color, position, created_at
      FROM shelves
      ORDER BY position ASC, created_at ASC
    `).all();

    if (!shelvesResult.success) {
      throw new Error('Database query failed');
    }

    // Get book IDs for each shelf
    const shelves = await Promise.all(
      (shelvesResult.results || []).map(async (shelf: any) => {
        const booksResult = await db.prepare(`
          SELECT book_id FROM shelf_items WHERE shelf_id = ?
        `).bind(shelf.id).all();

        return {
          id: shelf.id,
          name: shelf.name,
          color: shelf.color,
          position: shelf.position,
          created_at: shelf.created_at,
          bookIds: (booksResult.results || []).map((r: any) => r.book_id),
          snippet_html: generateShelfItemHtml({
            id: shelf.id,
            name: shelf.name,
            color: shelf.color
          })
        };
      })
    );

    return new Response(JSON.stringify({ success: true, shelves }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('List shelves error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to load shelves',
      shelves: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
