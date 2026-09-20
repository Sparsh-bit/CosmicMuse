// Port of POST /api/cart/items from server/routes/cart.js.
import { buildCart, findCartItem, getVariant, touchCart, json } from '../../../_lib/cart.js';

export async function onRequestPost({ request, env, data }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { variant_id } = body || {};
  const qty = body?.qty ?? 1;
  const n = parseInt(qty, 10);
  if (!variant_id) return json({ error: 'variant_required' }, { status: 400 });
  if (!Number.isInteger(n) || n < 1 || n > 10)
    return json({ error: 'bad_qty', message: 'Quantity must be between 1 and 10.' }, { status: 400 });

  const v = await getVariant(env.DB, variant_id);
  if (!v) return json({ error: 'variant_not_found' }, { status: 404 });

  const existing = await findCartItem(env.DB, data.cartId, variant_id);
  const want = (existing ? existing.qty : 0) + n;
  if (want > v.stock)
    return json({ error: 'insufficient_stock', message: `Only ${v.stock} left.`, stock: v.stock }, { status: 409 });

  if (existing) {
    await env.DB.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').bind(want, existing.id).run();
  } else {
    await env.DB.prepare('INSERT INTO cart_items (cart_id,variant_id,qty) VALUES (?,?,?)')
      .bind(data.cartId, variant_id, n).run();
  }
  await touchCart(env.DB, data.cartId);
  return json(await buildCart(env.DB, data.cartId), { status: 201 });
}
