/**
 * Delete Book API
 * DELETE /api/books/delete - Delete a book
 */

import { deleteFile, getStorageConfigs, StorageConfig } from '../../storage-proxy';
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
  STORAGE_PROVIDER_1_TYPE: string;
  STORAGE_PROVIDER_1_BUCKET: string;
  STORAGE_PROVIDER_1_ACCESS_KEY: string;
  STORAGE_PROVIDER_1_SECRET_KEY: string;
  STORAGE_PROVIDER_1_ENDPOINT?: string;
  STORAGE_PROVIDER_1_REGION?: string;
  GITHUB_FALLBACK_TOKEN: string;
  GITHUB_FALLBACK_OWNER: string;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { id?: string };
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create database router
    const router = createDatabaseRouter(env);
    const db = router.queryForBook(id);

    // Get book info for storage deletion
    const book = await db.prepare(`
      SELECT storage_provider, storage_id FROM books WHERE id = ?
    `).bind(id).first() as { storage_provider: string; storage_id: string } | null;

    if (!book) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Book not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from storage using the new storage configs
    const storageConfigs = getStorageConfigs(env as unknown as Record<string, string>);
    let storageConfig: StorageConfig | undefined;

    for (const config of storageConfigs) {
      if (config.type === book.storage_provider) {
        storageConfig = config;
        break;
      }
    }

    if (!storageConfig) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Storage provider ${book.storage_provider} not found` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await deleteFile(storageConfig, book.storage_id);

    // Cascade delete from database
    // 1. Delete from shelf_items
    await db.prepare('DELETE FROM shelf_items WHERE book_id = ?').bind(id).run();

    // 2. Delete from progress
    await db.prepare('DELETE FROM progress WHERE book_id = ?').bind(id).run();

    // 3. Delete from books
    await db.prepare('DELETE FROM books WHERE id = ?').bind(id).run();

    // 4. Clear cache
    await env.KV_CACHE.delete('books_list');
    await env.KV_CACHE.delete(`book_${id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Delete failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};