/* CosmicMuse — order confirmation */
(() => {
  'use strict';
  const { $, api, inr, img, ICON } = window.CM;

  document.addEventListener('DOMContentLoaded', async () => {
    const num = new URLSearchParams(location.search).get('order');
    const host = $('[data-conf]');
    if (!num) { host.innerHTML = `<p class="muted">No order reference supplied.</p>`; return; }

    let o;
    try { o = (await api(`/orders/${encodeURIComponent(num)}`)).order; }
    catch { host.innerHTML = `<p class="muted">We could not find order ${num}.</p>`; return; }

    const eta = new Date(Date.parse(o.created_at) + 4 * 864e5)
      .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    host.innerHTML = `
      <div class="tick">${ICON.check}</div>
      <p class="eyebrow no-rule" style="justify-content:center">Order Confirmed</p>
      <h1 class="display d-md">Thank you, ${o.first_name}.</h1>
      <p class="lede" style="margin:1rem auto 0;max-width:46ch">
        Your order is being packed by hand. A confirmation is on its way to
        <strong style="color:var(--cream)">${o.email}</strong>.
      </p>
      <p class="conf__num" style="margin-top:1.4rem">${o.order_number}</p>

      <div class="conf__box">
        <h3 class="display d-sm" style="margin:0 0 1.1rem">Items</h3>
        ${o.items.map((i) => `
          <div style="display:grid;grid-template-columns:58px 1fr auto;gap:.9rem;align-items:center;padding:.6rem 0">
            <img src="${img(i.image)}" alt="" style="width:58px;height:76px;object-fit:cover">
            <div>
              <div style="font-family:var(--display);font-size:1.05rem">${i.product_name}</div>
              <div class="sz">${i.size_ml}ml × ${i.qty}</div>
            </div>
            <div style="font-family:var(--display)">${inr(i.line_paise)}</div>
          </div>`).join('')}

        <hr class="rule" style="margin:1.2rem 0">
        <div class="conf__row"><span>Subtotal</span><span>${inr(o.subtotal_paise)}</span></div>
        ${o.gift_paise ? `<div class="conf__row"><span>Gift wrap</span><span>${inr(o.gift_paise)}</span></div>` : ''}
        <div class="conf__row"><span>Shipping</span><span>${o.shipping_paise ? inr(o.shipping_paise) : 'Complimentary'}</span></div>
        <div class="conf__row"><span>GST (18%)</span><span>${inr(o.tax_paise)}</span></div>
        <div class="conf__row" style="border-top:1px solid var(--line-soft);margin-top:.5rem;padding-top:.9rem;
             font-family:var(--display);font-size:1.25rem;color:var(--cream)">
          <span>Total paid</span><span>${inr(o.total_paise)}</span></div>
        <div class="conf__row muted" style="font-size:.78rem">
          <span>${o.card_brand} ending ${o.card_last4}</span><span>${o.payment_ref}</span></div>
      </div>

      <div class="conf__box">
        <h3 class="display d-sm" style="margin:0 0 1.1rem">Delivery</h3>
        <p style="margin:0;color:var(--cream-dim);font-size:.9rem;line-height:1.9">
          ${o.first_name} ${o.last_name}<br>
          ${o.address1}${o.address2 ? '<br>' + o.address2 : ''}<br>
          ${o.city}, ${o.state} ${o.postcode}<br>${o.country}<br>
          <span class="muted">${o.phone}</span>
        </p>
        <hr class="rule" style="margin:1.1rem 0">
        <div class="conf__row"><span>Estimated arrival</span><span style="color:var(--tan)">${eta}</span></div>
        <div class="conf__row"><span>Status</span><span class="pill ${o.status}">${o.status}</span></div>
        ${o.gift_note ? `<div class="conf__row"><span>Card message</span><span class="serif-it">“${o.gift_note}”</span></div>` : ''}
      </div>

      <div style="display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;margin-top:2.4rem">
        <a class="btn" href="/shop"><span>Continue shopping</span><i class="arw">→</i></a>
        <a class="btn" href="/admin"><span>Track this order</span></a>
      </div>`;
  });
})();
