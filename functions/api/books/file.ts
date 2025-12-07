
/**
 * Book File Download Endpoint
 * Returns the actual EPUB/PDF file for reading
 */

interface Env {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  KV_CACHE: KVNamespace;
  GDRIVE_ACCESS_TOKEN?: string;
  DROPBOX_ACCESS_TOKEN?: string;
  MEGA_EMAIL?: string;
  MEGA_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const bookId = params.id || url.searchParams.get('id');

  if (!bookId) {
    return new Response(JSON.stringify({ success: false, message: 'Book ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get book metadata from DB
    const book = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(bookId).first();

    if (!book) {
      return new Response(JSON.stringify({ success: false, message: 'Book not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check cache first
    const cacheKey = `book_file_${bookId}`;
    const cached = await env.KV_CACHE.get(cacheKey, 'arrayBuffer');
    
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': book.file_type === 'epub' ? 'application/epub+zip' : 'application/pdf',
          'Content-Disposition': `inline; filename="${book.title || 'book'}.${book.file_type}"`,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    // Download from storage provider
    const { getStorageConfigs } = await import('../../storage-proxy');
    const configs = getStorageConfigs(env);

    let fileData: ArrayBuffer | null = null;

    for (const config of configs) {
      try {
        if (config.type === 'github' && config.githubToken && config.githubOwner) {
          const repo = config.githubRepo || 'nightmare-library-storage';
          const path = `books/${bookId}.${book.file_type}`;
          
          const response = await fetch(
            `https://api.github.com/repos/${config.githubOwner}/${repo}/contents/${path}`,
            {
              headers: {
                'Authorization': `token ${config.githubToken}`,
                'Accept': 'application/vnd.github.v3.raw'
              }
            }
          );

          if (response.ok) {
            fileData = await response.arrayBuffer();
            break;
          }
        }
        // Add other storage providers as needed
      } catch (err) {
        console.error(`Storage provider ${config.type} failed:`, err);
        continue;
      }
    }

    if (!fileData) {
      return new Response(JSON.stringify({ success: false, message: 'File not found in storage' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cache for future requests
    await env.KV_CACHE.put(cacheKey, fileData, { expirationTtl: 86400 });

    return new Response(fileData, {
      headers: {
        'Content-Type': book.file_type === 'epub' ? 'application/epub+zip' : 'application/pdf',
        'Content-Disposition': `inline; filename="${book.title || 'book'}.${book.file_type}"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });

  } catch (error) {
    console.error('Error retrieving book file:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
