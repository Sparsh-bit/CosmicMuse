'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

const selProducts = db.prepare('SELECT * FROM products ORDER BY sort_order ASC');
const selProductBySlug = db.prepare('SELECT * FROM products WHERE slug = ?');
const selVariants = db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY size_ml ASC');

function shape(row) {
  if (!row) return null;
  const variants = selVariants.all(row.id).map((v) => ({
    id: v.id, size_ml: v.size_ml, price_paise: v.price_paise, sku: v.sku,
    stock: v.stock, in_stock: v.stock > 0,
  }));
  return {
    id: row.id, slug: row.slug, name: row.name, subtitle: row.subtitle,
    family: row.family, tagline: row.tagline, story: row.story,
    description: row.description, accent: row.accent,
    featured: !!row.featured,
    notes: { top: row.top_notes, heart: row.heart_notes, base: row.base_notes },
    ingredients: row.ingredients,
    specs: { longevity: row.longevity, sillage: row.sillage, concentration: row.concentration },
    hero_image: row.hero_image,
    gallery: JSON.parse(row.gallery),
    variants,
    from_paise: variants.length ? Math.min(...variants.map((v) => v.price_paise)) : 0,
  };
}

router.get('/products', (req, res) => {
  let items = selProducts.all().map(shape);
  if (req.query.featured === 'true') items = items.filter((p) => p.featured);
  if (req.query.limit) items = items.slice(0, Math.max(0, parseInt(req.query.limit, 10) || 0));
  res.json({ products: items, count: items.length });
});

router.get('/products/:slug', (req, res) => {
  const p = shape(selProductBySlug.get(req.params.slug));
  if (!p) return res.status(404).json({ error: 'not_found', message: 'No such fragrance.' });
  const related = selProducts.all()
    .filter((r) => r.slug !== p.slug).slice(0, 3).map(shape);
  res.json({ product: p, related });
});

module.exports = router;
