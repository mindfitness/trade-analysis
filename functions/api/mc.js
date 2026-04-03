export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === "GET") {
    const key = url.searchParams.get("key");
    if (!key) {
      return new Response(JSON.stringify({ error: "key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const value = await env.MCSTORE.get(`mc:${key}`);
      return new Response(value ?? "null", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { key, value } = body;
      if (!key || value === undefined) {
        return new Response(JSON.stringify({ error: "key and value required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (key === "score_history") {
        let hist = Array.isArray(value) ? value : [];
        if (hist.length > 4) hist = hist.slice(0, 4);
        await env.MCSTORE.put(`mc:${key}`, JSON.stringify(hist));
      } else {
        await env.MCSTORE.put(`mc:${key}`, JSON.stringify(value));
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
