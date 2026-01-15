/**
 * Upload Book API
 * POST /api/books/upload - Upload new book file
 */

import { uploadFile, getStorageConfigs } from '../../storage-proxy';
import { generateBookCardHtml } from '../../html-snippets';

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
  // Storage providers (10 total with cascading fallback)
  GDRIVE_ACCESS_TOKEN?: string;
  GDRIVE_FOLDER_ID?: string;
  DROPBOX_ACCESS_TOKEN?: string;
  DROPBOX_PATH?: string;
  ONEDRIVE_ACCESS_TOKEN?: string;
  ONEDRIVE_FOLDER_ID?: string;
  PCLOUD_ACCESS_TOKEN?: string;
  PCLOUD_FOLDER_ID?: string;
  BOX_ACCESS_TOKEN?: string;
  BOX_FOLDER_ID?: string;
  YANDEX_ACCESS_TOKEN?: string;
  YANDEX_PATH?: string;
  KOOFR_ACCESS_TOKEN?: string;
  KOOFR_MOUNT_ID?: string;
  KOOFR_PATH?: string;
  B2_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_ID?: string;
  B2_BUCKET_NAME?: string;
  MEGA_EMAIL?: string;
  MEGA_PASSWORD?: string;
  MEGA_FOLDER_ID?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as unknown as File | null;
    const title = formData.get('title') as string;
    const author = formData.get('author') as string || null;
    const tags = formData.get('tags') as string || null;

    if (!file) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No file provided' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Title is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isEpub = fileName.endsWith('.epub');
    const isPdf = fileName.endsWith('.pdf');

    if (!isEpub && !isPdf) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Only EPUB and PDF files are supported' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create database router
    const router = createDatabaseRouter(env);

    // Generate unique ID
    const bookId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileType = isEpub ? 'epub' : 'pdf';
    const contentType = isEpub ? 'application/epub+zip' : 'application/pdf';

    // Get file data
    const fileData = await file.arrayBuffer();

    // Get cascading storage configs (GDrive -> Dropbox -> Mega -> GitHub)
    const storageConfigs = getStorageConfigs(env as unknown as Record<string, string>);
    
    if (storageConfigs.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No storage providers configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Try uploading with cascading fallback
    const uploadResult = await uploadFile(storageConfigs, `${bookId}.${fileType}`, fileData, contentType);

    if (!uploadResult.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'All storage providers failed: ' + uploadResult.error 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine which storage type was used
    const storageType = uploadResult.storageId?.includes('/') ? 'github' : 
                       uploadResult.url?.includes('drive.google.com') ? 'gdrive' :
                       uploadResult.url?.includes('dropbox') ? 'dropbox' : 'mega';

    // Insert into database
    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO books (id, title, author, storage_provider, storage_id, file_type, file_size, tags, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      bookId,
      title,
      author,
      storageType,
      uploadResult.storageId,
      fileType,
      fileData.byteLength,
      tags,
      now
    ).run();

    // Clear cache
    await env.KV_CACHE.delete('books_list');

    const book = {
      id: bookId,
      title,
      author,
      tags,
      file_type: fileType,
      progress: 0,
      cover_url: null
    };

    return new Response(JSON.stringify({ 
      success: true,
      book: {
        ...book,
        snippet_html: generateBookCardHtml(book)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Upload failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
