import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarClock, TrendingUp, Zap } from 'lucide-react'
import { useTodayIso } from '../state/today'
import { computeAggregate } from '../lib/calculations'
import { DISBURSEMENTS, MASTER } from '../data/loanData'
import { formatINR, formatINRCompact } from '../lib/format'
import { fmtDateLong, monthsBetween, tenureToYM } from '../lib/dates'
import { useCountUp } from '../lib/useCountUp'

export const LiveOutstandingHero = () => {
  const todayIso = useTodayIso()
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  // Today's outstanding - recomputed once per day (no per-second tick)
  const outstanding = Math.round(agg.totalCurrentOutstanding)

  // Count up from 0 → outstanding on mount (and from previous → new on day rollover).
  // Driven by `useCountUp` (defined at the bottom of this file), which uses plain
  // requestAnimationFrame so it isn't suppressed by the page-level
  // `<AnimatePresence initial={false}>` the way framer-motion variants are.
  const animatedOutstanding = useCountUp(outstanding, 1700)

  const utilizationPct = (agg.totalCurrentOutstanding / agg.totalDisbursed) * 100
  const growthPct = utilizationPct - 100 // positive when outstanding > disbursed

  // Tenure progress - measured from the earliest disbursement date to the
  // master final maturity. Gives a single "how far through the loan are we"
  // number that pairs nicely with Net growth (money) as a second axis (time).
  const startIso = DISBURSEMENTS.reduce(
    (a, d) => (d.disbursedDate < a ? d.disbursedDate : a),
    DISBURSEMENTS[0].disbursedDate,
  )
  const monthsElapsed = Math.max(0, monthsBetween(startIso, todayIso))
  const monthsTotal = Math.max(1, monthsBetween(startIso, MASTER.finalMaturity))
  const tenurePct = Math.min(100, (monthsElapsed / monthsTotal) * 100)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-bg-elevated/80 via-bg-surface/60 to-bg-base/30 p-5 shadow-glow md:p-7">
      {/* Soft radial washes - fade to transparent before reaching the card edges,
          so there are no clipped-circle hard arcs at the corners. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_100%_0%,rgba(99,102,241,0.32),rgba(99,102,241,0)_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_65%_at_0%_100%,rgba(167,139,250,0.24),rgba(167,139,250,0)_60%)]"
      />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-emerald" />
            Today's outstanding · refreshed daily
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-[40px] font-semibold leading-none tracking-tight tabular gradient-text-brand sm:text-[52px] md:text-[64px]">
              {formatINR(Math.round(animatedOutstanding))}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-secondary">
            <div className="inline-flex items-center gap-1.5">
              <TrendingUp size={14} className="text-accent-rose" />
              <span>
                +{formatINRCompact(agg.totalDailyInterest)}{' '}
                <span className="text-ink-tertiary">/ day · interest</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Zap size={14} className="text-accent-amber" />
              <span>
                +{formatINRCompact(agg.totalDailyInterest * 30)}{' '}
                <span className="text-ink-tertiary">/ month · interest</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-ink-tertiary">
              <CalendarClock size={13} className="text-accent-emerald" />
              <span>{fmtDateLong(todayIso)}</span>
            </div>
          </div>

          {/* Contextual tiles - both unique to the hero (not in the KPI strip
              below). The entire row is hidden on mobile so the hero's big
              number and rate stats lead; both tiles surface from sm+ where
              there's horizontal room for them. */}
          <div className="mt-6 hidden flex-wrap gap-3 sm:flex">
            <Tile
              label="Net growth since disbursement"
              value={formatINRCompact(agg.totalCurrentOutstanding - agg.totalDisbursed)}
              caption={`${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% above the ${formatINRCompact(agg.totalDisbursed)} principal`}
            />
            <Tile
              label="Tenure complete"
              value={`${tenurePct.toFixed(1)}%`}
              caption={`${tenureToYM(monthsElapsed)} in · ${tenureToYM(monthsTotal - monthsElapsed)} to go`}
            />
          </div>
        </div>

        {/* Progress ring with proper layout */}
        <div className="relative grid place-items-center">
          <ProgressRing growthPct={growthPct} accruedSinceBaseline={agg.totalAccruedToday} />
        </div>
      </div>
    </div>
  )
}

const Tile = ({ label, value, caption }: { label: string; value: string; caption: string }) => (
  <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-bg-elevated/40 px-3 py-3">
    <div className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.12em] text-ink-tertiary">
      {label}
    </div>
    <div className="mt-1 font-display text-lg font-semibold tabular">{value}</div>
    <div className="text-[10px] text-ink-muted">{caption}</div>
  </div>
)

const ProgressRing = ({
  growthPct,
  accruedSinceBaseline,
}: {
  growthPct: number
  accruedSinceBaseline: number
}) => {
  const SIZE = 256
  const r = 106
  const stroke = 12
  const c = 2 * Math.PI * r
  // Visualization scale: 0% growth = empty, 30% growth = full ring
  const visPct = Math.min(100, Math.max(0, (growthPct / 30) * 100))
  const offset = c - (visPct / 100) * c
  const cx = SIZE / 2
  const cy = SIZE / 2

  // Single mount-time flag drives every entrance animation in the ring.
  // We start `drawn=false` (arc hidden, text faded down), then flip to true
  // after two animation frames so the browser commits the initial paint first.
  // CSS transitions on each element interpolate to the final state.
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setDrawn(true))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [])

  // Count up from 0 → growthPct, kicked off when `drawn` flips to true.
  const animatedPct = useCountUp(drawn ? growthPct : 0, 1500)

  // Easing for staggered text reveals
  const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)'

  return (
    // Outer wrapper scales the SVG via CSS at <md so the ring fits on mobile
    // without changing any of the math (cx, cy, r) - viewBox handles scaling.
    <div className="relative h-[240px] w-[240px] md:h-[256px] md:w-[256px]">
      <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5b4fc" />
            <stop offset="0.5" stopColor="#c084fc" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        {/* track - CSS variable so it flips with the theme */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="var(--ring-track)"
          strokeWidth={stroke}
          fill="none"
        />

        {/* progress arc - draws once on mount (page refresh) via CSS transition */}
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="url(#ringG)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={drawn ? offset : c}
            style={{ transition: `stroke-dashoffset 1.6s ${easeOut}` }}
          />
        </g>
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          {/* eyebrow - fades in first */}
          <div
            className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary"
            style={{
              opacity: drawn ? 1 : 0,
              transform: drawn ? 'translateY(0)' : 'translateY(6px)',
              transition: `opacity 0.5s ${easeOut} 0.15s, transform 0.5s ${easeOut} 0.15s`,
            }}
          >
            growth
          </div>

          {/* count-up percentage - number ticks 0 → growthPct as the arc draws */}
          <div
            className="mt-0.5 font-display text-[32px] font-semibold leading-none tabular gradient-text-cyan md:text-[42px]"
            style={{
              opacity: drawn ? 1 : 0,
              transform: drawn ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.92)',
              transition: `opacity 0.6s ${easeOut} 0.2s, transform 0.7s ${easeOut} 0.2s`,
            }}
          >
            {animatedPct >= 0 ? '+' : ''}
            {animatedPct.toFixed(1)}%
          </div>

          {/* subtitle */}
          <div
            className="mt-1 text-[10px] text-ink-tertiary"
            style={{
              opacity: drawn ? 1 : 0,
              transform: drawn ? 'translateY(0)' : 'translateY(6px)',
              transition: `opacity 0.5s ${easeOut} 0.55s, transform 0.5s ${easeOut} 0.55s`,
            }}
          >
            vs disbursed
          </div>

          {/* amber pill */}
          <div
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-accent-amber/25 bg-accent-amber/10 px-2 py-0.5 text-[9px] text-accent-amber tabular"
            style={{
              opacity: drawn ? 1 : 0,
              transform: drawn ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.9)',
              transition: `opacity 0.6s ${easeOut} 0.8s, transform 0.6s ${easeOut} 0.8s`,
            }}
          >
            <ArrowUpRight size={9} />
            +{formatINRCompact(accruedSinceBaseline)} since rest
          </div>
        </div>
      </div>
    </div>
  )
}

