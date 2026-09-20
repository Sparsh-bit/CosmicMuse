// Port of GET /api/products/:slug from server/routes/catalog.js.
import { json } from '../../_lib/cart.js';
import { shapeProduct } from '../../_lib/catalog.js';

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare('SELECT * FROM products WHERE slug = ?').bind(params.slug).first();
  const p = await shapeProduct(env.DB, row);
  if (!p) return json({ error: 'not_found', message: 'No such fragrance.' }, { status: 404 });

  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY sort_order ASC').all();
  const related = await Promise.all(
    results.filter((r) => r.slug !== p.slug).slice(0, 3).map((r) => shapeProduct(env.DB, r))
  );
  return json({ product: p, related });
}
