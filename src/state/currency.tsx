import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// All loan calculations live in INR (where the loan was taken). USD is purely a
// display preference — the formatINR / formatINRCompact helpers convert at the
// moment of rendering. That keeps the source of truth (and every formula) on
// the bank's own currency for accuracy.

export type Currency = 'INR' | 'USD'

// Fallback rate. Only shown for the ~200ms window between first paint and the
// live FX response, OR if the API call fails entirely. Tuned close to the
// recent USD↔INR figure so the first-paint flicker (when it happens) is tiny.
const FALLBACK_INR_PER_USD = 96

const STORAGE_KEY = 'vault.currency'

// Free, no-auth, CORS-enabled FX endpoint. Returns `{ rates: { INR: <number>, ... } }`.
// Docs: https://www.exchangerate-api.com/docs/free
const FX_ENDPOINT = 'https://open.er-api.com/v6/latest/USD'

type CurrencyCtx = {
  currency: Currency
  setCurrency: (c: Currency) => void
  toggle: () => void
  /** How many INR equal one USD. Updated when the live FX fetch settles. */
  rate: number
  /** Where the active rate came from (e.g. `'live · open.er-api.com'` or `'fallback'`). */
  rateSource: string
}

const Ctx = createContext<CurrencyCtx | null>(null)

// Module-level mirrors that the non-component `formatINR` helpers read from.
// React state stays the source of truth; these are kept in sync synchronously
// during each render so the very first paint after a toggle already shows the
// new currency (an effect-based mirror would lag one paint behind).
let activeCurrency: Currency = 'INR'
let activeRate: number = FALLBACK_INR_PER_USD
export const getActiveCurrency = (): Currency => activeCurrency
export const getActiveRate = (): number => activeRate

const readInitialCurrency = (): Currency => {
  if (typeof window === 'undefined') return 'INR'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'INR' || stored === 'USD') return stored
  } catch {
    /* ignore */
  }
  return 'INR'
}

const fetchLiveRate = async (): Promise<number | null> => {
  try {
    const res = await fetch(FX_ENDPOINT, { cache: 'no-cache' })
    if (!res.ok) return null
    const data = await res.json()
    const inr = data?.rates?.INR
    if (typeof inr === 'number' && inr > 0) return inr
  } catch {
    /* network failure — caller falls back to static rate */
  }
  return null
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(readInitialCurrency)
  const [rate, setRate] = useState<number>(FALLBACK_INR_PER_USD)
  const [rateSource, setRateSource] = useState<string>('fallback')

  // Keep the module-level mirrors aligned every render (not in useEffect — that
  // would lag one paint behind). React batches updates, so every consumer sees
  // the same `activeCurrency` / `activeRate` once a toggle commits.
  activeCurrency = currency
  activeRate = rate

  // Persist the currency choice on change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currency)
    } catch {
      /* ignore */
    }
  }, [currency])

  // Fetch the live FX rate on every mount (i.e. every page refresh). Runs as a
  // post-paint effect, so the page is interactive from t=0 with the fallback;
  // the fresh rate lands ~200ms later and replaces it. No caching — keeps the
  // logic simple and ensures users always see a rate ≤ a few seconds old.
  useEffect(() => {
    let cancelled = false
    fetchLiveRate().then((live) => {
      if (cancelled || live == null) return
      setRate(live)
      setRateSource('live · open.er-api.com')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<CurrencyCtx>(
    () => ({
      currency,
      setCurrency: setCurrencyState,
      toggle: () => setCurrencyState((c) => (c === 'INR' ? 'USD' : 'INR')),
      rate,
      rateSource,
    }),
    [currency, rate, rateSource],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCurrency = (): CurrencyCtx => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCurrency outside CurrencyProvider')
  return v
}
