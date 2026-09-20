// Port of PATCH /api/admin/orders/:number from server/routes/admin.js.
import { json } from '../../../_lib/cart.js';

const STATUSES = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

export async function onRequestPatch({ request, env, params }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { status } = body || {};
  if (!STATUSES.includes(status)) return json({ error: 'bad_status', allowed: STATUSES }, { status: 400 });

  const r = await env.DB.prepare('UPDATE orders SET status = ? WHERE order_number = ?')
    .bind(status, params.number).run();
  if (!r.meta.changes) return json({ error: 'not_found' }, { status: 404 });
  return json({ ok: true, order_number: params.number, status });
}
