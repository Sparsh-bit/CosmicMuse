// Mirrors server/pricing.js exactly (CommonJS -> ESM for the Workers runtime).
/** All money is handled as integer paise. ₹1 = 100 paise. */

const GIFT_WRAP_PAISE     = 35000;    // ₹350
const SHIPPING_PAISE      = 25000;    // ₹250
const FREE_SHIP_THRESHOLD = 1000000;  // ₹10,000
const GST_RATE            = 0.18;     // 18%

export function totals(lines, { giftWrap = false } = {}) {
  const subtotal = lines.reduce((s, l) => s + l.unit_paise * l.qty, 0);
  const gift     = giftWrap ? GIFT_WRAP_PAISE : 0;
  const shipping = subtotal === 0 ? 0 : (subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_PAISE);
  const tax      = Math.round((subtotal + gift) * GST_RATE);
  return {
    subtotal_paise: subtotal,
    gift_paise: gift,
    shipping_paise: shipping,
    tax_paise: tax,
    total_paise: subtotal + gift + shipping + tax,
    free_shipping: shipping === 0 && subtotal > 0,
    free_ship_threshold_paise: FREE_SHIP_THRESHOLD,
    remaining_for_free_ship_paise: Math.max(0, FREE_SHIP_THRESHOLD - subtotal),
  };
}

export { GIFT_WRAP_PAISE, SHIPPING_PAISE, FREE_SHIP_THRESHOLD, GST_RATE };
