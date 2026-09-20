'use strict';
/* API smoke test — node server/smoke-test.js (or npm test) */
const app = require('./index');
let pass = 0, fail = 0;
const ok = (name, cond, extra='') => {
  if (cond) { pass++; console.log('  \x1b[32m✓\x1b[0m', name); }
  else { fail++; console.log('  \x1b[31m✗\x1b[0m', name, extra); }
};

const srv = app.listen(0, async () => {
  const B = `http://127.0.0.1:${srv.address().port}`;
  const j = async (u, o) => { const r = await fetch(B + u, o); return [r.status, await r.json().catch(() => null), r]; };

  console.log('\ncatalogue');
  const [hs, health] = await j('/api/health');
  ok('health responds', hs === 200 && health.ok);
  const [, list] = await j('/api/products');
  ok('six products seeded', list.count === 6, `got ${list.count}`);
  const [, one] = await j('/api/products/no-01');
  ok('product detail has two variants', one.product.variants.length === 2);
  ok('related products returned', one.related.length === 3);
  ok('unknown slug 404s', (await j('/api/products/nope'))[0] === 404);

  console.log('\ncart');
  const [, , r0] = await j('/api/cart');
  const cid = r0.headers.get('x-cart-id');
  ok('server mints a cart id', !!cid);
  const H = { 'content-type': 'application/json', 'x-cart-id': cid };
  const [as, c1] = await j('/api/cart/items', { method: 'POST', headers: H, body: JSON.stringify({ variant_id: 'p_no01_50', qty: 2 }) });
  ok('add to cart', as === 201 && c1.count === 2);
  ok('line total is unit × qty', c1.items[0].line_paise === 890000 * 2);
  const [, c2] = await j('/api/cart/items/p_no01_50', { method: 'PATCH', headers: H, body: JSON.stringify({ qty: 1 }) });
  ok('update quantity', c2.count === 1);
  ok('bad quantity rejected', (await j('/api/cart/items', { method: 'POST', headers: H, body: JSON.stringify({ variant_id: 'p_no01_50', qty: 99 }) }))[0] === 400);
  ok('unknown variant rejected', (await j('/api/cart/items', { method: 'POST', headers: H, body: JSON.stringify({ variant_id: 'nope' }) }))[0] === 404);

  console.log('\npricing');
  await j('/api/cart/items', { method: 'POST', headers: H, body: JSON.stringify({ variant_id: 'p_lune_100', qty: 1 }) });
  const [, c3] = await j('/api/cart', { headers: H });
  const t = c3.totals;
  ok('subtotal adds up', t.subtotal_paise === 890000 + 1310000);
  ok('free shipping over ₹10,000', t.shipping_paise === 0);
  ok('GST is 18% of goods', t.tax_paise === Math.round(t.subtotal_paise * 0.18));
  ok('total = goods + ship + tax', t.total_paise === t.subtotal_paise + t.shipping_paise + t.tax_paise);

  console.log('\ncheckout');
  const A = { email: 'a@b.com', first_name: 'A', last_name: 'B', phone: '9876543210',
              address1: '1 St', city: 'Mumbai', state: 'MH', postcode: '400001' };
  const card = (number) => ({ number, expiry: '12/30', cvc: '123', name: 'A B' });
  const pay = (body) => j('/api/checkout/pay', { method: 'POST', headers: H, body: JSON.stringify(body) });

  ok('bad PIN code rejected', (await pay({ ...A, postcode: '12', card: card('4242424000061111') }))[0] === 422);
  ok('non-Luhn card rejected', (await pay({ ...A, card: card('4242424000061112') }))[1].code === 'invalid_number');
  ok('expired card rejected', (await pay({ ...A, card: { ...card('4242424000061111'), expiry: '01/20' } }))[1].code === 'expired_card');
  ok('issuer decline surfaced', (await pay({ ...A, card: card('4242424000020000') }))[1].code === 'card_declined');
  ok('insufficient funds surfaced', (await pay({ ...A, card: card('4242424000000341') }))[1].code === 'insufficient_funds');

  const before = (await j('/api/admin/stock'))[1].stock.find(s => s.variant_id === 'p_no01_50').stock;
  const [ps, paid] = await pay({ ...A, gift_wrap: true, card: card('4242424000061111') });
  ok('payment approved', ps === 201 && paid.ok);
  ok('order number issued', /^CM-\d{4}-\d{5}$/.test(paid.order.order_number));
  ok('only last four stored', paid.order.card_last4 === '1111' && !JSON.stringify(paid).includes('4242424000061111'));

  console.log('\nafter the order');
  const [, ord] = await j(`/api/orders/${paid.order.order_number}`);
  ok('order retrievable', ord.order.items.length === 2);
  ok('gift wrap charged', ord.order.gift_paise === 35000);
  ok('cart emptied', (await j('/api/cart', { headers: H }))[1].count === 0);
  const after = (await j('/api/admin/stock'))[1].stock.find(s => s.variant_id === 'p_no01_50').stock;
  ok('stock decremented', after === before - 1, `${before} → ${after}`);
  const [, stats] = await j('/api/admin/stats');
  ok('stats count the order', stats.orders >= 1 && stats.revenue_paise >= ord.order.total_paise);
  ok('status can be changed', (await j(`/api/admin/orders/${paid.order.order_number}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status: 'shipped' }) }))[0] === 200);
  ok('bad status rejected', (await j(`/api/admin/orders/${paid.order.order_number}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status: 'nope' }) }))[0] === 400);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  srv.close();
  process.exit(fail ? 1 : 0);
});
