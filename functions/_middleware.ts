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
  const response = await context.next();
  const newResponse = new Response(response.body, response);
  Object.keys(corsHeaders).forEach(key => {
    newResponse.headers.set(key, corsHeaders[key]);
  });
  return newResponse;
};
