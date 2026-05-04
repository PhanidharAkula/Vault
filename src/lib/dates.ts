import { differenceInDays, differenceInMonths, format, parseISO } from 'date-fns'

export const fmtDate = (iso: string, pattern = 'd MMM yyyy'): string => {
  if (!iso) return ''
  return format(parseISO(iso), pattern)
}

export const fmtDateShort = (iso: string): string => fmtDate(iso, "MMM ''yy")
export const fmtDateLong = (iso: string): string => fmtDate(iso, 'd MMMM yyyy')

export const daysBetween = (a: string, b: string): number =>
  differenceInDays(parseISO(b), parseISO(a))

export const monthsBetween = (a: string, b: string): number =>
  differenceInMonths(parseISO(b), parseISO(a))

export const formatRelative = (iso: string, todayIso: string): string => {
  const days = daysBetween(todayIso, iso)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0 && days < 30) return `in ${days} days`
  if (days < 0 && days > -30) return `${Math.abs(days)} days ago`
  const months = Math.round(days / 30)
  if (months > 0) return `in ${months} month${months > 1 ? 's' : ''}`
  return `${Math.abs(months)} month${Math.abs(months) > 1 ? 's' : ''} ago`
}

export const tenureToYM = (months: number): string => {
  const y = Math.floor(months / 12)
  const m = Math.round(months % 12)
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y}y ${m}m`
}
