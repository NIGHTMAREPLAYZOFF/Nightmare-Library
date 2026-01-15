/**
 * Get Settings API
 * GET /api/settings/get - Returns user settings
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const router = createDatabaseRouter(env);
    const db = router.getAllDatabases()[0]; // Settings in DB_1
    const settings = await db.prepare(`
      SELECT reader_theme, reader_font_size, sidebar_collapsed
      FROM settings WHERE id = 1
    `).first();

    return new Response(JSON.stringify({ 
      success: true,
      settings: settings ? {
        readerTheme: settings.reader_theme,
        fontSize: settings.reader_font_size,
        sidebarCollapsed: settings.sidebar_collapsed
      } : {
        readerTheme: 'obsidian',
        fontSize: 16,
        sidebarCollapsed: false
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to load settings' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
