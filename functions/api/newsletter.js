import { json } from '../_lib/cart.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const email = String(body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return json({ error: 'invalid_email', message: 'Enter a valid email address.' }, { status: 422 });
  await env.DB.prepare('INSERT OR IGNORE INTO newsletter (email,created_at) VALUES (?,?)')
    .bind(email, new Date().toISOString()).run();
  return json({ ok: true, message: 'You are on the list.' });
}
