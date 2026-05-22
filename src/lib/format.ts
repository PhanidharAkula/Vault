// Currency / number formatting.
//
// The dashboard's source of truth is INR (the loan was taken in India and every
// formula in `lib/calculations.ts` operates on INR amounts). These helpers are
// the display layer - they read the active currency and live FX rate from
// `state/currency` and convert to USD at the last possible moment, so accuracy
// is never affected by the toggle.
//
// The helpers keep their historical `formatINR*` names so the ~100 existing
// call sites don't need to change. Despite the name, they emit the active
// currency.

import { getActiveCurrency, getActiveRate } from '../state/currency'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
// USD: thousands separators, always two fraction digits so a row of small
// values reads as a coherent block (e.g. $25.36 / $1,250.00 / $94.00 - not a
// mix of $25 / $1,250 / $94).
const usdFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatINR = (inrAmount: number): string => {
  if (getActiveCurrency() === 'USD') {
    const usd = inrAmount / getActiveRate()
    return `$${usdFmt.format(usd)}`
  }
  return `₹${inrFmt.format(Math.round(inrAmount))}`
}

export const formatINRCompact = (inrAmount: number): string => {
  if (getActiveCurrency() === 'USD') {
    const usd = inrAmount / getActiveRate()
    const abs = Math.abs(usd)
    // Western compact suffixes: K (thousand), M (million), B (billion).
    // Two decimals on every magnitude so adjacent values share a rhythm.
    if (abs >= 1e9) return `$${(usd / 1e9).toFixed(2)} B`
    if (abs >= 1e6) return `$${(usd / 1e6).toFixed(2)} M`
    if (abs >= 1e3) return `$${(usd / 1e3).toFixed(2)} K`
    return `$${usd.toFixed(2)}`
  }
  // Indian compact suffixes: K (thousand), L (lakh = 1e5), Cr (crore = 1e7).
  const abs = Math.abs(inrAmount)
  if (abs >= 1e7) return `₹${(inrAmount / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(inrAmount / 1e5).toFixed(2)} L`
  if (abs >= 1e3) return `₹${(inrAmount / 1e3).toFixed(2)} K`
  return `₹${inrAmount.toFixed(0)}`
}

export const formatPercent = (n: number, decimals = 2): string => `${n.toFixed(decimals)}%`
