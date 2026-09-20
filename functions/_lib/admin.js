// Shared query used by both admin/stats.js and admin/stock.js — port of
// server/routes/admin.js's `stockRows` prepared statement.
export async function stockRows(db) {
  const { results } = await db.prepare(`
    SELECT p.name, p.slug, v.id AS variant_id, v.size_ml, v.sku, v.stock, v.price_paise
    FROM variants v JOIN products p ON p.id = v.product_id
    ORDER BY p.sort_order ASC, v.size_ml ASC`).all();
  return results;
}
