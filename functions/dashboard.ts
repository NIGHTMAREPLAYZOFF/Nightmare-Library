/// <reference lib="dom" />
/// <reference lib="webworker" />

export const onRequest: PagesFunction = async (context) => {
  try {
    // Fetch the static HTML file from the public directory
    const response = await context.env.ASSETS.fetch(new URL('./frontend/dashboard.html', context.request.url));
    
    if (!response.ok) {
      return new Response('Dashboard not found', { status: 404 });
    }

    // Clone and modify headers for no-cache
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Cache-Control', 'no-cache, must-revalidate');
    newResponse.headers.set('Content-Type', 'text/html; charset=utf-8');
    
    return newResponse;
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response('Server error', { status: 500 });
  }
};
