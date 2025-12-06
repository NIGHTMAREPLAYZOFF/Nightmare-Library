/**
 * Get Settings API
 * GET /api/settings/get - Returns user settings
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const settings = await env.DB.prepare(`
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
