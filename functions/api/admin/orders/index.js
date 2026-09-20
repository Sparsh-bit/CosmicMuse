// Port of GET /api/admin/orders from server/routes/admin.js.
import { json } from '../../../_lib/cart.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const limit = Math.min(200, parseInt(url.searchParams.get('limit'), 10) || 50);
  const { results } = await env.DB.prepare(`
    SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o ORDER BY o.created_at DESC LIMIT ?`).bind(limit).all();

  const orders = await Promise.all(results.map(async (o) => {
    const { results: items } = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC')
      .bind(o.id).all();
    return { ...o, gift_wrap: !!o.gift_wrap, items };
  }));
  return json({ orders, count: orders.length });
}
