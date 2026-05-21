import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { todayInZone } from '../lib/timezone'

// Two separate contexts so consumers don't re-render every second when they
// only care about the calendar date (which only changes at midnight IST, the
// bank's processing boundary — see `lib/timezone.ts`).
//
// - useTodayIso()  → string   — re-renders only when the day rolls over
// - useNow()       → Date     — re-renders every second (for clocks/tickers)

type TodayValue = { todayIso: string }
type NowValue = { now: Date }

const TodayCtx = createContext<TodayValue | null>(null)
const NowCtx = createContext<NowValue | null>(null)

export const TodayProvider = ({ children }: { children: ReactNode }) => {
  const [now, setNow] = useState(() => new Date())
  const [todayIso, setTodayIso] = useState<string>(() => todayInZone())

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date()
      setNow(next)
      const iso = todayInZone(undefined, next)
      // Only flip todayIso when the calendar actually changes — keeps the
      // reference stable for everything that doesn't care about the wall clock.
      setTodayIso((prev) => (prev === iso ? prev : iso))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Memoize each context's value separately. NowCtx changes every second,
  // TodayCtx only changes when `todayIso` changes (i.e. once per day).
  const todayValue = useMemo<TodayValue>(() => ({ todayIso }), [todayIso])
  const nowValue = useMemo<NowValue>(() => ({ now }), [now])

  return (
    <TodayCtx.Provider value={todayValue}>
      <NowCtx.Provider value={nowValue}>{children}</NowCtx.Provider>
    </TodayCtx.Provider>
  )
}

// Subscribes only to the date — does NOT re-render every second.
export const useTodayIso = (): string => {
  const t = useContext(TodayCtx)
  if (!t) throw new Error('useTodayIso outside TodayProvider')
  return t.todayIso
}

// Subscribes to the wall-clock — re-renders every second.
export const useNow = (): Date => {
  const n = useContext(NowCtx)
  if (!n) throw new Error('useNow outside TodayProvider')
  return n.now
}
