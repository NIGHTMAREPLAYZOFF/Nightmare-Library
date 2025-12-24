/// <reference lib="dom" />
/// <reference lib="webworker" />

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  
  try {
    const readerHtml = await context.env.ASSETS.get('frontend/reader.html');
    
    if (!readerHtml) {
      return new Response('Reader not found', { status: 404 });
    }

    return new Response(readerHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Reader error:', error);
    return new Response('Server error', { status: 500 });
  }
};
