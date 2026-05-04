// Currency / number formatting (INR with Indian comma grouping)

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export const formatINR = (n: number): string => `₹${inrFmt.format(Math.round(n))}`

export const formatINRCompact = (n: number): string => {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`
  return `₹${n.toFixed(0)}`
}

export const formatPercent = (n: number, decimals = 2): string => `${n.toFixed(decimals)}%`
