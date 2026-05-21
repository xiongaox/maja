export const onRequestPut = async (context: any) => {
  const { request, env, params } = context;
  const id = params.id as string;
  const pin = request.headers.get('X-Space-Pin');

  if (!id) return new Response("Missing id", { status: 400 });

  const existingCfgStr = await env.MAJA_KV.get(`cfg_${id}`);
  let existingPin = undefined;
  
  if (existingCfgStr) {
    const existingCfg = JSON.parse(existingCfgStr);
    existingPin = existingCfg.pin;
    
    // 如果已经设置过 PIN，但没传或者不对，拒绝访问
    if (existingPin && existingPin !== pin) {
      return new Response(JSON.stringify({ error: "Invalid PIN" }), { status: 403 });
    }
  }

  const body = await request.text();
  try {
    const newCfg = JSON.parse(body);
    // 保留已有的 PIN 码
    if (!newCfg.pin && existingPin) {
      newCfg.pin = existingPin;
    }
    await env.MAJA_KV.put(`cfg_${id}`, JSON.stringify(newCfg));
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
