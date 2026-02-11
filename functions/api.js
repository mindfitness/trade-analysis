export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  if (!env.trade_db) {
    return new Response("Error: D1 binding 'trade_db' not found.", { status: 500 });
  }
  
  if (request.method === "GET") {
    try {
      const { results } = await env.trade_db.prepare("SELECT * FROM trades ORDER BY trade_id DESC").all();
      return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  }
  
  if (request.method === "POST") {
    try {
      const data = await request.json();
      if (data.action === "update") {
        const updates = [];
        const params = [];
        
        if (data.result !== undefined) {
          updates.push("result = ?");
          params.push(data.result);
        }
        if (data.memo !== undefined) {
          updates.push("memo = ?");
          params.push(data.memo);
        }
        if (data.final_pl !== undefined) {
          updates.push("final_pl = ?");
          params.push(data.final_pl);
        }
        // 🔥 重要：applied_items の更新処理を追加
        if (data.applied_items !== undefined) {
          updates.push("applied_items = ?");
          params.push(data.applied_items);
        }
        // 🔥 negative_items の更新処理を追加
        if (data.negative_items !== undefined) {
          updates.push("negative_items = ?");
          params.push(data.negative_items);
        }
        
        if (updates.length > 0) {
          params.push(data.id);
          const sql = `UPDATE trades SET ${updates.join(", ")} WHERE trade_id = ?`;
          await env.trade_db.prepare(sql).bind(...params).run();
        }
      } else {
        await env.trade_db.prepare("INSERT INTO trades (trade_id, date, name, price, applied_items, negative_items, memo) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(data.id, data.date, data.name, data.price, JSON.stringify(data.appliedItems), JSON.stringify(data.negativeItems), data.memo).run();
      }
      return new Response("OK");
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  }
  
  if (request.method === "DELETE") {
    const id = url.searchParams.get("id");
    await env.trade_db.prepare("DELETE FROM trades WHERE trade_id = ?").bind(id).run();
    return new Response("Deleted");
  }
  
  return new Response("Method not allowed", { status: 405 });
}
