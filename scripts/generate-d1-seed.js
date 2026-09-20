'use strict';
/* Regenerates migrations/0002_seed.sql from server/seed.js's PRODUCTS array —
 * the single source of truth for the catalogue. Run after editing PRODUCTS:
 *   node scripts/generate-d1-seed.js > migrations/0002_seed.sql
 */
const { PRODUCTS } = require('../server/seed');

const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const COLS = ['id', 'slug', 'name', 'subtitle', 'family', 'tagline', 'story', 'description',
  'top_notes', 'heart_notes', 'base_notes', 'ingredients', 'longevity', 'sillage', 'concentration',
  'hero_image', 'gallery', 'accent', 'featured', 'sort_order'];

let sql = `-- Catalogue seed for D1 — generated from server/seed.js PRODUCTS (single source of truth).
-- Regenerate with: node scripts/generate-d1-seed.js > migrations/0002_seed.sql
-- Idempotent: clears existing rows first so it can be re-run safely.

DELETE FROM variants;
DELETE FROM products;

`;

for (const p of PRODUCTS) {
  const vals = { ...p, gallery: JSON.stringify(p.gallery) };
  sql += `INSERT INTO products (${COLS.join(',')}) VALUES (${COLS.map((c) => esc(vals[c])).join(',')});\n`;
  for (const v of p.variants) {
    const id = `${p.id}_${v.size_ml}`;
    sql += `INSERT INTO variants (id,product_id,size_ml,price_paise,sku,stock) VALUES (${esc(id)},${esc(p.id)},${v.size_ml},${v.price_paise},${esc(v.sku)},${v.stock});\n`;
  }
  sql += '\n';
}

process.stdout.write(sql);
