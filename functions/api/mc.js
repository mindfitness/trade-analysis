
// functions/api/mc.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ===== GET: データ取得 =====
  if (request.method === "GET") {
    const key = url.searchParams.get("key");
    if (!key) {
      return new Response(JSON.stringify({ error: "key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const value = await env.MC_STORE.get(`mc:${key}`);
    return new Response(value ?? "null", {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===== POST: データ保存 =====
  if (request.method === "POST") {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return new Response(JSON.stringify({ error: "key and value required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // score_historyは4件に制限
    if (key === "score_history") {
      let hist = Array.isArray(value) ? value : [];
      if (hist.length > 4) hist = hist.slice(0, 4);
      await env.MC_STORE.put(`mc:${key}`, JSON.stringify(hist));
    } else {
      await env.MC_STORE.put(`mc:${key}`, JSON.stringify(value));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
}
