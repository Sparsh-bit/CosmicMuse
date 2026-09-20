// Port of GET /api/orders/:number from server/routes/checkout.js.
import { json } from '../../_lib/cart.js';

export async function onRequestGet({ params, env }) {
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_number = ?').bind(params.number).first();
  if (!o) return json({ error: 'not_found' }, { status: 404 });
  const { results } = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC')
    .bind(o.id).all();
  return json({ order: { ...o, gift_wrap: !!o.gift_wrap, items: results } });
}
