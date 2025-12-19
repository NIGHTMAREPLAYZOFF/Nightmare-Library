/**
 * Get Book API
 * GET /api/books/get?id=xxx - Get book file for reading
 */

import { downloadFile, getStorageConfigs } from '../../storage-proxy';
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
    // Create database router
    const router = createDatabaseRouter(env);
    const db = router.queryForBook(bookId);

    // Get book details
    const bookResult = await db.prepare(`
      SELECT
        b.id, b.title, b.author, b.tags, b.cover_url, b.file_type,
        b.file_size, b.total_pages, b.uploaded_at, b.last_read_at,
        b.storage_provider, b.storage_id
      FROM books b
      WHERE b.id = ?
    `).bind(bookId).first();

    if (!bookResult) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Book not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get progress
    const progressResult = await db.prepare(`
      SELECT percent, current_page, current_chapter, last_read_at
      FROM progress
      WHERE book_id = ?
    `).bind(bookId).first();

    // Get settings
    const settingsResult = await db.prepare(`
      SELECT reader_theme, reader_font_size
      FROM settings
      WHERE id = 1
    `).first();

    const storageConfigs = await getStorageConfigs(env as unknown as Record<string, string>);

    return new Response(JSON.stringify({
      success: true,
      book: bookResult,
      progress: progressResult || { percent: 0, current_page: 1 },
      settings: settingsResult ? {
        readerTheme: settingsResult.reader_theme,
        fontSize: settingsResult.reader_font_size
      } : {
        readerTheme: 'obsidian',
        fontSize: 16
      },
      storageConfigs
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get book error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to load book'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};