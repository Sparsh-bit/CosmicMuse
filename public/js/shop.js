/* CosmicMuse — collection grid with family filters and search */
(() => {
  'use strict';
  const { $, $$, api, cart, inr, img, ICON, toast } = window.CM;

  let all = [];
  let active = 'All';
  const params = new URLSearchParams(location.search);
  const query = (params.get('q') || '').trim().toLowerCase();

  const card = (p) => `
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

  function render() {
    const grid = $('[data-grid]');
    let list = all;
    if (active !== 'All') list = list.filter((p) => p.family === active);
    if (query) {
      list = list.filter((p) =>
        [p.name, p.family, p.tagline, p.description, p.ingredients,
         p.notes.top, p.notes.heart, p.notes.base].join(' ').toLowerCase().includes(query));
    }
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : `<p class="muted">Nothing matches that. <a class="link-u" href="/shop">Show everything</a></p>`;
    $('[data-count]').textContent =
      `${list.length} of ${all.length} fragrances${query ? ` · searching “${query}”` : ''}`;
    window.CM.reveals();
  }

  function filters() {
    const host = $('[data-filters]');
    const fams = ['All', ...new Set(all.map((p) => p.family))];
    host.innerHTML = fams.map((f) =>
      `<button data-f="${f}"${f === active ? ' class="on"' : ''}>${f}</button>`).join('');
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      active = b.dataset.f;
      $$('button', host).forEach((x) => x.classList.toggle('on', x === b));
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      all = (await api('/products')).products;
    } catch (e) {
      $('[data-grid]').innerHTML = `<p class="muted">Could not reach the server.</p>`;
      return;
    }
    filters();
    render();

    $('[data-grid]').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-add]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      b.disabled = true;
      try { await cart.add(b.dataset.add, 1, b.dataset.name); }
      catch (err) { toast(err.message); }
      b.disabled = false;
    });
  });
})();
