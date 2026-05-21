const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Space-Pin",
};

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: corsHeaders,
  });
};

export const onRequest = async (context) => {
  try {
    const response = await context.next();
    const newResponse = new Response(response.body, response);
    Object.keys(corsHeaders).forEach(key => {
      newResponse.headers.set(key, corsHeaders[key]);
    });
    return newResponse;
  } catch (e) {
    return new Response(JSON.stringify({ 
      error: "Middleware error: " + (e instanceof Error ? e.message : String(e)),
      stack: e instanceof Error ? e.stack : undefined
    }), { 
      status: 500, 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      } 
    });
  }
};
