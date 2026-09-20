/* CosmicMuse — checkout: live summary, input masking, simulated payment */
(() => {
  'use strict';
  const { $, $$, api, cart, inr, img, toast } = window.CM;

  let gift = false;
  let current = null;

  /* ------------------------------ summary ----------------------------- */
  function summary(s) {
    current = s;
    const host = $('[data-summary]');
    if (!host) return;
    if (!s.items.length) {
      host.innerHTML = `<p class="muted" style="font-size:.88rem">Your bag is empty.</p>
        <a class="btn btn--block btn--sm" href="/shop" style="margin-top:1rem"><span>Explore the collection</span></a>`;
      const p = $('[data-pay]'); if (p) p.disabled = true;
      return;
    }
    const t = s.totals;
    host.innerHTML = `
      <div style="display:grid;gap:.9rem;margin-bottom:1.4rem">
        ${s.items.map((i) => `
          <div style="display:grid;grid-template-columns:54px 1fr auto;gap:.85rem;align-items:center">
            <img src="${img(i.image)}" alt="" style="width:54px;height:70px;object-fit:cover" loading="lazy">
            <div style="min-width:0">
              <div style="font-family:var(--display);font-size:1rem">${i.name}</div>
              <div class="sz">${i.size_ml}ml × ${i.qty}</div>
            </div>
            <div style="font-family:var(--display)">${inr(i.line_paise)}</div>
          </div>`).join('')}
      </div>
      <div class="totals">
        <div><span>Subtotal</span><span>${inr(t.subtotal_paise)}</span></div>
        ${t.gift_paise ? `<div><span>Gift wrap</span><span>${inr(t.gift_paise)}</span></div>` : ''}
        <div><span>Shipping</span><span>${t.shipping_paise ? inr(t.shipping_paise) : 'Complimentary'}</span></div>
        <div><span>GST (18%)</span><span>${inr(t.tax_paise)}</span></div>
        <div class="big"><span>Total</span><span>${inr(t.total_paise)}</span></div>
      </div>`;
    const p = $('[data-pay]'); if (p) p.disabled = false;
  }

  const refresh = async () => summary(await api(`/cart?gift=${gift}`));

  /* ------------------------------ masking ----------------------------- */
  function masks() {
    const cc = $('[data-cc]');
    cc?.addEventListener('input', () => {
      const d = cc.value.replace(/\D/g, '').slice(0, 19);
      cc.value = d.replace(/(.{4})/g, '$1 ').trim();
    });
    const exp = $('[data-exp]');
    exp?.addEventListener('input', () => {
      let d = exp.value.replace(/\D/g, '').slice(0, 4);
      if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
      exp.value = d;
    });
    $('#postcode')?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
    $('#card_cvc')?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  /* ------------------------------- errors ----------------------------- */
  function clearErrors() {
    $$('.field').forEach((f) => { f.classList.remove('err'); const m = $('.msg', f); if (m) m.textContent = ''; });
    $('[data-alert]').innerHTML = '';
  }
  function showErrors(errors) {
    let first = null;
    Object.entries(errors || {}).forEach(([k, v]) => {
      const input = document.querySelector(`[name="${k}"]`);
      const field = input?.closest('.field');
      if (!field) return;
      field.classList.add('err');
      const m = $('.msg', field); if (m) m.textContent = v;
      if (!first) first = input;
    });
    first?.focus();
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const alertBox = (msg, ok = false) => {
    $('[data-alert]').innerHTML = `<div class="alert${ok ? ' alert--ok' : ''}">${msg}</div>`;
    $('[data-alert]').scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  /* -------------------------------- pay ------------------------------- */
  async function submit(e) {
    e.preventDefault();
    clearErrors();
    const btn = $('[data-pay]');
    const state = $('[data-paystate]');
    const f = new FormData(e.target);

    if (!current || !current.items.length) { alertBox('Your bag is empty.'); return; }

    btn.disabled = true;
    state.innerHTML = `<div class="pay-state"><i class="spinner"></i><span>Contacting your bank…</span></div>`;

    // deliberate delay so the processing state is visible, as a real gateway would be
    await new Promise((r) => setTimeout(r, 1500));

    const body = {
      email: f.get('email'), first_name: f.get('first_name'), last_name: f.get('last_name'),
      phone: f.get('phone'), address1: f.get('address1'), address2: f.get('address2'),
      city: f.get('city'), state: f.get('state'), postcode: f.get('postcode'),
      country: f.get('country') || 'India',
      gift_wrap: gift, gift_note: f.get('gift_note'),
      card: {
        name: f.get('card_name'), number: f.get('card_number'),
        expiry: f.get('card_expiry'), cvc: f.get('card_cvc'),
      },
    };

    try {
      const r = await api('/checkout/pay', { method: 'POST', body: JSON.stringify(body) });
      state.innerHTML = `<div class="pay-state"><span style="color:var(--tan)">Approved — placing your order…</span></div>`;
      await new Promise((res) => setTimeout(res, 700));
      location.href = `/confirmation?order=${encodeURIComponent(r.order.order_number)}`;
    } catch (err) {
      state.innerHTML = '';
      btn.disabled = false;
      const d = err.data || {};
      if (d.errors) { showErrors(d.errors); alertBox('Please check the highlighted fields.'); }
      else if (d.code) {
        alertBox(`Payment failed — ${d.message}`);
        const field = $('#card_number')?.closest('.field');
        if (field && /card|number|funds|expired/.test(d.code)) {
          field.classList.add('err');
          $('.msg', field).textContent = d.message;
        }
      } else alertBox(err.message || 'Something went wrong. Please try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    masks();
    cart.on(summary);

    const g = $('[data-gift]');
    g?.addEventListener('change', () => {
      gift = g.checked;
      $('[data-giftnote]').hidden = !gift;
      refresh();
    });

    $('[data-form]').addEventListener('submit', submit);
  });
})();
