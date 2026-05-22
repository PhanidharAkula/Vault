// Every helper here works in the browser's local timezone by default. The
// dashboard's "today" rolls when the user's wall clock crosses midnight, and
// the countdown to the next payment is to midnight of the user's local zone.
//
// All helpers still accept an optional `tz` argument for advanced uses, but
// no caller in this app currently overrides it.

const partsOf = (d: Date, tz?: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz, // undefined => browser local zone
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value
      return acc
    }, {})

// Returns YYYY-MM-DD calendar date in the given timezone (default: local).
export const todayInZone = (tz?: string, d: Date = new Date()): string => {
  const p = partsOf(d, tz)
  return `${p.year}-${p.month}-${p.day}`
}

// Returns hour/minute/second components in the given timezone (default: local).
export const clockInZone = (
  tz?: string,
  d: Date = new Date(),
): { hour: number; minute: number; second: number } => {
  const p = partsOf(d, tz)
  const hour = p.hour === '24' ? 0 : Number(p.hour)
  return { hour, minute: Number(p.minute), second: Number(p.second) }
}

// Offset (UTC - tz) in milliseconds at the given moment.
const offsetMs = (tz: string | undefined, d: Date): number => {
  const p = partsOf(d, tz)
  const tzAsIfUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === '24' ? '00' : p.hour),
    Number(p.minute),
    Number(p.second),
  )
  return d.getTime() - tzAsIfUtc
}

// Returns a Date instant whose representation in `tz` is exactly "YYYY-MM-DD 00:00:00".
// Default tz = local, so the countdown to a due date is to midnight in the
// user's own timezone.
export const zoneMidnight = (yyyy_mm_dd: string, tz?: string): Date => {
  const probe = new Date(yyyy_mm_dd + 'T00:00:00Z')
  const off = offsetMs(tz, probe)
  return new Date(probe.getTime() + off)
}

// Format clock time (HH:MM:SS) in the given timezone (default: local).
export const clockString = (tz?: string, d: Date = new Date()): string => {
  const c = clockInZone(tz, d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}`
}

// Short timezone label e.g. "IST", "EDT", "PST" - defaults to the browser's
// local zone abbreviation.
export const zoneShortName = (tz?: string, d: Date = new Date()): string => {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? ''
}
