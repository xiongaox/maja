export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const id = params.id as string;
  const pin = request.headers.get('X-Space-Pin');

  if (!id) return new Response("Missing id", { status: 400 });

  const cfgStr = await env.MAJA_KV.get(`cfg_${id}`);
  if (cfgStr) {
    const cfg = JSON.parse(cfgStr);
    if (cfg.pin && cfg.pin !== pin) {
      return new Response(JSON.stringify({ error: "Invalid PIN" }), { status: 403 });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
