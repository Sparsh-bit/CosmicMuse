/* CosmicMuse — homepage motion: scroll-scrub canvas, horizontal rail, film lightbox */
(() => {
  'use strict';
  const { $, $$, api, cart, inr, img, ICON, toast } = window.CM;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ================================================================
     1. Scroll-driven frame sequence — the full 10s clip, 240 frames
     ---------------------------------------------------------------
     The whole film is mapped onto the scroll: the bottle stands, the
     cap lifts, the glass shatters, the essence and citrus suspend, and
     it reassembles. Nothing is cut.

     Frames are WebP and load in strided passes (every 8th, then 4th,
     2nd, then the rest), so scrubbing is smooth within a second or two
     and simply gains detail as the remaining frames arrive.
     ================================================================ */
  function scrubber() {
    const sec = $('[data-scrub]');
    if (!sec) return;
    const canvas = $('canvas', sec);
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const bar = $('[data-scrub-bar] i', sec);
    const notes = $$('[data-note]', sec);

    const COUNT = 240;
    const url = (i) => `/assets/frames/f_${String(i + 1).padStart(3, '0')}.webp`;
    const frames = new Array(COUNT);
    let loaded = 0, ready = false;

    /* ---------------- decoding ---------------- */
    const useBitmap = typeof createImageBitmap === 'function';

    function load(i) {
      if (frames[i]) return Promise.resolve();
      if (useBitmap) {
        return fetch(url(i), { cache: 'force-cache' })
          .then((r) => (r.ok ? r.blob() : Promise.reject()))
          .then((b) => createImageBitmap(b))
          .then((bm) => { frames[i] = bm; loaded++; })
          .catch(() => {});
      }
      return new Promise((res) => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { frames[i] = im; loaded++; res(); };
        im.onerror = () => res();
        im.src = url(i);
      });
    }

    /** run `fn` over `list` with bounded concurrency */
    async function pool(list, limit, fn) {
      let cursor = 0;
      const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
        while (cursor < list.length) await fn(list[cursor++]);
      });
      await Promise.all(workers);
    }

    async function loadAll() {
      // first frame immediately so there is never an empty canvas
      await load(0);
      ready = true; requestDraw();

      for (const step of [8, 4, 2, 1]) {
        const batch = [];
        for (let i = 0; i < COUNT; i += step) if (!frames[i]) batch.push(i);
        if (!batch.length) continue;
        await pool(batch, 12, load);
        sec.dataset.loaded = Math.round((loaded / COUNT) * 100);
        requestDraw();                 // repaint at the new fidelity
      }
      sec.dataset.loaded = '100';
    }

    /* ---------------- painting ---------------- */
    let dpr = 1, cw = 0, ch = 0;
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.parentElement.getBoundingClientRect();
      cw = Math.max(1, Math.round(r.width));
      ch = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      lastKey = '';
    }

    /**
     * Fit the frame without cropping into it.
     *
     * `cover` would zoom in and slice the edges off the shot, so on any
     * reasonably wide viewport the frame is shown whole (`contain`) and the
     * few pixels of margin fall on the page's own black — invisible, because
     * the footage is vignetted to near-black at its edges anyway.
     *
     * Narrow and portrait viewports would be left with a thin letterboxed
     * strip, so those are allowed a capped amount of overscan instead.
     */
    function fitScale(iw, ih) {
      const contain = Math.min(cw / iw, ch / ih);
      const cover = Math.max(cw / iw, ch / ih);
      const vpAR = cw / ch;
      if (vpAR < 0.90) return cover;            // phone portrait — fill, or it reads as a broken strip
      const maxOverscan = vpAR >= 1.25 ? 1.0    // desktop — show the whole frame, no crop
                        : 1.25;                 // square-ish — a little overscan
      return Math.min(cover, contain * maxOverscan);
    }

    function paint(fr, alpha) {
      if (!fr) return;
      const iw = fr.width, ih = fr.height;
      const s = fitScale(iw, ih);
      const w = iw * s, h = ih * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(fr, (cw - w) / 2, (ch - h) / 2, w, h);
      ctx.globalAlpha = 1;
    }

    /** nearest frame that has actually finished decoding */
    function nearest(i) {
      if (frames[i]) return frames[i];
      for (let d = 1; d < COUNT; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    }

    let lastKey = '';
    function draw(p) {
      if (!ready) return;
      const exact = clamp(p) * (COUNT - 1);
      const i = Math.floor(exact);
      const frac = exact - i;
      const pair = frames[i] && frames[i + 1];
      // skip the repaint when nothing visible would change
      const key = pair ? `${i}:${(frac * 24) | 0}` : `n${i}`;
      if (key === lastKey) return;
      lastKey = key;

      ctx.fillStyle = '#0B0908';
      ctx.fillRect(0, 0, cw, ch);
      if (pair) { paint(frames[i], 1); if (frac > 0.012) paint(frames[i + 1], frac); }
      else paint(nearest(i), 1);
    }

    /* ---------------- scroll driving ---------------- */
    let target = 0, current = 0, raf = 0, pending = false;

    function progress() {
      const r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - window.innerHeight;
      return total <= 0 ? 0 : clamp(-r.top / total);
    }

    function chrome(v) {
      if (bar) bar.style.width = (v * 100).toFixed(2) + '%';
      const n = notes.length;
      notes.forEach((el, idx) => {
        const lo = idx / n, hi = (idx + 1) / n;
        el.classList.toggle('on', v >= lo - 0.055 && v < hi + 0.055);
      });
    }

    function tick() {
      // ease toward the scroll position so a fast flick glides instead of stepping
      current += (target - current) * 0.18;
      if (Math.abs(target - current) < 0.00025) current = target;
      draw(current);
      chrome(current);
      raf = Math.abs(target - current) > 0.00025 ? requestAnimationFrame(tick) : 0;
    }

    function requestDraw() { lastKey = ''; draw(current); chrome(current); }

    function onScroll() {
      target = progress();
      if (reduce) { current = target; requestDraw(); return; }
      if (!raf) raf = requestAnimationFrame(tick);
    }

    size();
    window.addEventListener('resize', () => { size(); requestDraw(); }, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    loadAll();
  }

  /* ================================================================
     2. Ingredient universe — vertical scroll drives horizontal travel
     ================================================================ */
  function rail() {
    const sec = $('[data-rail]');
    if (!sec) return;
    const track = $('[data-rail-track]', sec);
    const bar = $('[data-rail-bar] i', sec);
    let max = 0;

    function measure() {
      max = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      sec.style.setProperty('--runway', `${max}px`);
    }

    function onScroll() {
      const r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - window.innerHeight;
      const p = total <= 0 ? 0 : clamp(-r.top / total);
      track.style.transform = `translate3d(${-p * max}px,0,0)`;
      if (bar) bar.style.transform = `translateX(${p * (100 / 0.22 - 100)}%)`;
    }

    measure();
    window.addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================================================================
     3. Film lightbox — the same clip, played straight through
     ================================================================ */
  function film() {
    const btn = $('[data-play]');
    if (!btn) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `
      <button class="icon-btn lightbox__close" data-lbclose aria-label="Close film">${ICON.close}</button>
      <video playsinline controls loop preload="none" poster="/assets/img/film-still.jpg">
        <source src="/assets/video/film-loop.mp4" type="video/mp4">
      </video>`;
    document.body.appendChild(box);
    const v = $('video', box);
    const close = () => { box.classList.remove('on'); v.pause(); document.body.style.overflow = ''; };
    btn.addEventListener('click', () => {
      box.classList.add('on'); document.body.style.overflow = 'hidden';
      v.play().catch(() => {});
    });
    $('[data-lbclose]', box).addEventListener('click', close);
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('on')) close();
    });
  }

  /* ================================================================
     4. Hero parallax (subtle)
     ================================================================ */
  function parallax() {
    if (reduce) return;
    const els = $$('[data-par]');
    if (!els.length) return;
    let raf = 0;
    const run = () => {
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > innerHeight + 100) return;
        const speed = +(el.dataset.par || 0.12);
        const off = (r.top + r.height / 2 - innerHeight / 2) * -speed;
        el.style.transform = `translate3d(0,${off.toFixed(1)}px,0) scale(1.08)`;
      });
      raf = 0;
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
    run();
  }

  /* ================================================================
     5. Featured collection — rendered from the API
     ================================================================ */
  async function collection() {
    const host = $('[data-collection]');
    if (!host) return;
    try {
      const { products } = await api('/products?limit=3');
      host.innerHTML = products.map((p) => card(p)).join('');
      wireCards(host);
      window.CM.reveals();
    } catch (e) {
      host.innerHTML = `<p class="muted">Could not load the collection. Is the server running?</p>`;
    }
  }

  function card(p) {
    return `
      <article class="pcard" data-rv>
        <div class="pcard__media">
          <span class="pcard__fam">${p.family}</span>
          <img src="${img(p.hero_image)}" alt="${p.name} — ${p.subtitle}" loading="lazy" width="900" height="1200">
        </div>
        <button class="pcard__add" data-add="${p.variants[0].id}" data-name="${p.name}"
                aria-label="Add ${p.name} to bag">${ICON.bag}</button>
        <div class="pcard__body">
          <div><h3>${p.name}</h3><p>${p.subtitle}</p></div>
          <div class="pcard__price">${inr(p.from_paise)}<small>from</small></div>
        </div>
        <a class="pcard__link" href="/product?slug=${p.slug}" aria-label="View ${p.name}"></a>
      </article>`;
  }

  function wireCards(root) {
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-add]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      b.disabled = true;
      try { await cart.add(b.dataset.add, 1, b.dataset.name); }
      catch (err) { toast(err.message); }
      b.disabled = false;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    scrubber(); rail(); film(); parallax(); collection();
  });
})();
