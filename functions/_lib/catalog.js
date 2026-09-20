// Port of server/routes/catalog.js's row-shaping logic.
export async function shapeProduct(db, row) {
  if (!row) return null;
  const { results } = await db.prepare('SELECT * FROM variants WHERE product_id = ? ORDER BY size_ml ASC')
    .bind(row.id).all();
  const variants = results.map((v) => ({
    id: v.id, size_ml: v.size_ml, price_paise: v.price_paise, sku: v.sku,
    stock: v.stock, in_stock: v.stock > 0,
  }));
  return {
    id: row.id, slug: row.slug, name: row.name, subtitle: row.subtitle,
    family: row.family, tagline: row.tagline, story: row.story,
    description: row.description, accent: row.accent,
    featured: !!row.featured,
    notes: { top: row.top_notes, heart: row.heart_notes, base: row.base_notes },
    ingredients: row.ingredients,
    specs: { longevity: row.longevity, sillage: row.sillage, concentration: row.concentration },
    hero_image: row.hero_image,
    gallery: JSON.parse(row.gallery),
    variants,
    from_paise: variants.length ? Math.min(...variants.map((v) => v.price_paise)) : 0,
  };
}
