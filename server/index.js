'use strict';
const path = require('path');
const express = require('express');
const db = require('./db');
const { seed } = require('./seed');

const catalog = require('./routes/catalog');
const { router: cartRouter } = require('./routes/cart');
const { router: checkoutRouter } = require('./routes/checkout');
const admin = require('./routes/admin');
const { formatINR } = require('./pricing');

const app = express();
const PORT = process.env.PORT || 4000;
const PUBLIC = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// frames + media are immutable build output; HTML should always revalidate
app.use('/assets', express.static(path.join(PUBLIC, 'assets'), {
  maxAge: '30d', immutable: true,
}));
app.use(express.static(PUBLIC, { extensions: ['html'], maxAge: 0, etag: true }));

app.use('/api', catalog);
app.use('/api', cartRouter);
app.use('/api', checkoutRouter);
app.use('/api', admin);

app.post('/api/newsletter', (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return res.status(422).json({ error: 'invalid_email', message: 'Enter a valid email address.' });
  db.prepare('INSERT OR IGNORE INTO newsletter (email,created_at) VALUES (?,?)')
    .run(email, new Date().toISOString());
  res.json({ ok: true, message: 'You are on the list.' });
});

app.get('/api/health', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  res.json({ ok: true, products: n, uptime_s: Math.round(process.uptime()) });
});

// HTML routes (pretty URLs)
const PAGES = {
  '/': 'index.html', '/shop': 'shop.html', '/product': 'product.html',
  '/cart': 'cart.html', '/checkout': 'checkout.html',
  '/confirmation': 'confirmation.html', '/the-house': 'house.html',
  '/the-ritual': 'ritual.html', '/admin': 'admin.html',
};
for (const [route, file] of Object.entries(PAGES)) {
  app.get(route, (req, res) => res.sendFile(path.join(PUBLIC, file)));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'no_such_endpoint', path: req.path }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'server_error', message: err.message });
});

const result = seed();
console.log(`[seed] ${result.seeded ? 'catalogue written' : 'catalogue already present'} (${result.products} products)`);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  CosmicMuse running → http://localhost:${PORT}`);
    console.log(`  admin              → http://localhost:${PORT}/admin`);
    const v = db.prepare('SELECT COUNT(*) AS n FROM variants').get().n;
    console.log(`  ${result.products} fragrances · ${v} variants · prices from ${formatINR(790000)}\n`);
  });
}

module.exports = app;
