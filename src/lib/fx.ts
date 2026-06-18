// Shared FX constants so the live app (state/currency) and the build-time
// social-card generator (scripts/generate-og.ts) read the same endpoint and
// fallback rate, and can never silently drift apart.

// Free, no-auth, CORS-enabled FX endpoint. Returns `{ rates: { INR: <number>, ... } }`.
// Docs: https://www.exchangerate-api.com/docs/free
export const FX_ENDPOINT = 'https://open.er-api.com/v6/latest/USD'

// Used until the live rate lands (~200ms after first paint), or if the API is
// unreachable. Tuned close to the recent USD/INR figure so any flicker is tiny.
export const FALLBACK_INR_PER_USD = 96
