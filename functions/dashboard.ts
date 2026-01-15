// This file is deprecated - routes are handled by _middleware.ts and static file serving
// If needed, use /frontend/dashboard.html directly or configure in _routes.json
export const onRequest = async (context: any) => {
  return new Response('Not found', { status: 404 });
};
