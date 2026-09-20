// Mirrors server/routes/checkout.js's pure logic exactly — simulated payment,
// no gateway, no real card data stored. See that file for the card-number table.
import { hex } from './id.js';

const TEST_CARDS = {
  '0000': { ok: false, code: 'card_declined',      message: 'Your card was declined by the issuer.' },
  '0341': { ok: false, code: 'insufficient_funds', message: 'Insufficient funds on this card.' },
  '0069': { ok: false, code: 'expired_card',       message: 'That card has been reported lost.' },
};

export function luhn(num) {
  const d = String(num).replace(/\D/g, '');
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

function brandOf(num) {
  const d = String(num).replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  if (/^60|^65|^81|^82/.test(d)) return 'RuPay';
  return 'Card';
}

export function authorize({ number, expiry, cvc, name } = {}) {
  const d = String(number || '').replace(/\D/g, '');
  if (!name || String(name).trim().length < 2)
    return { ok: false, code: 'invalid_name', message: 'Enter the name printed on the card.' };
  if (!luhn(d))
    return { ok: false, code: 'invalid_number', message: 'That card number is not valid.' };
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(String(expiry || '')))
    return { ok: false, code: 'invalid_expiry', message: 'Expiry must be in MM/YY format.' };

  const [mm, yy] = String(expiry).split('/').map((s) => parseInt(s.trim(), 10));
  if (mm < 1 || mm > 12)
    return { ok: false, code: 'invalid_expiry', message: 'That expiry month does not exist.' };
  const exp = new Date(2000 + yy, mm, 0, 23, 59, 59);
  if (exp < new Date())
    return { ok: false, code: 'expired_card', message: 'That card has expired.' };
  if (!/^\d{3,4}$/.test(String(cvc || '')))
    return { ok: false, code: 'invalid_cvc', message: 'Enter the 3 or 4 digit security code.' };

  const last4 = d.slice(-4);
  if (TEST_CARDS[last4]) return { ...TEST_CARDS[last4], last4, brand: brandOf(d) };
  return { ok: true, last4, brand: brandOf(d), ref: 'txn_' + hex(8) };
}

const REQUIRED = ['email', 'first_name', 'last_name', 'phone', 'address1', 'city', 'state', 'postcode'];

export function validateAddress(b = {}) {
  const errors = {};
  for (const f of REQUIRED) {
    if (!b[f] || !String(b[f]).trim()) errors[f] = 'Required';
  }
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(b.email)))
    errors.email = 'Enter a valid email address';
  if (b.phone && String(b.phone).replace(/\D/g, '').length < 10)
    errors.phone = 'Enter a valid phone number';
  if (b.postcode && !/^\d{6}$/.test(String(b.postcode).replace(/\s/g, '')))
    errors.postcode = 'Enter a 6-digit PIN code';
  return errors;
}

export function orderNumber() {
  const y = new Date().getFullYear();
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const n = 10000 + (arr[0] % 90000);
  return `CM-${y}-${n}`;
}
