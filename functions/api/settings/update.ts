/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Update Settings API
 * PUT /api/settings/update - Update user settings
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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as {
      readerTheme?: string;
      fontSize?: number;
      sidebarCollapsed?: boolean;
    };

    const { readerTheme, fontSize, sidebarCollapsed } = body;
    const now = Date.now();

    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Settings in DB_1
    
    await db.prepare(`
      UPDATE settings SET
        reader_theme = COALESCE(?, reader_theme),
        reader_font_size = COALESCE(?, reader_font_size),
        sidebar_collapsed = COALESCE(?, sidebar_collapsed),
        updated_at = ?
      WHERE id = 1
    `).bind(
      readerTheme || null,
      fontSize || null,
      sidebarCollapsed !== undefined ? (sidebarCollapsed ? 1 : 0) : null,
      now
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to update settings' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
