
import { generateBookCardSnippet } from '../../html-snippets';

export async function onRequest(context: any) {
  const { params, env } = context;
  const bookId = params.id;

  try {
    // Fetch book from D1
    const result = await env.DB.prepare(
      'SELECT cover_url FROM books WHERE id = ?'
    ).bind(bookId).first();

    if (!result || !result.cover_url) {
      // Return fallback image
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/frontend/assets/broken-image.svg' }
      });
    }

    // Fetch from storage provider via storage-proxy
    const coverResponse = await fetch(result.cover_url);
    
    return new Response(coverResponse.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/frontend/assets/broken-image.svg' }
    });
  }
}
