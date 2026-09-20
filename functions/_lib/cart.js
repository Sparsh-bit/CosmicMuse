// D1 port of server/routes/cart.js's shared cart logic (used by the cart routes
// and by checkout/pay, exactly like the original imported { buildCart, ensureCart }).
import { newId } from './id.js';
import { totals } from './pricing.js';

const now = () => new Date().toISOString();

export async function ensureCart(db, id) {
  if (id) {
    const row = await db.prepare('SELECT id FROM carts WHERE id = ?').bind(id).first();
    if (row) return id;
  }
  const cid = newId('cart');
  await db.prepare('INSERT INTO carts (id,created_at,updated_at) VALUES (?,?,?)')
    .bind(cid, now(), now()).run();
  return cid;
}

export async function touchCart(db, cartId) {
  await db.prepare('UPDATE carts SET updated_at = ? WHERE id = ?').bind(now(), cartId).run();
}

export async function getVariant(db, variantId) {
  return db.prepare(`
    SELECT v.*, p.name, p.slug, p.hero_image, p.subtitle, p.accent
    FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`)
    .bind(variantId).first();
}

export async function findCartItem(db, cartId, variantId) {
  return db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?')
    .bind(cartId, variantId).first();
}

export async function buildCart(db, cartId, { giftWrap = false } = {}) {
  const { results } = await db.prepare(`
    SELECT ci.id AS item_id, ci.qty, v.id AS variant_id, v.size_ml, v.price_paise, v.sku, v.stock,
           p.name, p.slug, p.subtitle, p.hero_image, p.accent
    FROM cart_items ci
    JOIN variants v ON v.id = ci.variant_id
    JOIN products p ON p.id = v.product_id
    WHERE ci.cart_id = ?
    ORDER BY ci.id ASC`).bind(cartId).all();

  const items = results.map((r) => ({
    variant_id: r.variant_id, name: r.name, slug: r.slug, subtitle: r.subtitle,
    image: r.hero_image, accent: r.accent, size_ml: r.size_ml, sku: r.sku,
    unit_paise: r.price_paise, qty: r.qty, line_paise: r.price_paise * r.qty,
    stock: r.stock,
  }));
  return {
    cart_id: cartId,
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    totals: totals(items, { giftWrap }),
  };
}

export async function clearCartItems(db, cartId) {
  await db.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(cartId).run();
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });
}
