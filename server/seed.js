'use strict';
/**
 * Hardcoded CosmicMuse catalogue. Everything — copy, notes, pricing, stock —
 * lives here and is written into SQLite on first boot.
 * Prices are stored in paise (₹1 = 100 paise) so all money maths is integer-only.
 */
const db = require('./db');

const PRODUCTS = [
  {
    id: 'p_no01', slug: 'no-01', name: 'No. 01', subtitle: 'Eau de Parfum',
    family: 'Amber · Woody', accent: '#C9A27E', featured: 1, sort_order: 1,
    tagline: 'The first accord we ever got right.',
    story:
      'No. 01 began as a mistake — a saffron tincture left too long in aged oak. ' +
      'Six months later it had turned the colour of dark honey and smelled of a room ' +
      'someone had just left. We spent four years learning how to repeat the accident.',
    description:
      'A fragrance built around warm amber, saffron and aged woods. It opens bright and ' +
      'resinous, settles into something darker within the hour, and stays close to the skin ' +
      'for most of a day.',
    top_notes: 'Saffron, Pink Pepper, Bergamot',
    heart_notes: 'Amber, Orris Root, Dried Rose',
    base_notes: 'Aged Oak, Labdanum, Vanilla Absolute',
    ingredients:
      'Kashmiri saffron threads · Calabrian bergamot · Florentine orris · Laotian oud oil · ' +
      'Madagascan vanilla absolute · Cistus labdanum',
    longevity: '8–10 hours', sillage: 'Moderate — an arm\'s length',
    concentration: '22% parfum extrait',
    hero_image: 'prod-1', gallery: ['prod-1', 'prod-1-b', 'prod-1-d', 'prod-1-e'],
    variants: [
      { size_ml: 50,  price_paise: 890000,  sku: 'CM-N01-50',  stock: 34 },
      { size_ml: 100, price_paise: 1340000, sku: 'CM-N01-100', stock: 18 },
    ],
  },
  {
    id: 'p_solara', slug: 'solara', name: 'Solara', subtitle: 'Eau de Parfum',
    family: 'Citrus · Spice', accent: '#D08B4A', featured: 1, sort_order: 2,
    tagline: 'Late afternoon, held still.',
    story:
      'Built backwards from a memory of a courtyard in Seville at four in the afternoon — ' +
      'hot stone, cut citrus, someone grinding cardamom two floors up. The brief was to make ' +
      'the light itself smell like something.',
    description:
      'The brightest thing we make. Bergamot and blood orange over green cardamom, ' +
      'landing on a warm amber base that keeps it from ever feeling thin.',
    top_notes: 'Blood Orange, Bergamot, Petitgrain',
    heart_notes: 'Green Cardamom, Neroli, Ginger Lily',
    base_notes: 'Amber, White Musk, Cedarwood',
    ingredients:
      'Sicilian blood orange · Guatemalan cardamom · Tunisian neroli · Virginian cedarwood · ' +
      'Amber accord · Ambrette seed',
    longevity: '6–8 hours', sillage: 'Bright, then intimate',
    concentration: '18% parfum extrait',
    hero_image: 'prod-2', gallery: ['prod-2', 'prod-2-b', 'ing-bergamot', 'ing-cardamom'],
    variants: [
      { size_ml: 50,  price_paise: 840000,  sku: 'CM-SOL-50',  stock: 41 },
      { size_ml: 100, price_paise: 1260000, sku: 'CM-SOL-100', stock: 22 },
    ],
  },
  {
    id: 'p_lune', slug: 'lune', name: 'Lune', subtitle: 'Eau de Parfum',
    family: 'Floral · Woody', accent: '#B08C86', featured: 1, sort_order: 3,
    tagline: 'For the hour after everyone has gone home.',
    story:
      'Damascena rose picked before dawn, when the oil content peaks and the flower still ' +
      'smells green. We pair it with sandalwood distilled from trees older than the house, ' +
      'because rose on its own says too much.',
    description:
      'Quiet, powdery, and warmer than it first appears. Rose and violet over creamy ' +
      'sandalwood and a soft musk that sits very close to the skin.',
    top_notes: 'Damask Rose, Violet Leaf, Bergamot',
    heart_notes: 'Rose Absolute, Iris, Peony',
    base_notes: 'Sandalwood, White Musk, Tonka Bean',
    ingredients:
      'Bulgarian rose absolute · Mysore-style sandalwood · Florentine iris butter · ' +
      'Tonka bean absolute · Ambrette musk',
    longevity: '7–9 hours', sillage: 'Soft — close to the skin',
    concentration: '20% parfum extrait',
    hero_image: 'prod-3', gallery: ['prod-3', 'prod-3-b', 'ing-rose', 'ing-sandalwood'],
    variants: [
      { size_ml: 50,  price_paise: 870000,  sku: 'CM-LUN-50',  stock: 27 },
      { size_ml: 100, price_paise: 1310000, sku: 'CM-LUN-100', stock: 12 },
    ],
  },
  {
    id: 'p_noctis', slug: 'noctis', name: 'Noctis', subtitle: 'Extrait de Parfum',
    family: 'Oud · Leather', accent: '#8E6A45', featured: 0, sort_order: 4,
    tagline: 'The darkest thing in the house.',
    story:
      'Three years of failed trials. Oud is difficult — push it and the whole composition ' +
      'turns medicinal. We ended up building everything else first and adding the oud last, ' +
      'drop by drop, until it stopped smelling like oud and started smelling like weather.',
    description:
      'Smoke, leather and resin. Incense over a spine of Laotian oud, finished with ' +
      'birch tar and a dry, mineral amber. Our most concentrated formulation.',
    top_notes: 'Incense, Black Pepper, Elemi',
    heart_notes: 'Laotian Oud, Leather, Dried Plum',
    base_notes: 'Birch Tar, Labdanum, Mineral Amber',
    ingredients:
      'Laotian oud oil · Somalian frankincense · Birch tar · Cistus labdanum · ' +
      'Atlas cedar · Castoreum accord',
    longevity: '10–12 hours', sillage: 'Strong — it enters the room first',
    concentration: '28% parfum extrait',
    hero_image: 'prod-4', gallery: ['prod-4', 'ing-oud', 'smoke', 'ing-sandalwood'],
    variants: [
      { size_ml: 50,  price_paise: 960000,  sku: 'CM-NOC-50',  stock: 15 },
      { size_ml: 100, price_paise: 1440000, sku: 'CM-NOC-100', stock: 7 },
    ],
  },
  {
    id: 'p_aurea', slug: 'aurea', name: 'Aurea', subtitle: 'Eau de Parfum',
    family: 'Honey · Tobacco', accent: '#C2913F', featured: 0, sort_order: 5,
    tagline: 'Sweet, but not kind.',
    story:
      'Honey is the hardest note to use well — a gram too much and the whole thing ' +
      'collapses into dessert. Aurea holds it in tension against cured tobacco leaf ' +
      'and a bitter saffron top, so the sweetness never quite arrives.',
    description:
      'Saffron and honey over cured tobacco and tonka. Rich and slightly animalic, ' +
      'with a dry finish that keeps it from ever reading as gourmand.',
    top_notes: 'Saffron, Honey Absolute, Osmanthus',
    heart_notes: 'Tobacco Leaf, Immortelle, Hay',
    base_notes: 'Tonka Bean, Benzoin, Sandalwood',
    ingredients:
      'Kashmiri saffron · Provençal honey absolute · Cured Virginia tobacco · ' +
      'Corsican immortelle · Siam benzoin',
    longevity: '9–11 hours', sillage: 'Warm and carrying',
    concentration: '21% parfum extrait',
    hero_image: 'prod-5', gallery: ['prod-5', 'ing-saffron', 'testimonial', 'texture-band'],
    variants: [
      { size_ml: 50,  price_paise: 790000,  sku: 'CM-AUR-50',  stock: 38 },
      { size_ml: 100, price_paise: 1190000, sku: 'CM-AUR-100', stock: 20 },
    ],
  },
  {
    id: 'p_vesper', slug: 'vesper', name: 'Vesper', subtitle: 'Eau de Parfum',
    family: 'Smoke · Mineral', accent: '#8A8F8C', featured: 0, sort_order: 6,
    tagline: 'Cold air, and something burning far away.',
    story:
      'The only fragrance we make that isn\'t warm. Vetiver distilled from Haitian roots, ' +
      'vetted against a mineral accord built to smell like wet slate. It took eleven ' +
      'attempts to stop it smelling like a cellar.',
    description:
      'Grey, dry and architectural. Smoked vetiver and ambergris over a cool mineral base, ' +
      'with just enough incense to keep it from going flat.',
    top_notes: 'Juniper, Grapefruit Peel, Pink Pepper',
    heart_notes: 'Smoked Vetiver, Incense, Wet Slate',
    base_notes: 'Ambergris, Cashmere Wood, Grey Musk',
    ingredients:
      'Haitian vetiver · Ambergris accord · Somalian frankincense · Mineral accord · ' +
      'Cashmeran · Juniper berry',
    longevity: '8–10 hours', sillage: 'Cool and precise',
    concentration: '19% parfum extrait',
    hero_image: 'prod-6', gallery: ['prod-6', 'smoke', 'cta', 'ing-oud'],
    variants: [
      { size_ml: 50,  price_paise: 920000,  sku: 'CM-VES-50',  stock: 24 },
      { size_ml: 100, price_paise: 1380000, sku: 'CM-VES-100', stock: 11 },
    ],
  },
];

function seed({ force = false } = {}) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (count > 0 && !force) return { seeded: false, products: count };

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM variants').run();
    db.prepare('DELETE FROM products').run();

    const insP = db.prepare(`INSERT INTO products
      (id,slug,name,subtitle,family,tagline,story,description,top_notes,heart_notes,base_notes,
       ingredients,longevity,sillage,concentration,hero_image,gallery,accent,featured,sort_order)
      VALUES (@id,@slug,@name,@subtitle,@family,@tagline,@story,@description,@top_notes,@heart_notes,
       @base_notes,@ingredients,@longevity,@sillage,@concentration,@hero_image,@gallery,@accent,
       @featured,@sort_order)`);
    const insV = db.prepare(`INSERT INTO variants (id,product_id,size_ml,price_paise,sku,stock)
      VALUES (?,?,?,?,?,?)`);

    for (const p of PRODUCTS) {
      insP.run({ ...p, gallery: JSON.stringify(p.gallery) });
      for (const v of p.variants) {
        insV.run(`${p.id}_${v.size_ml}`, p.id, v.size_ml, v.price_paise, v.sku, v.stock);
      }
    }
  });
  tx();
  return { seeded: true, products: PRODUCTS.length };
}

module.exports = { seed, PRODUCTS };

if (require.main === module) {
  const r = seed({ force: process.argv.includes('--force') });
  console.log('seed:', r);
}
