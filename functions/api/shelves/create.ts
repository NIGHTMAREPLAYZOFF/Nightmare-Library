/**
 * Create Shelf API
 * POST /api/shelves/create - Create new shelf
 */

interface Env {
  DB: D1Database;
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

    // Get max position
    const maxPos = await env.DB.prepare(`
      SELECT MAX(position) as max_pos FROM shelves
    `).first() as { max_pos: number | null } | null;

    const position = (maxPos?.max_pos ?? -1) + 1;

    await env.DB.prepare(`
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
