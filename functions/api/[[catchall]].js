// Port of `app.use('/api', (req,res)=>res.status(404).json(...))` from server/index.js —
// catches any /api/* path not matched by a more specific function.
import { json } from '../_lib/cart.js';

export async function onRequest({ request }) {
  const path = new URL(request.url).pathname;
  return json({ error: 'no_such_endpoint', path }, { status: 404 });
}
