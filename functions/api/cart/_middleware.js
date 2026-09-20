// Applies to every /api/cart/* request — mirrors the `router.use(...)` in the
// original server/routes/cart.js: mint/attach a cart id, stamp it on the response.
import { ensureCart } from '../../_lib/cart.js';

export async function onRequest(context) {
  const { request, env } = context;
  let bodyCartId;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    try {
      const body = await request.clone().json();
      bodyCartId = body?.cart_id;
    } catch { /* no/invalid JSON body */ }
  }
  context.data.cartId = await ensureCart(env.DB, request.headers.get('x-cart-id') || bodyCartId || null);

  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('x-cart-id', context.data.cartId);
  return out;
}
