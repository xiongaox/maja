export const onRequestPut = async (context: any) => {
  const { request, env, params } = context;
  
  try {
    const id = params.id as string;
    const pin = request.headers.get('X-Space-Pin');

    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // 检查 KV 绑定是否存在
    if (!env.MAJA_KV) {
      return new Response(JSON.stringify({ 
        error: "KV binding MAJA_KV not found", 
        available_bindings: Object.keys(env || {})
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const existingCfgStr = await env.MAJA_KV.get(`cfg_${id}`);
    let existingPin = undefined;
    
    if (existingCfgStr) {
      const existingCfg = JSON.parse(existingCfgStr);
      existingPin = existingCfg.pin;
      
      // 如果已经设置过 PIN，但没传或者不对，拒绝访问
      if (existingPin && existingPin !== pin) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const body = await request.text();
    const newCfg = JSON.parse(body);
    // 保留已有的 PIN 码
    if (!newCfg.pin && existingPin) {
      newCfg.pin = existingPin;
    }
    await env.MAJA_KV.put(`cfg_${id}`, JSON.stringify(newCfg));

    return new Response(JSON.stringify({ success: true }), {
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
