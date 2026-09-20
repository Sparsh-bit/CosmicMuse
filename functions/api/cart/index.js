// Port of GET /api/cart and DELETE /api/cart from server/routes/cart.js.
// context.data.cartId is set by ./_middleware.js.
import { buildCart, clearCartItems, json } from '../../_lib/cart.js';

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  const cart = await buildCart(env.DB, data.cartId, { giftWrap: url.searchParams.get('gift') === 'true' });
  return json(cart);
}

export async function onRequestDelete({ env, data }) {
  await clearCartItems(env.DB, data.cartId);
  return json(await buildCart(env.DB, data.cartId));
}
