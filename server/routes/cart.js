'use strict';
const express = require('express');
const db = require('../db');
const { totals } = require('../pricing');
const { newId } = require('../id');

const router = express.Router();

const now = () => new Date().toISOString();

const insCart   = db.prepare('INSERT INTO carts (id,created_at,updated_at) VALUES (?,?,?)');
const getCart   = db.prepare('SELECT * FROM carts WHERE id = ?');
const touchCart = db.prepare('UPDATE carts SET updated_at = ? WHERE id = ?');
const getVariant = db.prepare(`
  SELECT v.*, p.name, p.slug, p.hero_image, p.subtitle, p.accent
  FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`);
const selItems = db.prepare(`
  SELECT ci.id AS item_id, ci.qty, v.id AS variant_id, v.size_ml, v.price_paise, v.sku, v.stock,
         p.name, p.slug, p.subtitle, p.hero_image, p.accent
  FROM cart_items ci
  JOIN variants v ON v.id = ci.variant_id
  JOIN products p ON p.id = v.product_id
  WHERE ci.cart_id = ?
  ORDER BY ci.id ASC`);
const findItem = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?');
const insItem  = db.prepare('INSERT INTO cart_items (cart_id,variant_id,qty) VALUES (?,?,?)');
const updItem  = db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?');
const delItem  = db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?');
const clearAll = db.prepare('DELETE FROM cart_items WHERE cart_id = ?');

function ensureCart(id) {
  if (id && getCart.get(id)) return id;
  const cid = newId('cart');
  insCart.run(cid, now(), now());
  return cid;
}

function buildCart(cartId, { giftWrap = false } = {}) {
  const rows = selItems.all(cartId);
  const items = rows.map((r) => ({
    variant_id: r.variant_id, name: r.name, slug: r.slug, subtitle: r.subtitle,
    image: r.hero_image, accent: r.accent, size_ml: r.size_ml, sku: r.sku,
    unit_paise: r.price_paise, qty: r.qty, line_paise: r.price_paise * r.qty,
    stock: r.stock,
  }));
  return {
    cart_id: cartId,
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    totals: totals(items, { giftWrap }),
  };
}

// Attach/create cart id from header or body
router.use((req, res, next) => {
  req.cartId = ensureCart(req.get('x-cart-id') || req.body?.cart_id || null);
  res.set('x-cart-id', req.cartId);
  next();
});

router.get('/cart', (req, res) => {
  res.json(buildCart(req.cartId, { giftWrap: req.query.gift === 'true' }));
});

router.post('/cart/items', (req, res) => {
  const { variant_id, qty = 1 } = req.body || {};
  const n = parseInt(qty, 10);
  if (!variant_id) return res.status(400).json({ error: 'variant_required' });
  if (!Number.isInteger(n) || n < 1 || n > 10)
    return res.status(400).json({ error: 'bad_qty', message: 'Quantity must be between 1 and 10.' });

  const v = getVariant.get(variant_id);
  if (!v) return res.status(404).json({ error: 'variant_not_found' });

  const existing = findItem.get(req.cartId, variant_id);
  const want = (existing ? existing.qty : 0) + n;
  if (want > v.stock)
    return res.status(409).json({ error: 'insufficient_stock', message: `Only ${v.stock} left.`, stock: v.stock });

  if (existing) updItem.run(want, existing.id);
  else insItem.run(req.cartId, variant_id, n);
  touchCart.run(now(), req.cartId);
  res.status(201).json(buildCart(req.cartId));
});

router.patch('/cart/items/:variantId', (req, res) => {
  const n = parseInt(req.body?.qty, 10);
  if (!Number.isInteger(n) || n < 0 || n > 10)
    return res.status(400).json({ error: 'bad_qty' });
  const existing = findItem.get(req.cartId, req.params.variantId);
  if (!existing) return res.status(404).json({ error: 'not_in_cart' });
  if (n === 0) delItem.run(req.cartId, req.params.variantId);
  else {
    const v = getVariant.get(req.params.variantId);
    if (n > v.stock) return res.status(409).json({ error: 'insufficient_stock', stock: v.stock });
    updItem.run(n, existing.id);
  }
  touchCart.run(now(), req.cartId);
  res.json(buildCart(req.cartId));
});

router.delete('/cart/items/:variantId', (req, res) => {
  delItem.run(req.cartId, req.params.variantId);
  touchCart.run(now(), req.cartId);
  res.json(buildCart(req.cartId));
});

router.delete('/cart', (req, res) => {
  clearAll.run(req.cartId);
  res.json(buildCart(req.cartId));
});

module.exports = { router, buildCart, ensureCart };
