// Port of GET /api/admin/stats from server/routes/admin.js.
import { json } from '../../_lib/cart.js';
import { stockRows } from '../../_lib/admin.js';

export async function onRequestGet({ env }) {
  const agg = await env.DB.prepare(`
    SELECT COUNT(*) AS orders,
           COALESCE(SUM(total_paise),0) AS revenue_paise,
           COALESCE(AVG(total_paise),0) AS aov_paise
    FROM orders WHERE status != 'cancelled'`).first();
  const units = await env.DB.prepare(`
    SELECT COALESCE(SUM(oi.qty),0) AS units FROM order_items oi
    JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled'`).first();
  const { results: top } = await env.DB.prepare(`
    SELECT oi.product_name AS name, SUM(oi.qty) AS units, SUM(oi.line_paise) AS revenue_paise
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelled'
    GROUP BY oi.product_name ORDER BY units DESC LIMIT 5`).all();
  const { results: byStatus } = await env.DB.prepare(
    'SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();

  return json({
    orders: agg.orders,
    revenue_paise: agg.revenue_paise,
    aov_paise: Math.round(agg.aov_paise),
    units: units.units,
    top_products: top,
    by_status: byStatus,
    stock: await stockRows(env.DB),
  });
}
