
/**
 * Book Restore API
 * POST /api/books/restore - Restore a deleted book
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { bookData: any };
    const { bookData } = body;

    if (!bookData || !bookData.id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid book data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Restore book
    await env.DB.prepare(`
      INSERT INTO books (id, title, author, file_path, file_type, cover_path, tags, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      bookData.id,
      bookData.title,
      bookData.author,
      bookData.file_path,
      bookData.file_type,
      bookData.cover_path,
      bookData.tags,
      bookData.uploaded_at || Date.now()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Book restored'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Restore error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to restore book'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
