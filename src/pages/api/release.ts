import type { APIRoute } from 'astro';

export const prerender = true;

const release =
  process.env.PUBLIC_RELEASE_SHA || process.env.CF_PAGES_COMMIT_SHA || 'local';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: 'ok', release }), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
