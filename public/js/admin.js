/* CosmicMuse — order desk */
(() => {
  'use strict';
  const { $, api, inr, toast } = window.CM;
  const STATUSES = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
  const when = (iso) => new Date(iso).toLocaleString('en-IN',
    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  async function load() {
    let stats, orders;
    try {
      [stats, orders] = await Promise.all([api('/admin/stats'), api('/admin/orders')]);
    } catch (e) {
      $('[data-orders]').innerHTML = `<tbody><tr><td class="muted">Could not reach the server.</td></tr></tbody>`;
      return;
    }

    $('[data-stats]').innerHTML = `
      <div class="stat"><b>${stats.orders}</b><span>Orders</span></div>
      <div class="stat"><b>${inr(stats.revenue_paise)}</b><span>Revenue</span></div>
      <div class="stat"><b>${stats.units}</b><span>Bottles sold</span></div>
      <div class="stat"><b>${stats.orders ? inr(stats.aov_paise) : '—'}</b><span>Average order</span></div>
      <div class="stat"><b>${stats.top_products[0]?.name || '—'}</b><span>Best seller</span></div>`;

    $('[data-orders]').innerHTML = orders.orders.length ? `
      <thead><tr>
        <th>Order</th><th>Placed</th><th>Customer</th><th>Items</th>
        <th>Total</th><th>Payment</th><th>Status</th>
      </tr></thead>
      <tbody>${orders.orders.map((o) => `
        <tr>
          <td><a href="/confirmation?order=${o.order_number}" style="color:var(--tan)">${o.order_number}</a></td>
          <td>${when(o.created_at)}</td>
          <td>${o.first_name} ${o.last_name}<br><span class="muted" style="font-size:.76rem">${o.email}</span><br>
              <span class="muted" style="font-size:.76rem">${o.city}, ${o.state} ${o.postcode}</span></td>
          <td>${o.items.map((i) => `${i.product_name} ${i.size_ml}ml ×${i.qty}`).join('<br>')}
              ${o.gift_wrap ? '<br><span style="color:var(--tan);font-size:.74rem">+ gift wrap</span>' : ''}</td>
          <td style="font-family:var(--display);font-size:1.02rem">${inr(o.total_paise)}</td>
          <td><span class="muted" style="font-size:.76rem">${o.card_brand} ····${o.card_last4}</span></td>
          <td><select data-status data-num="${o.order_number}">
            ${STATUSES.map((s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}
          </select></td>
        </tr>`).join('')}</tbody>`
      : `<tbody><tr><td class="muted">No orders yet. <a class="link-u" href="/shop">Place one</a></td></tr></tbody>`;

    $('[data-stock]').innerHTML = `
      <thead><tr><th>Fragrance</th><th>Size</th><th>SKU</th><th>Price</th><th>On hand</th></tr></thead>
      <tbody>${stats.stock.map((s) => `
        <tr>
          <td>${s.name}</td><td>${s.size_ml} ml</td>
          <td><span class="muted" style="font-family:ui-monospace,monospace;font-size:.78rem">${s.sku}</span></td>
          <td>${inr(s.price_paise)}</td>
          <td><span class="pill ${s.stock === 0 ? 'cancelled' : s.stock <= 8 ? 'confirmed' : 'shipped'}">${s.stock}</span></td>
        </tr>`).join('')}</tbody>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    document.addEventListener('change', async (e) => {
      const sel = e.target.closest('[data-status]');
      if (!sel) return;
      try {
        await api(`/admin/orders/${sel.dataset.num}`, {
          method: 'PATCH', body: JSON.stringify({ status: sel.value }),
        });
        toast(`${sel.dataset.num} → ${sel.value}`);
        load();
      } catch (err) { toast(err.message); }
    });
  });
})();
