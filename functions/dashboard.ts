/// <reference lib="dom" />
/// <reference lib="webworker" />

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  
  try {
    const dashboardHtml = await context.env.ASSETS.get('frontend/dashboard.html');
    
    if (!dashboardHtml) {
      return new Response('Dashboard not found', { status: 404 });
    }

    return new Response(dashboardHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response('Server error', { status: 500 });
  }
};
