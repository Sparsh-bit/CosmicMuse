// Port of POST /api/checkout/pay from server/routes/checkout.js.
// Not under /api/cart/*, so it calls ensureCart itself — same as the original,
// which imported { buildCart, ensureCart } directly rather than via middleware.
import { buildCart, ensureCart, json } from '../../_lib/cart.js';
import { totals } from '../../_lib/pricing.js';
import { authorize, validateAddress, orderNumber } from '../../_lib/payment.js';
import { newId } from '../../_lib/id.js';

const now = () => new Date().toISOString();

export async function onRequestPost({ request, env }) {
  const cartId = await ensureCart(env.DB, request.headers.get('x-cart-id') || null);
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const giftWrap = !!body.gift_wrap;

  const cart = await buildCart(env.DB, cartId, { giftWrap });
  if (!cart.items.length) return json({ error: 'empty_cart', message: 'Your bag is empty.' }, { status: 400 });

  const errors = validateAddress(body);
  if (Object.keys(errors).length) return json({ error: 'validation_failed', errors }, { status: 422 });

  // stock re-check at the moment of payment (same TOCTOU window as the original —
  // the write below is atomic, but this check and that write are not one transaction).
  for (const it of cart.items) {
    const s = await env.DB.prepare('SELECT stock FROM variants WHERE id = ?').bind(it.variant_id).first();
    if (!s || s.stock < it.qty)
      return json({
        error: 'insufficient_stock',
        message: `${it.name} ${it.size_ml}ml — only ${s ? s.stock : 0} left.`,
      }, { status: 409 });
  }

  const auth = authorize(body.card || {});
  if (!auth.ok) return json({ error: 'payment_failed', code: auth.code, message: auth.message }, { status: 402 });

  const t = totals(cart.items, { giftWrap });
  const id = newId('ord');
  const num = orderNumber();

  const order = {
    id, order_number: num, created_at: now(), status: 'confirmed',
    email: String(body.email).trim(),
    first_name: String(body.first_name).trim(),
    last_name: String(body.last_name).trim(),
    phone: String(body.phone).trim(),
    address1: String(body.address1).trim(),
    address2: body.address2 ? String(body.address2).trim() : null,
    city: String(body.city).trim(),
    state: String(body.state).trim(),
    postcode: String(body.postcode).trim(),
    country: body.country ? String(body.country).trim() : 'India',
    gift_wrap: giftWrap ? 1 : 0,
    gift_note: body.gift_note ? String(body.gift_note).slice(0, 400) : null,
    subtotal_paise: t.subtotal_paise, gift_paise: t.gift_paise,
    shipping_paise: t.shipping_paise, tax_paise: t.tax_paise, total_paise: t.total_paise,
    payment_method: 'card', payment_ref: auth.ref,
    card_last4: auth.last4, card_brand: auth.brand,
  };

  const insOrder = env.DB.prepare(`INSERT INTO orders
    (id,order_number,created_at,status,email,first_name,last_name,phone,address1,address2,city,state,
     postcode,country,gift_wrap,gift_note,subtotal_paise,gift_paise,shipping_paise,tax_paise,total_paise,
     payment_method,payment_ref,card_last4,card_brand)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    order.id, order.order_number, order.created_at, order.status, order.email, order.first_name,
    order.last_name, order.phone, order.address1, order.address2, order.city, order.state,
    order.postcode, order.country, order.gift_wrap, order.gift_note, order.subtotal_paise,
    order.gift_paise, order.shipping_paise, order.tax_paise, order.total_paise, order.payment_method,
    order.payment_ref, order.card_last4, order.card_brand,
  );

  const batch = [insOrder];
  for (const it of cart.items) {
    batch.push(env.DB.prepare(`INSERT INTO order_items
      (order_id,variant_id,product_name,product_slug,size_ml,unit_paise,qty,line_paise,image)
      VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, it.variant_id, it.name, it.slug, it.size_ml,
      it.unit_paise, it.qty, it.line_paise, it.image));
    batch.push(env.DB.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?')
      .bind(it.qty, it.variant_id));
  }
  batch.push(env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(cartId));

  // D1's batch() runs every statement in one atomic transaction — the
  // equivalent of the original's `db.transaction(() => { ... })`.
  await env.DB.batch(batch);

  return json({
    ok: true,
    order: { id, order_number: num, total_paise: t.total_paise,
             card_brand: auth.brand, card_last4: auth.last4, payment_ref: auth.ref },
  }, { status: 201 });
}
