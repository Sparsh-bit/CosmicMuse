// Port of PATCH/DELETE /api/cart/items/:variantId from server/routes/cart.js.
import { buildCart, findCartItem, getVariant, touchCart, json } from '../../../_lib/cart.js';

export async function onRequestPatch({ request, env, data, params }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const n = parseInt(body?.qty, 10);
  if (!Number.isInteger(n) || n < 0 || n > 10) return json({ error: 'bad_qty' }, { status: 400 });

  const existing = await findCartItem(env.DB, data.cartId, params.variantId);
  if (!existing) return json({ error: 'not_in_cart' }, { status: 404 });

  if (n === 0) {
    await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?')
      .bind(data.cartId, params.variantId).run();
  } else {
    const v = await getVariant(env.DB, params.variantId);
    if (n > v.stock) return json({ error: 'insufficient_stock', stock: v.stock }, { status: 409 });
    await env.DB.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').bind(n, existing.id).run();
  }
  await touchCart(env.DB, data.cartId);
  return json(await buildCart(env.DB, data.cartId));
}

export async function onRequestDelete({ env, data, params }) {
  await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?')
    .bind(data.cartId, params.variantId).run();
  await touchCart(env.DB, data.cartId);
  return json(await buildCart(env.DB, data.cartId));
}
