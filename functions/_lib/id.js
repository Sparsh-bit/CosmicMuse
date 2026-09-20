// Web Crypto is what's available in the Workers runtime — no Node `crypto` module.

export function hex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const newId = (prefix) => `${prefix}_${hex(9)}`;

// Uniform integer in [min, max], matching Node's crypto.randomInt(min, max).
export function randomInt(min, max) {
  const range = max - min;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return min + (arr[0] % range);
}
