export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const id = params.id as string;

  if (!id) return new Response("Missing id", { status: 400 });

  const txStr = await env.MAJA_KV.get(`tx_${id}`);
  const cfgStr = await env.MAJA_KV.get(`cfg_${id}`);

  const tx = txStr ? JSON.parse(txStr) : [];
  const cfg = cfgStr ? JSON.parse(cfgStr) : { mergeRules: [], whitelist: [], filterOptions: {} };

  // 关键：返回给前端时，绝对不能包含 PIN 码！
  if (cfg.pin) {
    delete cfg.pin;
  }

  return new Response(JSON.stringify({ tx, cfg }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
