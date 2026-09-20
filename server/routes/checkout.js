'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { totals } = require('../pricing');
const { buildCart, ensureCart } = require('./cart');

const router = express.Router();
const now = () => new Date().toISOString();
const newId = (p) => `${p}_${crypto.randomBytes(9).toString('hex')}`;

/* ------------------------------------------------------------------ *
 * SIMULATED PAYMENT — no gateway, no real card data is stored.
 * Only the last four digits and a detected brand are persisted.
 * Test behaviour is driven by the final four digits (see TEST_CARDS).
 * ------------------------------------------------------------------ */
const TEST_CARDS = {
  // All Luhn-valid. Behaviour is keyed on the final four digits.
  //   4242 4240 0006 1111 → approved
  //   4242 4240 0002 0000 → declined by issuer
  //   4242 4240 0000 0341 → insufficient funds
  //   4242 4240 0000 0069 → expired card
  '0000': { ok: false, code: 'card_declined',      message: 'Your card was declined by the issuer.' },
  '0341': { ok: false, code: 'insufficient_funds', message: 'Insufficient funds on this card.' },
  '0069': { ok: false, code: 'expired_card',       message: 'That card has been reported lost.' },
};

function luhn(num) {
  const d = String(num).replace(/\D/g, '');
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

function brandOf(num) {
  const d = String(num).replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  if (/^60|^65|^81|^82/.test(d)) return 'RuPay';
  return 'Card';
}

function authorize({ number, expiry, cvc, name }) {
  const d = String(number || '').replace(/\D/g, '');
  if (!name || String(name).trim().length < 2)
    return { ok: false, code: 'invalid_name', message: 'Enter the name printed on the card.' };
  if (!luhn(d))
    return { ok: false, code: 'invalid_number', message: 'That card number is not valid.' };
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(String(expiry || '')))
    return { ok: false, code: 'invalid_expiry', message: 'Expiry must be in MM/YY format.' };

  const [mm, yy] = String(expiry).split('/').map((s) => parseInt(s.trim(), 10));
  if (mm < 1 || mm > 12)
    return { ok: false, code: 'invalid_expiry', message: 'That expiry month does not exist.' };
  const exp = new Date(2000 + yy, mm, 0, 23, 59, 59);
  if (exp < new Date())
    return { ok: false, code: 'expired_card', message: 'That card has expired.' };
  if (!/^\d{3,4}$/.test(String(cvc || '')))
    return { ok: false, code: 'invalid_cvc', message: 'Enter the 3 or 4 digit security code.' };

  const last4 = d.slice(-4);
  if (TEST_CARDS[last4]) return { ...TEST_CARDS[last4], last4, brand: brandOf(d) };
  return {
    ok: true, last4, brand: brandOf(d),
    ref: 'txn_' + crypto.randomBytes(8).toString('hex'),
  };
}

/* ------------------------------ validation ------------------------------ */
const REQUIRED = ['email', 'first_name', 'last_name', 'phone', 'address1', 'city', 'state', 'postcode'];

function validateAddress(b = {}) {
  const errors = {};
  for (const f of REQUIRED) {
    if (!b[f] || !String(b[f]).trim()) errors[f] = 'Required';
  }
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(b.email)))
    errors.email = 'Enter a valid email address';
  if (b.phone && String(b.phone).replace(/\D/g, '').length < 10)
    errors.phone = 'Enter a valid phone number';
  if (b.postcode && !/^\d{6}$/.test(String(b.postcode).replace(/\s/g, '')))
    errors.postcode = 'Enter a 6-digit PIN code';
  return errors;
}

router.post('/checkout/validate', (req, res) => {
  const errors = validateAddress(req.body);
  res.status(Object.keys(errors).length ? 422 : 200).json({ ok: !Object.keys(errors).length, errors });
});

/* ------------------------------ place order ------------------------------ */
const getVariantStock = db.prepare('SELECT stock FROM variants WHERE id = ?');
const decStock = db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?');
const insOrder = db.prepare(`INSERT INTO orders
 (id,order_number,created_at,status,email,first_name,last_name,phone,address1,address2,city,state,
  postcode,country,gift_wrap,gift_note,subtotal_paise,gift_paise,shipping_paise,tax_paise,total_paise,
  payment_method,payment_ref,card_last4,card_brand)
 VALUES (@id,@order_number,@created_at,@status,@email,@first_name,@last_name,@phone,@address1,@address2,
  @city,@state,@postcode,@country,@gift_wrap,@gift_note,@subtotal_paise,@gift_paise,@shipping_paise,
  @tax_paise,@total_paise,@payment_method,@payment_ref,@card_last4,@card_brand)`);
const insOrderItem = db.prepare(`INSERT INTO order_items
 (order_id,variant_id,product_name,product_slug,size_ml,unit_paise,qty,line_paise,image)
 VALUES (?,?,?,?,?,?,?,?,?)`);
const clearCartItems = db.prepare('DELETE FROM cart_items WHERE cart_id = ?');

function orderNumber() {
  const y = new Date().getFullYear();
  const n = crypto.randomInt(10000, 99999);
  return `CM-${y}-${n}`;
}

router.post('/checkout/pay', (req, res) => {
  const cartId = ensureCart(req.get('x-cart-id') || req.body?.cart_id);
  const body = req.body || {};
  const giftWrap = !!body.gift_wrap;

  const cart = buildCart(cartId, { giftWrap });
  if (!cart.items.length)
    return res.status(400).json({ error: 'empty_cart', message: 'Your bag is empty.' });

  const errors = validateAddress(body);
  if (Object.keys(errors).length)
    return res.status(422).json({ error: 'validation_failed', errors });

  // stock re-check at the moment of payment
  for (const it of cart.items) {
    const s = getVariantStock.get(it.variant_id);
    if (!s || s.stock < it.qty)
      return res.status(409).json({
        error: 'insufficient_stock',
        message: `${it.name} ${it.size_ml}ml — only ${s ? s.stock : 0} left.`,
      });
  }

  const auth = authorize(body.card || {});
  if (!auth.ok)
    return res.status(402).json({ error: 'payment_failed', code: auth.code, message: auth.message });

  const t = totals(cart.items, { giftWrap });
  const id = newId('ord');
  const num = orderNumber();

  const tx = db.transaction(() => {
    insOrder.run({
      id, order_number: num, created_at: now(), status: 'confirmed',
      email: String(body.email).trim(),
      first_name: String(body.first_name).trim(),
      last_name: String(body.last_name).trim(),
      phone: String(body.phone).trim(),
      address1: String(body.address1).trim(),
      address2: body.address2 ? String(body.address2).trim() : null,
      city: String(body.city).trim(),
      state: String(body.state).trim(),
      postcode: String(body.postcode).trim(),
      country: body.country ? String(body.country).trim() : 'India',
      gift_wrap: giftWrap ? 1 : 0,
      gift_note: body.gift_note ? String(body.gift_note).slice(0, 400) : null,
      subtotal_paise: t.subtotal_paise, gift_paise: t.gift_paise,
      shipping_paise: t.shipping_paise, tax_paise: t.tax_paise, total_paise: t.total_paise,
      payment_method: 'card', payment_ref: auth.ref,
      card_last4: auth.last4, card_brand: auth.brand,
    });
    for (const it of cart.items) {
      insOrderItem.run(id, it.variant_id, it.name, it.slug, it.size_ml,
        it.unit_paise, it.qty, it.line_paise, it.image);
      decStock.run(it.qty, it.variant_id);
    }
    clearCartItems.run(cartId);
  });
  tx();

  res.status(201).json({
    ok: true,
    order: { id, order_number: num, total_paise: t.total_paise,
             card_brand: auth.brand, card_last4: auth.last4, payment_ref: auth.ref },
  });
});

/* ------------------------------ order lookup ------------------------------ */
const getOrder = db.prepare('SELECT * FROM orders WHERE order_number = ?');
const getOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');

router.get('/orders/:number', (req, res) => {
  const o = getOrder.get(req.params.number);
  if (!o) return res.status(404).json({ error: 'not_found' });
  res.json({ order: { ...o, gift_wrap: !!o.gift_wrap, items: getOrderItems.all(o.id) } });
});

module.exports = { router, authorize, luhn, validateAddress };
