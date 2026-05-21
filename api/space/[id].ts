import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const redis = Redis.fromEnv();
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    const txKey = `space:${id}:tx`;
    const cfgKey = `space:${id}:cfg`;

    const [txData, cfgData] = await Promise.all([
      redis.get(txKey),
      redis.get(cfgKey),
    ]);

    const tx = txData || [];
    let cfg = cfgData || null;

    if (!cfg) {
      return new Response(JSON.stringify({ error: "Space not found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (cfg && (cfg as any).pin) {
      delete (cfg as any).pin; // 不暴露给前端
    }

    return new Response(JSON.stringify({ tx, cfg }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
