/**
 * Preload hook — eagerly loads and patches baileys for CJS compatibility
 * BEFORE any builderbot module loads it.
 *
 * baileys 7.x is ESM-only, but @builderbot/provider-baileys uses
 * `require('baileys')` at module scope. Node.js returns the module
 * *namespace* (a non-callable object), causing
 * `TypeError: makeWASocketOther is not a function`.
 *
 * This preload eagerly requires baileys and replaces its cache entry with
 * the callable default export (with all named exports assigned onto it).
 * No hooks needed — just patch the cache before anything else loads baileys.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const baileysPath = require.resolve('baileys');

// Eagerly load and patch BEFORE any builderbot module requires it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ns = require(baileysPath);
const fn = ns.default;

if (typeof fn === 'function') {
  // Copy all named exports onto the callable default.
  Object.assign(fn, ns);
  // Replace the cache entry. All subsequent require('baileys') calls
  // (including the one at line 29 of @builderbot/provider-baileys)
  // will get the patched callable function.
  require.cache[baileysPath].exports = fn;
}
