/// <reference lib="dom" />
/// <reference lib="webworker" />
/**
 * Reader Format Detection & Fallback Handler
 * Automatically selects best reader: EPUB → PDF → Text-Only
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
  const bookId = url.searchParams.get('id');

  if (!bookId) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Book ID is required' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const router = createDatabaseRouter(env);
    const db = router.queryForBook(bookId);

    const book = await db.prepare(`
      SELECT file_type, storage_provider, storage_id FROM books WHERE id = ?
    `).bind(bookId).first() as any;

    if (!book) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine optimal reader format
    let recommendedReader = 'text'; // fallback
    
    if (book.file_type === 'application/epub+zip' || book.file_type?.includes('epub')) {
      recommendedReader = 'epub';
    } else if (book.file_type === 'application/pdf' || book.file_type?.includes('pdf')) {
      recommendedReader = 'pdf';
    } else if (book.file_type?.includes('text') || book.file_type?.includes('plain')) {
      recommendedReader = 'text';
    }

    return new Response(JSON.stringify({
      success: true,
      reader: recommendedReader,
      fallbackChain: ['epub', 'pdf', 'text'], // try EPUB first, then PDF, then text-only
      book: {
        id: bookId,
        storageProvider: book.storage_provider,
        fileType: book.file_type
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Reader detection error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to determine reader format',
      fallbackReader: 'text'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
