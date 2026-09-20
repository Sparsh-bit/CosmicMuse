import { json } from '../_lib/cart.js';

export async function onRequestGet({ env }) {
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM products').first();
  // No process.uptime() in Workers (no long-lived process) — report request time instead.
  return json({ ok: true, products: n, served_at: new Date().toISOString() });
}
