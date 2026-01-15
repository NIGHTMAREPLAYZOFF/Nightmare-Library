/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Create Shelf API
 * POST /api/shelves/create - Create new shelf
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
    const body = await request.json() as { name?: string; color?: string };
    const { name, color } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Shelf name is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const shelfId = `shelf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Shelves in DB_1

    // Get max position
    const maxPos = await db.prepare(`
      SELECT MAX(position) as max_pos FROM shelves
    `).first() as { max_pos: number | null } | null;

    const position = (maxPos?.max_pos ?? -1) + 1;

    await db.prepare(`
      INSERT INTO shelves (id, name, color, position, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(shelfId, name.trim(), color || '#bb86fc', position, now).run();

    return new Response(JSON.stringify({ 
      success: true,
      shelf: { id: shelfId, name: name.trim(), color: color || '#bb86fc', position }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create shelf error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to create shelf' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
