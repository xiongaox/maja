export const onRequestGet = async (context: any) => {
  const { env, params } = context;

  try {
    const id = params.id as string;

    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // 检查 KV 绑定是否存在
    if (!env.MAJA_KV) {
      return new Response(JSON.stringify({ 
        error: "KV binding MAJA_KV not found", 
        available_bindings: Object.keys(env || {})
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

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
  } catch (e: any) {
    return new Response(JSON.stringify({ 
      error: e.message, 
      stack: e.stack,
      name: e.name 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
