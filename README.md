# CosmicMuse

A luxury fragrance e-commerce site — front end and working backend.

Dark amber art direction, a scroll-driven bottle deconstruction rendered from real film
frames, six hardcoded fragrances, and a full purchase flow with a simulated payment step.

---

## Run it

```bash
npm install
npm start
```

Then open **http://localhost:4000**. The catalogue seeds itself into SQLite on first boot.

| URL | What it is |
| --- | --- |
| `/` | Landing page — all eleven sections |
| `/shop` | Collection grid, family filters, search, journal |
| `/product?slug=no-01` | Product detail — gallery, sizes, notes, add to bag |
| `/cart` | Bag |
| `/checkout` | Address, gift wrap, simulated payment |
| `/confirmation?order=CM-…` | Order confirmation |
| `/the-ritual`, `/the-house` | Editorial pages |
| `/admin` | Order desk — orders, status changes, stock |

`npm run seed` re-seeds the catalogue. Delete `data/cosmicmuse.db*` for a clean slate.

---

## The scroll animation

The section headed *Everything Begins With A Drop* is a pinned 560vh block. As you scroll
through it, `public/js/home.js` maps scroll progress onto **all 240 frames** of the clip —
1920x1080 WebP in `public/assets/frames/` — and paints them to a `<canvas>`.

The whole film plays: the bottle stands, the cap releases, the glass shatters, the essence
and citrus hang suspended, and it reassembles. Nothing is trimmed and nothing is masked.

Four things keep it smooth:

- **Progressive loading.** Frames are fetched in strided passes — every 8th, then every
  4th, 2nd, and finally the rest — with bounded concurrency. Scrubbing is usable within
  about a second and simply gains detail as the remaining frames land. The canvas always
  falls back to the nearest frame that has actually decoded.
- **`createImageBitmap`.** Frames decode off the main thread, so decoding never competes
  with scrolling.
- **Cross-fade interpolation.** Progress lands between frames, so frame *N* is drawn at
  full opacity and *N+1* at the fractional remainder.
- **Eased catch-up plus repaint skipping.** The painted position chases the scroll at 18%
  per frame, and a repaint is skipped outright when nothing visible would change.

Measured on a 1500x860 viewport, a continuous 5-second scroll through the section holds a
median 16.7 ms per frame (59.9 fps) with **zero** frames over 33 ms.

**Fitting.** The canvas deliberately does *not* use `object-fit: cover`, which would zoom
into the shot and slice its edges off. On any reasonably wide viewport the whole frame is
shown; the few pixels of margin fall on the page's own black and are invisible, because the
footage is vignetted to near-black at its edges anyway. Portrait viewports would be left
with a thin letterboxed strip, so those fill instead. See `fitScale()` in `home.js`.

The section honours `prefers-reduced-motion` by scrubbing without the easing.

The ingredient rail uses the same idea horizontally: vertical scroll inside a pinned section
drives a `translate3d` on the track.

### About the footage

The frames and `film-loop.mp4` are the video supplied for this project, colour-graded to the
CosmicMuse palette — crushed blacks, warm amber midtones, desaturated highlights and a
vignette. The exact ffmpeg chain is in `docs/pipeline.md`.

The clip is used complete: all 240 frames, no cuts, nothing blurred or masked, upscaled to
1920x1080 with Lanczos and a light unsharp pass. The grain that an earlier pass baked in was
removed — it was wrecking compression in the dark gradients and costing more in artefacts
than it added in texture. The page's own CSS grain overlay covers that for free.

The bottle in the footage carries a **SERAPHIS LIBERTÉ** label, which is visible throughout.
That is the supplied asset as shot.

To swap in your own footage, drop frames into `public/assets/frames/` as `f_001.webp …`
and update `COUNT` in `public/js/home.js`.

---

## Imagery

All photography is real. Nothing is AI-generated.

- **Bottles** — unbranded product photography, colour-graded per fragrance so each of the
  six reads distinctly (deepest for Noctis, honey for Aurea, cool for Vesper).
- **Ingredients** — macro photographs of bergamot, saffron, cardamom, rose, oud and
  sandalwood.
- **Interiors and texture** — blending room, vials, dark marble, incense smoke, dried botanicals.

Every image was put through one grading pipeline (`docs/pipeline.md`) so the set reads as a
single art direction rather than assorted stock. Sources are listed in `docs/credits.md`.

---

## Type and colour

| Role | Face |
| --- | --- |
| Display | Playfair Display |
| Quotes | Cormorant Garamond (italic) |
| UI, labels | Jost |

```
--bg        #0B0908      --cream      #EFE7DB
--bg-2      #100C0A      --cream-dim  #CFC3B4
--bg-3      #17120F      --muted      #8B8076
--tan       #C9A27E      --gold       #C6A15B
```

All tokens live at the top of `public/css/site.css`.

---

## Backend

Express + SQLite (`better-sqlite3`), no ORM, no external services.

```
server/
  index.js            app, static serving, page routes
  db.js               schema — products, variants, carts, orders, newsletter
  seed.js             the hardcoded catalogue
  pricing.js          money maths (integer paise throughout)
  routes/
    catalog.js        GET  /api/products, /api/products/:slug
    cart.js           GET/POST/PATCH/DELETE /api/cart[/items[/:variantId]]
    checkout.js       POST /api/checkout/validate, /api/checkout/pay
                      GET  /api/orders/:orderNumber
    admin.js          GET  /api/admin/orders|stats|stock
                      PATCH /api/admin/orders/:orderNumber
```

**Money.** Everything is integer paise (₹1 = 100 paise); no floats touch a price.
GST is 18% on goods plus gift wrap. Shipping is ₹250, waived above ₹10,000.

**Carts** are server-side rows keyed by an id the browser keeps in `localStorage` and sends
as `x-cart-id`. The server mints one on first request.

**Stock** is checked when an item is added *and* again inside the payment transaction, then
decremented in the same transaction that writes the order — so a sold-out race can't
oversell.

### Simulated payment

No gateway is contacted. `server/routes/checkout.js` validates the card the way a real
front end would — Luhn check, expiry parse and comparison against today, CVC shape — then
branches on the last four digits. Only the last four and the detected brand are persisted;
the number is never stored.

| Card | Result |
| --- | --- |
| `4242 4240 0006 1111` | Approved |
| `4242 4240 0002 0000` | Declined by issuer |
| `4242 4240 0000 0341` | Insufficient funds |
| `4242 4240 0000 0069` | Reported lost |

All four pass Luhn, so they exercise the decline paths rather than the validation paths.
Anything else Luhn-valid is approved. The checkout page shows these on screen.

---

## Front end

No framework and no build step — plain ES modules served as-is.

```
public/js/
  app.js           nav, mobile drawer, reveal observer, cart store, bag drawer, toasts, footer
  home.js          scroll-scrub canvas, ingredient rail, film lightbox, parallax
  shop.js          grid, family filters, search
  product.js       gallery, size selection, accordion, add to bag
  cartpage.js      full-page bag
  checkout.js      live summary, input masking, payment states
  confirmation.js  order lookup
  admin.js         order desk
```

`app.js` owns a small cart store with a subscribe function; the nav badge, drawer and any
page-level summary all render from the same state, so they never disagree.

Responsive down to 390px. Reveal animations, the grain overlay and the scroll easing all
back off under `prefers-reduced-motion`.

---

## Verified

- Full purchase flow driven in a real browser: filter → product → size → add → bag →
  quantity change → gift wrap → declined card → validation failure → approved payment →
  confirmation → cart emptied → stock decremented → admin status change.
- Totals checked by hand against the API at each step.
- Scroll performance measured: 59.9 fps median, zero dropped frames through the film section.
- Every scroll position on the homepage sampled at 2% intervals — no dead screens.
- Canvas fitting checked at 390x844, 1024x1366, 1500x860 and 1920x1080.
- No console errors on any page.
- No horizontal overflow at 390px.

Re-run the API smoke test with `npm test`.

---

## Notes and limits

- This is a demonstration store. No payment is processed and nothing ships.
- There is no authentication; `/admin` is open. Put it behind auth before deploying anywhere.
- The catalogue is hardcoded in `server/seed.js` by design — edit it there and run
  `npm run seed`.
