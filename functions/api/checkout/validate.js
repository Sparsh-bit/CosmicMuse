// Port of POST /api/checkout/validate from server/routes/checkout.js.
import { validateAddress } from '../../_lib/payment.js';
import { json } from '../../_lib/cart.js';

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const errors = validateAddress(body);
  return json({ ok: !Object.keys(errors).length, errors }, { status: Object.keys(errors).length ? 422 : 200 });
}
