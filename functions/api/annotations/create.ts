
/**
 * Create Annotation API
 * POST /api/annotations/create - Create highlight/note/bookmark
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as {
      bookId: string;
      chapter?: string;
      position: string;
      type: 'highlight' | 'note' | 'bookmark';
      color?: string;
      text?: string;
      note?: string;
    };

    const { bookId, chapter, position, type, color, text, note } = body;

    if (!bookId || !position || !type) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const annotationId = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO annotations (id, book_id, chapter, position, type, color, text, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      annotationId,
      bookId,
      chapter || null,
      position,
      type,
      color || '#bb86fc',
      text || null,
      note || null,
      now,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      annotation: {
        id: annotationId,
        bookId,
        type,
        position
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Annotation creation error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to create annotation'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
