export const onRequestGet = async (context) => {
  const { env } = context;
  
  const bindings = {};
  for (const key of Object.keys(env || {})) {
    bindings[key] = typeof env[key];
  }

  return new Response(JSON.stringify({
    ok: true,
    message: "Functions are working!",
    has_kv: !!env.MAJA_KV,
    bindings: bindings
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
