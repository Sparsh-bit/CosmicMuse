'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'cosmicmuse.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  subtitle      TEXT NOT NULL,
  family        TEXT NOT NULL,
  tagline       TEXT NOT NULL,
  story         TEXT NOT NULL,
  description   TEXT NOT NULL,
  top_notes     TEXT NOT NULL,
  heart_notes   TEXT NOT NULL,
  base_notes    TEXT NOT NULL,
  ingredients   TEXT NOT NULL,
  longevity     TEXT NOT NULL,
  sillage       TEXT NOT NULL,
  concentration TEXT NOT NULL,
  hero_image    TEXT NOT NULL,
  gallery       TEXT NOT NULL,
  accent        TEXT NOT NULL,
  featured      INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS variants (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_ml     INTEGER NOT NULL,
  price_paise INTEGER NOT NULL,
  sku         TEXT NOT NULL UNIQUE,
  stock       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

CREATE TABLE IF NOT EXISTS carts (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES variants(id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE (cart_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  order_number     TEXT NOT NULL UNIQUE,
  created_at       TEXT NOT NULL,
  status           TEXT NOT NULL,
  email            TEXT NOT NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  address1         TEXT NOT NULL,
  address2         TEXT,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  postcode         TEXT NOT NULL,
  country          TEXT NOT NULL,
  gift_wrap        INTEGER NOT NULL DEFAULT 0,
  gift_note        TEXT,
  subtotal_paise   INTEGER NOT NULL,
  gift_paise       INTEGER NOT NULL DEFAULT 0,
  shipping_paise   INTEGER NOT NULL,
  tax_paise        INTEGER NOT NULL,
  total_paise      INTEGER NOT NULL,
  payment_method   TEXT NOT NULL,
  payment_ref      TEXT,
  card_last4       TEXT,
  card_brand       TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id    TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  product_slug  TEXT NOT NULL,
  size_ml       INTEGER NOT NULL,
  unit_paise    INTEGER NOT NULL,
  qty           INTEGER NOT NULL,
  line_paise    INTEGER NOT NULL,
  image         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS newsletter (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
`);

module.exports = db;
