/**
 * List Books API
 * GET /api/books/list - Returns all books with HTML snippets
 */

import { generateBookCardHtml, type Book } from '../../html-snippets';
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
  KV_CACHE: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Try cache first
    const cached = await env.KV_CACHE.get('books_list', 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create database router
    const router = createDatabaseRouter(env);

    // Query all databases
    const books = await router.queryAll(`
      SELECT 
        b.id, b.title, b.author, b.tags, b.cover_url, b.file_type,
        b.file_size, b.total_pages, b.uploaded_at, b.last_read_at,
        COALESCE(p.percent, 0) as progress
      FROM books b
      LEFT JOIN progress p ON b.id = p.book_id
      ORDER BY b.uploaded_at DESC
    `);

    const mappedBooks = books.map((row: any) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      tags: row.tags,
      cover_url: row.cover_url,
      file_type: row.file_type,
      file_size: row.file_size,
      total_pages: row.total_pages,
      uploaded_at: row.uploaded_at,
      last_read_at: row.last_read_at,
      progress: row.progress,
      snippet_html: generateBookCardHtml({
        id: row.id,
        title: row.title,
        author: row.author,
        tags: row.tags,
        cover_url: row.cover_url,
        file_type: row.file_type,
        progress: row.progress
      })
    }));

    const response = { success: true, books: mappedBooks };

    // Cache for 5 minutes
    await env.KV_CACHE.put('books_list', JSON.stringify(response), {
      expirationTtl: 300
    });

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('List books error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to load books',
      books: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
