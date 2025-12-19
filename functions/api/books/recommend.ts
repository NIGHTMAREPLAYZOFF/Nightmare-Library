
/**
 * Book Recommendations API
 * GET /api/books/recommend?bookId=xxx - Get AI-powered recommendations
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
  const { request, env } = context;
  const url = new URL(request.url);
  const bookId = url.searchParams.get('bookId');

  try {
    // Get all books
    const router = createDatabaseRouter(env);
    const results = await router.queryAll(`
      SELECT id, title, author, tags
      FROM books
      ORDER BY uploaded_at DESC
    `);
    
    if (!results) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to load books'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    const result = { success: true, results };

    if (!result.success || !result.results) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to load books'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const books = result.results;
    const currentBook = books.find((b: any) => b.id === bookId);

    if (!currentBook) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Book not found'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Simple recommendation algorithm based on tags and author
    const recommendations = books
      .filter((b: any) => b.id !== bookId)
      .map((b: any) => {
        let score = 0;
        
        // Same author
        if (b.author && b.author === currentBook.author) {
          score += 5;
        }

        // Shared tags
        const currentTags = (typeof currentBook.tags === 'string' ? currentBook.tags : '').split(',').map((t: string) => t.trim().toLowerCase());
        const bookTags = (typeof b.tags === 'string' ? b.tags : '').split(',').map((t: string) => t.trim().toLowerCase());
        const sharedTags = currentTags.filter((t: string) => bookTags.includes(t));
        score += sharedTags.length * 2;

        return { ...b, score };
      })
      .filter((b: any) => b.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    return new Response(JSON.stringify({
      success: true,
      recommendations
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to generate recommendations'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
