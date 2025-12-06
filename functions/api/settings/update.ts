/**
 * Update Settings API
 * PUT /api/settings/update - Update user settings
 */

interface Env {
  DB: D1Database;
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

    await env.DB.prepare(`
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
