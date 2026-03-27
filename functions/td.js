/**
 * functions/td.js
 * Twelve Data API プロキシ
 * 
 * アクセス: /td?endpoint=time_series&symbol=NVDA&key=1
 * 
 * Cloudflare Dashboard で登録する Secret:
 *   Workers & Pages → trade-analysis → Settings → Environment variables
 *   TD_KEY_1 = 4745e87ea2404681a5c9fa6376aac35a  (Rank / PF用)
 *   TD_KEY_2 = f550f672515b4cd6b4c2966f1e2cc0fb  (Perf用)
 *   TD_KEY_3 = f550f672515b4cd6b4c2966f1e2cc0fb  (Screener用)
 *   ※ 必ず "Encrypt" にチェックを入れること
 */

const TWELVE_BASE = "https://api.twelvedata.com";

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");

  if (!endpoint) {
    return jsonError("Missing ?endpoint= parameter", 400);
  }

  // key=1(Rank), 2(Perf), 3(Screen) でAPIキーを切り替え
  const keyParam = url.searchParams.get("key") || "1";
  const apiKey = keyParam === "2" ? env.TD_KEY_2
               : keyParam === "3" ? env.TD_KEY_3
               : env.TD_KEY_1;

  if (!apiKey) {
    return jsonError(`TD_KEY_${keyParam} が未設定です。Cloudflare Dashboard で環境変数を登録してください。`, 500);
  }

  // Twelve Data へのパラメータ組み立て（endpoint と key は除外）
  const tdParams = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "endpoint" || k === "key" || k === "apikey") continue;
    tdParams.set(k, v);
  }
  tdParams.set("apikey", apiKey);

  const tdUrl = `${TWELVE_BASE}/${endpoint}?${tdParams.toString()}`;

  // 上流リクエスト
  let upstream;
  try {
    upstream = await fetch(tdUrl);
  } catch (err) {
    return jsonError(`Upstream fetch failed: ${err.message}`, 502);
  }

  const body = await upstream.arrayBuffer();
  const headers = new Headers(corsHeaders());
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");

  return new Response(body, { status: upstream.status, headers });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
