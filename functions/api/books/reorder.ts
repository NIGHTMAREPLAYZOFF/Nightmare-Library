
/**
 * Book Reorder API
 * POST /api/books/reorder - Reorder books in library
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { bookIds: string[] };
    const { bookIds } = body;

    if (!bookIds || !Array.isArray(bookIds)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid book IDs'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update sort_order for each book
    const updatePromises = bookIds.map((id, index) => {
      return env.DB.prepare(`
        UPDATE books 
        SET sort_order = ? 
        WHERE id = ?
      `).bind(index, id).run();
    });

    await Promise.all(updatePromises);

    return new Response(JSON.stringify({
      success: true,
      message: 'Book order updated'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Reorder error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to reorder books'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
