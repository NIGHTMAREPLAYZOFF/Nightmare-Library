
interface Env {
  DB: D1Database;
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

    await env.DB.prepare(`
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
