// Port of GET /api/products from server/routes/catalog.js.
import { json } from '../../_lib/cart.js';
import { shapeProduct } from '../../_lib/catalog.js';

export async function onRequestGet({ request, env }) {
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY sort_order ASC').all();
  let items = await Promise.all(results.map((r) => shapeProduct(env.DB, r)));
  const url = new URL(request.url);
  if (url.searchParams.get('featured') === 'true') items = items.filter((p) => p.featured);
  const limit = url.searchParams.get('limit');
  if (limit) items = items.slice(0, Math.max(0, parseInt(limit, 10) || 0));
  return json({ products: items, count: items.length });
}
