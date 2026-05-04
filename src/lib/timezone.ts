// All "today" calculations across the dashboard are anchored to America/New_York (ET).
// The day rolls over at midnight ET regardless of where the browser is running.
const APP_TZ = 'America/New_York'

const partsOf = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
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

// Returns YYYY-MM-DD calendar date in the given timezone for a given Date.
export const todayInZone = (tz: string = APP_TZ, d: Date = new Date()): string => {
  const p = partsOf(d, tz)
  return `${p.year}-${p.month}-${p.day}`
}

// Returns local hour/minute/second components in the given timezone.
export const clockInZone = (
  tz: string = APP_TZ,
  d: Date = new Date(),
): { hour: number; minute: number; second: number } => {
  const p = partsOf(d, tz)
  const hour = p.hour === '24' ? 0 : Number(p.hour)
  return { hour, minute: Number(p.minute), second: Number(p.second) }
}

// Returns the offset (UTC - tz) in milliseconds at the given moment.
// e.g. for NY in EDT this returns +4h (14_400_000); in EST it returns +5h (18_000_000).
const offsetMs = (tz: string, d: Date): number => {
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
export const zoneMidnight = (yyyy_mm_dd: string, tz: string = APP_TZ): Date => {
  const probe = new Date(yyyy_mm_dd + 'T00:00:00Z')
  const off = offsetMs(tz, probe)
  return new Date(probe.getTime() + off)
}

// Format clock time (HH:MM:SS) in the given timezone.
export const clockString = (tz: string = APP_TZ, d: Date = new Date()): string => {
  const c = clockInZone(tz, d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}`
}

// Short timezone label e.g. "EDT" or "EST"
export const zoneShortName = (tz: string = APP_TZ, d: Date = new Date()): string => {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? 'ET'
}
