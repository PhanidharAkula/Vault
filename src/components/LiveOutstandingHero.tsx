import { useEffect, useMemo, useState } from 'react'
import { useNow, useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import { computeAggregate } from '../lib/calculations'
import { DISBURSEMENTS, MASTER } from '../data/loanData'
import { formatINR, formatINRCompact, formatINRPrecise } from '../lib/format'
import { fmtDateLong, monthsBetween, tenureToYM } from '../lib/dates'
import { clockInZone } from '../lib/timezone'
import { Odometer } from './ui/Odometer'
import { Gauge } from './ui/Gauge'
import { Guilloche } from './ui/decor'
import { Ticks } from './ui/Plate'

const GAUGE_SIZE = 268
const ROSETTE_SIZE = 322
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

// Winds the odometer from zero to the live value in a handful of discrete
// steps (not per-frame - each step lets the digit wheels complete a roll).
const useWindUp = (steps = 10, interval = 110): number => {
  const [t, setT] = useState(0)
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i++
      setT(easeOut(i / steps))
      if (i >= steps) clearInterval(id)
    }, interval)
    return () => clearInterval(id)
  }, [steps, interval])
  return t
}

export const LiveOutstandingHero = () => {
  const todayIso = useTodayIso()
  const now = useNow()
  const { currency, rate } = useCurrency()
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  // The honest now-number: today's outstanding plus the fraction of today's
  // interest that has accrued since local midnight. The paise wheels roll
  // because this really is growing every second.
  const clock = clockInZone(undefined, now)
  const dayFrac = (clock.hour * 3600 + clock.minute * 60 + clock.second) / 86400
  const liveOutstanding = agg.totalCurrentOutstanding + agg.totalDailyInterest * dayFrac

  const windT = useWindUp()
  const displayed = liveOutstanding * windT

  const perSec = agg.totalDailyInterest / 86400
  const perSecLabel =
    currency === 'USD' ? `$${(perSec / rate).toFixed(6)}` : `₹${perSec.toFixed(4)}`

  const utilizationPct = (agg.totalCurrentOutstanding / agg.totalDisbursed) * 100
  const growthPct = utilizationPct - 100 // positive when outstanding > disbursed

  // Tenure progress - earliest disbursement to master final maturity.
  const startIso = DISBURSEMENTS.reduce(
    (a, d) => (d.disbursedDate < a ? d.disbursedDate : a),
    DISBURSEMENTS[0].disbursedDate,
  )
  const monthsElapsed = Math.max(0, monthsBetween(startIso, todayIso))
  const monthsTotal = Math.max(1, monthsBetween(startIso, MASTER.finalMaturity))
  const tenurePct = Math.min(100, (monthsElapsed / monthsTotal) * 100)

  return (
    <div className="plate relative overflow-hidden p-5 md:p-7">
      <Ticks />

      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.55fr_1fr]">
        {/* ── the counter ── */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="etch flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-vermillion blink" />
              Outstanding - live accrual
            </div>
            <div className="hidden text-[10px] tracking-[0.12em] text-ink-muted sm:block">
              № {MASTER.applicationNumber} · master
            </div>
          </div>

          <div className="mt-4 overflow-x-clip">
            <Odometer
              value={displayed}
              format={formatINRPrecise}
              className="text-[clamp(30px,7.2vw,58px)] font-medium tabular tracking-tight text-ink-primary"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 text-[11px] text-ink-tertiary">
            <span>
              <span className="font-semibold tabular text-vermillion">
                +{formatINR(agg.totalDailyInterest)}
              </span>{' '}
              / day
            </span>
            <span>
              <span className="font-semibold tabular text-vermillion">
                +{formatINRCompact(agg.totalDailyInterest * 30)}
              </span>{' '}
              / month
            </span>
            <span>
              <span className="font-semibold tabular text-gold">{perSecLabel}</span> / second
            </span>
            <span className="text-ink-muted">{fmtDateLong(todayIso)}</span>
          </div>

          {/* Contextual cells - hidden on mobile so the counter leads. */}
          <div className="mt-7 hidden gap-3 sm:flex sm:flex-wrap">
            <HeroCell
              label="Net growth since disbursement"
              value={formatINRCompact(agg.totalCurrentOutstanding - agg.totalDisbursed)}
              caption={`${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% above the ${formatINRCompact(agg.totalDisbursed)} principal`}
              tone="text-vermillion"
            />
            <HeroCell
              label="Tenure complete"
              value={`${tenurePct.toFixed(1)}%`}
              caption={`${tenureToYM(monthsElapsed)} in · ${tenureToYM(monthsTotal - monthsElapsed)} to go`}
              tone="text-gold"
            />
          </div>
        </div>

        {/* ── the dial ── */}
        <div className="grid place-items-center py-2">
          <div className="relative">
            {/* Rosette watermark, concentric with the needle pivot. The pivot
                sits at exactly (size/2, size/2) of the gauge box - CY is 50 in
                a 0..86 viewBox, so size·0.86·(50/86) = size/2. A radial mask
                fades the rings out so the plate edge can never clip a hard
                circle on short layouts. */}
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                left: '50%',
                top: GAUGE_SIZE / 2,
                transform: 'translate(-50%, -50%)',
                maskImage:
                  'radial-gradient(closest-side, black 25%, rgba(0,0,0,0.4) 55%, transparent 76%)',
                WebkitMaskImage:
                  'radial-gradient(closest-side, black 25%, rgba(0,0,0,0.4) 55%, transparent 76%)',
              }}
            >
              <Guilloche size={ROSETTE_SIZE} petals={20} opacity={0.32} />
            </div>
            <Gauge
              value={growthPct}
              min={0}
              max={30}
              format={(v) => `+${v.toFixed(1)}%`}
              accent="rgb(var(--c-vermillion))"
              label="growth vs principal"
              sublabel={`+${formatINRCompact(agg.totalAccruedToday)} since last rest`}
              size={GAUGE_SIZE}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const HeroCell = ({
  label,
  value,
  caption,
  tone,
}: {
  label: string
  value: string
  caption: string
  tone: string
}) => (
  <div className="border border-line bg-bg-base px-3.5 py-3">
    <div className="etch whitespace-nowrap !text-[9px]">{label}</div>
    <div className={`display-num mt-1.5 font-display text-lg font-medium leading-none ${tone}`}>
      {value}
    </div>
    <div className="mt-1 text-[10px] text-ink-tertiary">{caption}</div>
  </div>
)
