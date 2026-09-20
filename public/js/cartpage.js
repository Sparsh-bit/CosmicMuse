/* CosmicMuse — full-page bag */
(() => {
  'use strict';
  const { $, api, cart, inr, img, ICON, toast } = window.CM;

  function render(s) {
    const lines = $('[data-lines]');
    const sum = $('[data-summary]');
    if (!lines) return;

    if (!s.items.length) {
      lines.innerHTML = `<div class="empty"><p>Your bag is empty.</p>
        <a class="btn" href="/shop"><span>Explore the collection</span><i class="arw">→</i></a></div>`;
      sum.innerHTML = '<p class="muted" style="font-size:.86rem">Add a fragrance to see your total.</p>';
      return;
    }

    lines.innerHTML = s.items.map((i) => `
      <div class="citem" style="grid-template-columns:104px 1fr">
        <a href="/product?slug=${i.slug}"><img src="${img(i.image)}" alt="${i.name}" style="width:104px;height:138px" loading="lazy"></a>
        <div>
          <h4><a href="/product?slug=${i.slug}">${i.name}</a></h4>
          <div class="sz">${i.subtitle} · ${i.size_ml}ml · ${i.sku}</div>
          <div class="citem__row">
            <div class="qty">
              <button data-act="dec" data-vid="${i.variant_id}" data-qty="${i.qty}" aria-label="Decrease">${ICON.minus}</button>
              <span>${i.qty}</span>
              <button data-act="inc" data-vid="${i.variant_id}" data-qty="${i.qty}" aria-label="Increase">${ICON.plus}</button>
            </div>
            <span class="citem__price">${inr(i.line_paise)}</span>
          </div>
          <button class="rm" data-act="rm" data-vid="${i.variant_id}" style="margin-top:.6rem">Remove</button>
        </div>
      </div>`).join('');

    const t = s.totals;
    sum.innerHTML = `
      ${!t.free_shipping && t.remaining_for_free_ship_paise > 0
        ? `<div class="ship-hint">${inr(t.remaining_for_free_ship_paise)} more for complimentary shipping</div>` : ''}
      <div class="totals">
        <div><span>Subtotal (${s.count} item${s.count === 1 ? '' : 's'})</span><span>${inr(t.subtotal_paise)}</span></div>
        <div><span>Shipping</span><span>${t.shipping_paise ? inr(t.shipping_paise) : 'Complimentary'}</span></div>
        <div><span>GST (18%)</span><span>${inr(t.tax_paise)}</span></div>
        <div class="big"><span>Total</span><span>${inr(t.total_paise)}</span></div>
      </div>
      <a class="btn btn--solid btn--block" href="/checkout"><span>Proceed to Checkout</span></a>
      <a class="btn btn--block" href="/shop" style="margin-top:.6rem"><span>Continue shopping</span></a>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    cart.on(render);
    document.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-lines] [data-act]');
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
  });
})();
