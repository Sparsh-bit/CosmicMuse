/* CosmicMuse — shared runtime: nav, reveals, cart state, drawer, toast */
(() => {
  'use strict';

  /* ----------------------------- helpers ----------------------------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CART_KEY = 'cm_cart_id';

  const inr = (paise) =>
    '₹' + Math.round(paise / 100).toLocaleString('en-IN');

  const img = (name, ext = 'jpg') => `/assets/img/${name}.${ext}`;

  const ICON = {
    bag:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="8.5" r="3.4"/><path d="M4.8 20c.7-3.6 3.7-5.6 7.2-5.6S18.5 16.4 19.2 20"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="11" cy="11" r="6.2"/><path d="m16 16 4 4"/></svg>',
    close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 8h16M4 16h16"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 6v12M6 12h12"/></svg>',
    minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 12h12"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="15" height="15"><path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    ig:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3.5" y="3.5" width="17" height="17" rx="4.6"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
    pin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    yt:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2.5" y="6" width="19" height="12" rx="3.6"/><path d="m10.5 9.6 5 2.4-5 2.4V9.6Z" fill="currentColor" stroke="none"/></svg>',
    x:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 4l16 16M20 4 4 20"/></svg>',
  };

  /* ------------------------------- API ------------------------------- */
  const api = async (path, opts = {}) => {
    const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
    const cid = localStorage.getItem(CART_KEY);
    if (cid) headers['x-cart-id'] = cid;
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const newId = res.headers.get('x-cart-id');
    if (newId && newId !== cid) localStorage.setItem(CART_KEY, newId);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) throw Object.assign(new Error(data?.message || `Request failed (${res.status})`), {
      status: res.status, data,
    });
    return data;
  };

  /* ------------------------------ toast ------------------------------ */
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `${ICON.check}<span></span>`;
    toastEl.querySelector('span').textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('on'));
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 2800);
  }

  /* --------------------------- cart store ---------------------------- */
  const cart = {
    state: { items: [], count: 0, totals: null },
    subs: new Set(),
    on(fn) { this.subs.add(fn); fn(this.state); return () => this.subs.delete(fn); },
    emit() { this.subs.forEach((f) => f(this.state)); },
    set(d) { this.state = d; this.emit(); },
    async load() { try { this.set(await api('/cart')); } catch (e) { console.warn(e); } },
    async add(variant_id, qty = 1, label) {
      const d = await api('/cart/items', { method: 'POST', body: JSON.stringify({ variant_id, qty }) });
      this.set(d);
      toast(label ? `${label} added to your bag` : 'Added to your bag');
      openDrawer();
      return d;
    },
    async setQty(variant_id, qty) {
      this.set(await api(`/cart/items/${variant_id}`, { method: 'PATCH', body: JSON.stringify({ qty }) }));
    },
    async remove(variant_id) {
      this.set(await api(`/cart/items/${variant_id}`, { method: 'DELETE' }));
    },
  };

  /* ------------------------------- nav ------------------------------- */
  function buildNav() {
    const host = $('[data-nav]');
    if (!host) return;
    // Several nav links share a pathname (/shop, /shop?f=collections,
    // /shop#journal) and only differ by query/hash, so matching on pathname
    // alone lit up all of them at once on any /shop page. Prefer an exact
    // full-URL match (path+query+hash); if none of the links are that
    // specific — e.g. a search (/shop?q=amber) or an unlisted anchor
    // (/the-house#sourcing) — fall back to the bare link for that pathname
    // so the parent tab still lights up instead of nothing at all.
    const pathname = location.pathname.replace(/\/$/, '') || '/';
    const here = pathname + location.search + location.hash;
    const links = [
      ['/shop', 'Shop'], ['/shop?f=collections', 'Collections'],
      ['/the-ritual', 'The Ritual'], ['/the-house', 'The House'], ['/shop#journal', 'Journal'],
    ];
    const current = links.find(([h]) => h === here) || links.find(([h]) => h === pathname);
    host.className = 'nav';
    host.innerHTML = `
      <div class="nav__in">
        <a class="brand" href="/"><b>Cosmic</b>Muse</a>
        <nav class="nav__links" aria-label="Primary">
          ${links.map(([h, t]) =>
            `<a href="${h}"${current && h === current[0] ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
        </nav>
        <div class="nav__tools">
          <button class="icon-btn" data-search aria-label="Search">${ICON.search}</button>
          <a class="icon-btn" href="/admin" aria-label="Account">${ICON.user}</a>
          <button class="icon-btn" data-open-cart aria-label="Open bag">
            ${ICON.bag}<i class="cart-count" data-cart-count>0</i>
          </button>
          <button class="icon-btn burger" data-burger aria-label="Menu">${ICON.menu}</button>
        </div>
      </div>`;

    // mobile drawer
    const m = document.createElement('div');
    m.className = 'mnav';
    m.innerHTML = `
      <button class="icon-btn mnav__close" data-mclose aria-label="Close menu">${ICON.close}</button>
      ${[['/', 'Home', '01'], ['/shop', 'Shop', '02'], ['/the-ritual', 'The Ritual', '03'],
         ['/the-house', 'The House', '04'], ['/cart', 'Bag', '05'], ['/admin', 'Orders', '06']]
        .map(([h, t, n]) => `<a href="${h}">${t}<span>${n}</span></a>`).join('')}`;
    document.body.appendChild(m);
    $('[data-burger]')?.addEventListener('click', () => m.classList.add('on'));
    $('[data-mclose]', m)?.addEventListener('click', () => m.classList.remove('on'));

    $('[data-search]')?.addEventListener('click', () => {
      const q = prompt('Search fragrances');
      if (q) location.href = `/shop?q=${encodeURIComponent(q)}`;
    });

    // stuck / hide-on-scroll-down
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      host.classList.toggle('is-stuck', y > 40);
      host.classList.toggle('is-hidden', y > 460 && y > last && !$('.drawer.on'));
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------- cart drawer --------------------------- */
  let drawer, scrim;
  function buildDrawer() {
    scrim = document.createElement('div');
    scrim.className = 'scrim';
    drawer = document.createElement('aside');
    drawer.className = 'drawer';
    drawer.setAttribute('aria-label', 'Shopping bag');
    drawer.innerHTML = `
      <div class="drawer__top">
        <h3>Your Bag <span class="muted" data-dcount style="font-family:var(--sans);font-size:.72rem;letter-spacing:.2em"></span></h3>
        <button class="icon-btn" data-dclose aria-label="Close bag">${ICON.close}</button>
      </div>
      <div class="drawer__body" data-dbody></div>
      <div class="drawer__foot" data-dfoot></div>`;
    document.body.append(scrim, drawer);
    scrim.addEventListener('click', closeDrawer);
    $('[data-dclose]', drawer).addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

    drawer.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const { act, vid } = b.dataset;
      b.disabled = true;
      try {
        if (act === 'inc') await cart.setQty(vid, +b.dataset.qty + 1);
        if (act === 'dec') await cart.setQty(vid, Math.max(0, +b.dataset.qty - 1));
        if (act === 'rm')  await cart.remove(vid);
      } catch (err) { toast(err.message); }
      b.disabled = false;
    });
  }

  function renderDrawer(s) {
    if (!drawer) return;
    const body = $('[data-dbody]', drawer);
    const foot = $('[data-dfoot]', drawer);
    $('[data-dcount]', drawer).textContent = s.count ? `(${s.count})` : '';

    if (!s.items.length) {
      body.innerHTML = `<div class="empty"><p>Your bag is empty.</p>
        <a class="btn btn--sm" href="/shop"><span>Explore the collection</span></a></div>`;
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = s.items.map((i) => `
      <div class="citem">
        <img src="${img(i.image)}" alt="${i.name}" loading="lazy">
        <div>
          <h4>${i.name}</h4>
          <div class="sz">${i.subtitle} · ${i.size_ml}ml</div>
          <div class="citem__row">
            <div class="qty">
              <button data-act="dec" data-vid="${i.variant_id}" data-qty="${i.qty}" aria-label="Decrease">${ICON.minus}</button>
              <span>${i.qty}</span>
              <button data-act="inc" data-vid="${i.variant_id}" data-qty="${i.qty}" aria-label="Increase">${ICON.plus}</button>
            </div>
            <span class="citem__price">${inr(i.line_paise)}</span>
          </div>
          <button class="rm" data-act="rm" data-vid="${i.variant_id}" style="margin-top:.55rem">Remove</button>
        </div>
      </div>`).join('');

    const t = s.totals;
    foot.innerHTML = `
      ${!t.free_shipping && t.remaining_for_free_ship_paise > 0
        ? `<div class="ship-hint">${inr(t.remaining_for_free_ship_paise)} more for complimentary shipping</div>` : ''}
      <div class="totals">
        <div><span>Subtotal</span><span>${inr(t.subtotal_paise)}</span></div>
        <div><span>Shipping</span><span>${t.shipping_paise ? inr(t.shipping_paise) : 'Complimentary'}</span></div>
        <div><span>GST (18%)</span><span>${inr(t.tax_paise)}</span></div>
        <div class="big"><span>Total</span><span>${inr(t.total_paise)}</span></div>
      </div>
      <a class="btn btn--solid btn--block" href="/checkout"><span>Proceed to checkout</span></a>
      <a class="btn btn--block" href="/cart" style="margin-top:.6rem"><span>View bag</span></a>`;
  }

  function openDrawer() { drawer?.classList.add('on'); scrim?.classList.add('on'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer?.classList.remove('on'); scrim?.classList.remove('on'); document.body.style.overflow = ''; }

  /* ----------------------------- reveals ----------------------------- */
  function reveals() {
    const els = $$('[data-rv]');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const d = +(en.target.dataset.rvDelay || 0);
        setTimeout(() => en.target.classList.add('in'), d);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    els.forEach((e) => io.observe(e));
  }

  /* --------------------------- split headline ------------------------- */
  function splitLines() {
    $$('[data-split]').forEach((el) => {
      const html = el.innerHTML.split(/<br\s*\/?>/i)
        .map((l) => `<span class="rv-line"><span>${l.trim()}</span></span>`).join('');
      el.innerHTML = html;
      // The lines start translated out of view and only settle once an
      // ancestor picks up `.in`, so guarantee this element is observed.
      if (!el.hasAttribute('data-rv') && !el.closest('[data-rv]')) el.setAttribute('data-rv', 'fade');
    });
  }

  /* ------------------------------ footer ----------------------------- */
  function buildFooter() {
    const f = $('[data-footer]');
    if (!f) return;
    f.className = 'foot';
    f.innerHTML = `
      <div class="wrap">
        <div class="foot__grid">
          <div>
            <a class="brand" href="/" style="font-size:1.5rem"><b>Cosmic</b>Muse</a>
            <p class="lede" style="font-size:.88rem;margin:.9rem 0 0;max-width:34ch">
              Scents beyond time. Made slowly in small batches, from materials we source ourselves.
            </p>
            <div class="nl">
              <input type="email" placeholder="Your email" aria-label="Email address" data-nl-input>
              <button data-nl-send aria-label="Subscribe">${ICON.arrow}</button>
            </div>
            <div class="nl-msg" data-nl-msg></div>
          </div>
          <div><h4>Shop</h4><ul>
            <li><a href="/shop">All fragrances</a></li>
            <li><a href="/product?slug=no-01">No. 01</a></li>
            <li><a href="/product?slug=solara">Solara</a></li>
            <li><a href="/product?slug=noctis">Noctis</a></li>
            <li><a href="/shop">Discovery set</a></li></ul></div>
          <div><h4>The House</h4><ul>
            <li><a href="/the-house">Our story</a></li>
            <li><a href="/the-ritual">The ritual</a></li>
            <li><a href="/the-house#sourcing">Sourcing</a></li>
            <li><a href="/admin">Order status</a></li></ul></div>
          <div><h4>Care</h4><ul>
            <li><a href="/shop">Shipping &amp; returns</a></li>
            <li><a href="/shop">Contact</a></li>
            <li><a href="/shop">Terms</a></li>
            <li><a href="/shop">Privacy</a></li></ul></div>
        </div>
        <div class="foot__bar">
          <span>© ${new Date().getFullYear()} CosmicMuse. All rights reserved.</span>
          <div class="foot__social">
            <a href="#" aria-label="Instagram">${ICON.ig}</a>
            <a href="#" aria-label="Pinterest">${ICON.pin}</a>
            <a href="#" aria-label="YouTube">${ICON.yt}</a>
            <a href="#" aria-label="X">${ICON.x}</a>
          </div>
          <span class="muted">Scents for a more human tomorrow.</span>
        </div>
      </div>`;

    const send = async () => {
      const input = $('[data-nl-input]', f);
      const msg = $('[data-nl-msg]', f);
      try {
        const r = await api('/newsletter', { method: 'POST', body: JSON.stringify({ email: input.value }) });
        msg.textContent = r.message; input.value = '';
      } catch (e) { msg.textContent = e.message; }
    };
    $('[data-nl-send]', f).addEventListener('click', send);
    $('[data-nl-input]', f).addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  /* ------------------------------- boot ------------------------------ */
  function boot() {
    buildNav();
    buildDrawer();
    buildFooter();
    splitLines();
    reveals();

    cart.on((s) => {
      renderDrawer(s);
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = s.count;
        el.classList.toggle('on', s.count > 0);
      });
    });
    cart.load();

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openDrawer(); }
    });
  }

  document.addEventListener('DOMContentLoaded', boot);

  window.CM = { $, $$, api, cart, inr, img, ICON, toast, openDrawer, closeDrawer, reveals };
})();
