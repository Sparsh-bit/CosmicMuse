// Port of GET /api/admin/stock from server/routes/admin.js.
import { json } from '../../_lib/cart.js';
import { stockRows } from '../../_lib/admin.js';

export async function onRequestGet({ env }) {
  return json({ stock: await stockRows(env.DB) });
}
