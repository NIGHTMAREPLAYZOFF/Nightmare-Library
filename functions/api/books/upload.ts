/**
 * Upload Book API
 * POST /api/books/upload - Upload new book file
 */

import { uploadFile, getStorageConfig, getGitHubFallbackConfig } from '../../storage-proxy';
import { generateBookCardHtml } from '../../html-snippets';

interface Env {
  DB: D1Database;
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
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

    // Generate unique ID
    const bookId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileType = isEpub ? 'epub' : 'pdf';
    const contentType = isEpub ? 'application/epub+zip' : 'application/pdf';

    // Get file data
    const fileData = await file.arrayBuffer();

    // Try primary storage
    let storageConfig = getStorageConfig(env as unknown as Record<string, string>);
    let uploadResult = await uploadFile(storageConfig, `${bookId}.${fileType}`, fileData, contentType);

    // Fallback to GitHub if primary fails
    if (!uploadResult.success) {
      console.log('Primary storage failed, using GitHub fallback');
      storageConfig = getGitHubFallbackConfig(env as unknown as Record<string, string>);
      uploadResult = await uploadFile(storageConfig, `${bookId}.${fileType}`, fileData, contentType);
    }

    if (!uploadResult.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Failed to store file: ' + uploadResult.error 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert into database
    const now = Date.now();
    await env.DB.prepare(`
      INSERT INTO books (id, title, author, storage_provider, storage_id, file_type, file_size, tags, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      bookId,
      title,
      author,
      storageConfig.type,
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
