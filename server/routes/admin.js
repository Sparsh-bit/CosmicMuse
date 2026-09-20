'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

const listOrders = db.prepare(`
  SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
  FROM orders o ORDER BY o.created_at DESC LIMIT ?`);
const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
const setStatus  = db.prepare('UPDATE orders SET status = ? WHERE order_number = ?');
const stockRows  = db.prepare(`
  SELECT p.name, p.slug, v.id AS variant_id, v.size_ml, v.sku, v.stock, v.price_paise
  FROM variants v JOIN products p ON p.id = v.product_id
  ORDER BY p.sort_order ASC, v.size_ml ASC`);

const STATUSES = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

router.get('/admin/orders', (req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
  const orders = listOrders.all(limit).map((o) => ({
    ...o, gift_wrap: !!o.gift_wrap, items: orderItems.all(o.id),
  }));
  res.json({ orders, count: orders.length });
});

router.patch('/admin/orders/:number', (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status))
    return res.status(400).json({ error: 'bad_status', allowed: STATUSES });
  const r = setStatus.run(status, req.params.number);
  if (!r.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, order_number: req.params.number, status });
});

router.get('/admin/stats', (req, res) => {
  const agg = db.prepare(`
    SELECT COUNT(*) AS orders,
           COALESCE(SUM(total_paise),0) AS revenue_paise,
           COALESCE(AVG(total_paise),0) AS aov_paise
    FROM orders WHERE status != 'cancelled'`).get();
  const units = db.prepare(`
    SELECT COALESCE(SUM(oi.qty),0) AS units FROM order_items oi
    JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled'`).get();
  const top = db.prepare(`
    SELECT oi.product_name AS name, SUM(oi.qty) AS units, SUM(oi.line_paise) AS revenue_paise
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelled'
    GROUP BY oi.product_name ORDER BY units DESC LIMIT 5`).all();
  const byStatus = db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
  res.json({
    orders: agg.orders,
    revenue_paise: agg.revenue_paise,
    aov_paise: Math.round(agg.aov_paise),
    units: units.units,
    top_products: top,
    by_status: byStatus,
    stock: stockRows.all(),
  });
});

router.get('/admin/stock', (req, res) => res.json({ stock: stockRows.all() }));

module.exports = router;
