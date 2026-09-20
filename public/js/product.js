/* CosmicMuse — product detail: gallery, size selection, accordion, add to bag */
(() => {
  'use strict';
  const { $, $$, api, cart, inr, img, ICON, toast } = window.CM;

  let product = null;
  let variant = null;

  const stockLabel = (v) => {
    if (!v) return '';
    if (v.stock === 0) return ['out', 'Out of stock'];
    if (v.stock <= 8) return ['low', `Only ${v.stock} left in this size`];
    return ['', 'In stock · ships within 48 hours'];
  };

  function render(p) {
    const host = $('[data-pdp]');
    variant = p.variants.find((v) => v.stock > 0) || p.variants[0];
    const [cls, label] = stockLabel(variant);

    host.innerHTML = `
      <div class="pdp__gallery">
        <div class="pdp__thumbs" data-thumbs>
          ${p.gallery.map((g, i) => `
            <button data-thumb="${g}" class="${i === 0 ? 'on' : ''}" aria-label="View image ${i + 1}">
              <img src="${img(g)}" alt="" loading="lazy">
            </button>`).join('')}
        </div>
        <div class="pdp__main"><img src="${img(p.gallery[0])}" alt="${p.name}" data-main width="1000" height="1250"></div>
      </div>

      <div class="pdp__body">
        <h1 class="display d-lg">${p.name}</h1>
        <p class="pdp__sub">${p.subtitle} · ${p.family}</p>
        <p class="lede">${p.description}</p>

        <div class="pdp__price" data-price>${inr(variant.price_paise)}<small>${variant.size_ml}ml · incl. taxes at checkout</small></div>

        <div class="sizes" data-sizes>
          ${p.variants.map((v) => `
            <button class="size ${v.id === variant.id ? 'on' : ''}" data-size="${v.id}"
                    ${v.stock === 0 ? 'disabled' : ''}>${v.size_ml} ml</button>`).join('')}
        </div>

        <div class="stock-note" data-stock><i class="dot ${cls}"></i><span>${label}</span></div>

        <button class="btn btn--solid btn--block" data-buy ${variant.stock === 0 ? 'disabled' : ''}>
          <span>${variant.stock === 0 ? 'Out of stock' : 'Add to Bag'}</span>
        </button>

        <div class="acc">
          ${accItem('Fragrance Notes', `
            <dl>
              <dt>Top</dt><dd>${p.notes.top}</dd>
              <dt>Heart</dt><dd>${p.notes.heart}</dd>
              <dt>Base</dt><dd>${p.notes.base}</dd>
            </dl>`, true)}
          ${accItem('The Story', `<p style="margin:0">${p.story}</p>`)}
          ${accItem('Ingredients', `<p style="margin:0">${p.ingredients}</p>`)}
          ${accItem('Wear &amp; Character', `
            <dl>
              <dt>Longevity</dt><dd>${p.specs.longevity}</dd>
              <dt>Sillage</dt><dd>${p.specs.sillage}</dd>
              <dt>Concentration</dt><dd>${p.specs.concentration}</dd>
            </dl>`)}
          ${accItem('Shipping &amp; Returns', `
            <p style="margin:0">Complimentary shipping on orders over ₹10,000, otherwise ₹250.
            Dispatched within 48 hours. Unopened bottles may be returned within 30 days;
            we pay return postage.</p>`)}
        </div>
      </div>`;

    wire(p);
  }

  const accItem = (title, body, open = false) => `
    <div class="acc__item ${open ? 'on' : ''}">
      <button class="acc__btn" data-acc>${title}<i>+</i></button>
      <div class="acc__panel"${open ? ' style="max-height:400px"' : ''}><div>${body}</div></div>
    </div>`;

  function wire(p) {
    const main = $('[data-main]');

    $('[data-thumbs]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-thumb]');
      if (!b) return;
      $$('[data-thumb]').forEach((x) => x.classList.toggle('on', x === b));
      main.style.opacity = '0';
      setTimeout(() => { main.src = img(b.dataset.thumb); main.style.opacity = '1'; }, 180);
    });

    $('[data-sizes]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-size]');
      if (!b) return;
      variant = p.variants.find((v) => v.id === b.dataset.size);
      $$('[data-size]').forEach((x) => x.classList.toggle('on', x === b));
      $('[data-price]').innerHTML =
        `${inr(variant.price_paise)}<small>${variant.size_ml}ml · incl. taxes at checkout</small>`;
      const [cls, label] = stockLabel(variant);
      $('[data-stock]').innerHTML = `<i class="dot ${cls}"></i><span>${label}</span>`;
      const buy = $('[data-buy]');
      buy.disabled = variant.stock === 0;
      buy.querySelector('span').textContent = variant.stock === 0 ? 'Out of stock' : 'Add to Bag';
    });

    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-acc]');
      if (!b) return;
      const item = b.closest('.acc__item');
      const panel = $('.acc__panel', item);
      const open = item.classList.toggle('on');
      panel.style.maxHeight = open ? panel.scrollHeight + 40 + 'px' : '0px';
    });

    $('[data-buy]').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try { await cart.add(variant.id, 1, `${p.name} ${variant.size_ml}ml`); }
      catch (err) { toast(err.message); }
      b.disabled = variant.stock === 0;
    });
  }

  function renderRelated(list) {
    if (!list.length) return;
    $('[data-related-sec]').hidden = false;
    $('[data-related]').innerHTML = list.map((p) => `
      <article class="pcard">
        <div class="pcard__media">
          <span class="pcard__fam">${p.family}</span>
          <img src="${img(p.hero_image)}" alt="${p.name}" loading="lazy" width="900" height="1200">
        </div>
        <div class="pcard__body">
          <div><h3>${p.name}</h3><p>${p.subtitle}</p></div>
          <div class="pcard__price">${inr(p.from_paise)}<small>from</small></div>
        </div>
        <a class="pcard__link" href="/product?slug=${p.slug}" aria-label="View ${p.name}"></a>
      </article>`).join('');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const slug = new URLSearchParams(location.search).get('slug') || 'no-01';
    try {
      const { product: p, related } = await api(`/products/${encodeURIComponent(slug)}`);
      product = p;
      document.title = `${p.name} — ${p.subtitle} — CosmicMuse`;
      $('[data-crumbs]').innerHTML =
        `<a href="/">Home</a> &nbsp;/&nbsp; <a href="/shop">Collection</a> &nbsp;/&nbsp; ${p.name}`;
      render(p);
      renderRelated(related);
    } catch (e) {
      $('[data-pdp]').innerHTML =
        `<p class="muted">We could not find that fragrance. <a class="link-u" href="/shop">Back to the collection</a></p>`;
    }
  });
})();
