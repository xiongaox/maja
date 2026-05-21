import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'PUT') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const redis = Redis.fromEnv();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const pin = request.headers.get('X-Space-Pin');

    if (!id) return new Response('Missing ID', { status: 400 });
    if (!pin) return new Response('Missing PIN', { status: 400 });

    const cfgKey = `space:${id}:cfg`;
    const cfgData: any = await redis.get(cfgKey);

    if (!cfgData) {
      return new Response('Space not found', { status: 404 });
    }

    if (cfgData.pin !== pin) {
      return new Response('Invalid PIN', { status: 403 });
    }

    const txBody = await request.json();
    const txKey = `space:${id}:tx`;
    
    await redis.set(txKey, txBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
