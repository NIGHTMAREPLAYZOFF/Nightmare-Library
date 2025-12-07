/**
 * Upload Book API
 * POST /api/books/upload - Upload new book file
 */

import { uploadFile, getStorageConfigs } from '../../storage-proxy';
import { generateBookCardHtml } from '../../html-snippets';
import { checkRateLimit } from '../_rate-limit';

interface Env {
  DB: D1Database;
  KV_CACHE: KVNamespace;
  GDRIVE_ACCESS_TOKEN?: string;
  GDRIVE_FOLDER_ID?: string;
  DROPBOX_ACCESS_TOKEN?: string;
  DROPBOX_PATH?: string;
  MEGA_EMAIL?: string;
  MEGA_PASSWORD?: string;
  MEGA_FOLDER_ID?: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO?: string;
}

async function indexBookContent(db: D1Database, bookId: string, fileData: ArrayBuffer, fileType: string) {
  try {
    const decoder = new TextDecoder();
    const text = decoder.decode(fileData);
    
    // Extract text content in chunks
    const chunkSize = 1000;
    const chunks: string[] = [];
    
    if (fileType === 'epub') {
      // Simple EPUB text extraction
      const contentMatches = text.matchAll(/<p[^>]*>(.*?)<\/p>/gs);
      let position = 0;
      
      for (const match of contentMatches) {
        const content = match[1].replace(/<[^>]+>/g, '').trim();
        if (content.length > 50) {
          chunks.push(content);
          
          // Insert into index
          await db.prepare(`
            INSERT INTO book_content_index (book_id, chapter, snippet, content_text, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            bookId,
            'Chapter',
            content.substring(0, 100),
            content,
            position++,
            Date.now()
          ).run();
        }
      }
    }
  } catch (error) {
    console.error('Indexing error:', error);
  }
}

async function extractMetadataFromFile(fileData: ArrayBuffer, fileType: string) {
  const decoder = new TextDecoder();
  const text = decoder.decode(fileData.slice(0, 10000));
  
  const metadata: any = {
    title: null,
    author: null,
    pageCount: 0
  };

  if (fileType === 'epub') {
    const titleMatch = text.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) metadata.title = titleMatch[1];
    
    const authorMatch = text.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
    if (authorMatch) metadata.author = authorMatch[1];
  }
  
  return metadata;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // This outer try block now handles all errors in the function body below
  try {
    // Rate limiting: 10 uploads per minute
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(env as any, clientIP, 'upload', {
      maxRequests: 10,
      windowMs: 60000
    });

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Too many uploads. Please try again later.',
        resetAt: rateLimit.resetAt
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- START: Main upload logic (formerly inside the unnecessary inner 'try') ---
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

    // Extract metadata using WASM for better performance
    let extractedMetadata = null;
    try {
      // Note: WASM module would be imported from compiled wasm-dist
      // For now, we'll use basic extraction as fallback
      const metadata = await extractMetadataFromFile(fileData, fileType);
      extractedMetadata = metadata;
    } catch (error) {
      console.error('WASM extraction failed, using fallback:', error);
    }

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

    // Placeholder for filePath and coverPath, as they are not directly available from uploadResult in this snippet
    // In a real implementation, these would be derived from uploadResult.storageId or similar.
    const filePath = uploadResult.storageId || uploadResult.url || '';
    const coverPath = null; // Assuming cover image is not generated or uploaded here.

    // Auto-generate tags if none provided using basic genre detection
    let finalTags = tags;
    if (!tags || tags.trim().length === 0) {
      const lowerTitle = title.toLowerCase();
      const lowerAuthor = (author || '').toLowerCase();
      const autoTags = [];

      // Simple genre detection based on keywords
      if (lowerTitle.includes('fantasy') || lowerTitle.includes('magic') || lowerTitle.includes('dragon')) {
        autoTags.push('fantasy');
      }
      if (lowerTitle.includes('science') || lowerTitle.includes('space') || lowerTitle.includes('future')) {
        autoTags.push('scifi');
      }
      if (lowerTitle.includes('mystery') || lowerTitle.includes('detective') || lowerTitle.includes('crime')) {
        autoTags.push('mystery');
      }
      if (lowerTitle.includes('romance') || lowerTitle.includes('love')) {
        autoTags.push('romance');
      }
      if (lowerTitle.includes('history') || lowerTitle.includes('historical')) {
        autoTags.push('history');
      }

      finalTags = autoTags.length > 0 ? autoTags.join(',') : 'general';
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
      storageType,
      uploadResult.storageId,
      fileType,
      fileData.byteLength,
      finalTags,
      now
    ).run();

    // Index content for full-text search (async, don't wait)
    indexBookContent(env.DB, bookId, fileData, fileType).catch(err => 
      console.error('Content indexing failed:', err)
    );

    // Clear cache
    await env.KV_CACHE.delete('books_list');

    const book = {
      id: bookId,
      title,
      author,
      tags: finalTags, // Use finalTags here
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
    // --- END: Main upload logic ---


  } catch (error) { // The single, unified catch block
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
