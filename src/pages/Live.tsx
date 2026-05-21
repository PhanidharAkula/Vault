import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, CalendarClock, Sparkles } from 'lucide-react'
import { GlassCard, Pill, SectionTitle } from '../components/ui/GlassCard'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useTodayIso } from '../state/today'
import type { AggregateStatus } from '../lib/calculations'
import { computeAggregate, computeLiveStatus } from '../lib/calculations'
import { DISBURSEMENTS } from '../data/loanData'
import { formatINR, formatINRCompact } from '../lib/format'
import { fmtDateLong } from '../lib/dates'
import { clockInZone, zoneMidnight, zoneShortName } from '../lib/timezone'
import { differenceInSeconds } from 'date-fns'

const Live = () => {
  const todayIso = useTodayIso()
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  const ratePerSec = agg.totalDailyInterest / 86400
  const todayOutstanding = Math.round(agg.totalCurrentOutstanding)
  const tzAbbrev = zoneShortName()

  return (
    <div className="space-y-6">
      <div>
        <Pill tone="emerald">Realtime</Pill>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">Live view</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Outstanding rolls forward each day at{' '}
          <span className="font-semibold text-ink-primary">midnight {tzAbbrev}</span> (New York).
          The accrual rates below show how fast it grows in the background.
        </p>
      </div>

      {/* Hero — daily integer */}
      <GlassCard pad="lg" className="!p-5 md:!p-7">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
              <Activity size={12} className="text-accent-emerald" />
              Today's outstanding
            </div>
            <div className="mt-3 font-display text-[44px] font-semibold leading-none tracking-tight tabular gradient-text-brand sm:text-[58px] md:text-[72px]">
              <AnimatedNumber value={todayOutstanding} format={formatINR} duration={1100} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-secondary">
              <Stat label="per minute" value={`+${formatINR(ratePerSec * 60)}`} />
              <Stat label="per hour" value={`+${formatINR(ratePerSec * 3600)}`} />
              <Stat label="per day" value={`+${formatINR(agg.totalDailyInterest)}`} />
              <Stat label="per month" value={`+${formatINRCompact(agg.totalDailyInterest * 30)}`} />
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
                <Sparkles size={12} className="text-accent-violet" /> Accrued since the last scheduled rest
              </div>
              <div className="mt-1 font-display text-3xl font-semibold tabular gradient-text-cyan">
                <AnimatedNumber value={Math.round(agg.totalAccruedToday)} format={formatINR} duration={900} />
              </div>
              <div className="mt-1 text-[11px] text-ink-tertiary">
                {agg.perDisbursement[0]?.daysSinceBaseline ?? 0} days × {formatINR(agg.totalDailyInterest)} / day
              </div>
            </div>
          </div>

          <PulseVisualizer />
        </div>
      </GlassCard>

      {/* Per-tranche live */}
      <div>
        <SectionTitle
          eyebrow="Per tranche"
          title="Real-time accrual"
          description="Each tranche carries its own daily-interest engine."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DISBURSEMENTS.map((d, i) => {
            const live = computeLiveStatus(d, todayIso)
            return (
              <LiveTrancheCard key={d.applicationNumber} disbursement={d} live={live} index={i} />
            )
          })}
        </div>
      </div>

      {/* Combined countdown — single tile since all tranches share the same due date */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Countdown"
          title="Next combined payment"
          description="All tranches share the same due date and time, one timer covers them all."
        />
        <CombinedCountdown agg={agg} />
      </GlassCard>

      {/* Daily heartbeat */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Heartbeat"
          title="Today's interest, hour by hour"
          description="A live progress bar of today, with running cash accrual."
        />
        <DayHeartbeat dailyInterest={agg.totalDailyInterest} />
      </GlassCard>
    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</span>
    <span className="font-medium tabular text-ink-primary">{value}</span>
  </div>
)

// Self-contained pulse: rings + center disc share a single relatively-positioned
// box so the absolute pulses can use inset-0 and stay perfectly centered.
// CSS keyframe animation runs immediately on render (no React state involvement).
const PulseVisualizer = () => {
  return (
    <div className="grid place-items-center self-center">
      <div className="relative h-44 w-44">
        <span
          aria-hidden
          className="pulse-ring absolute inset-0 rounded-full bg-accent-emerald/15"
        />
        <span
          aria-hidden
          className="pulse-ring absolute inset-0 rounded-full bg-accent-emerald/15"
          style={{ animationDelay: '0.8s' }}
        />
        <span
          aria-hidden
          className="pulse-ring absolute inset-0 rounded-full bg-accent-emerald/15"
          style={{ animationDelay: '1.6s' }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-accent-emerald to-accent-cyan shadow-glow-emerald">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-bg-base/80 ring-1 ring-white/10 backdrop-blur-md">
              <Activity className="text-accent-emerald" size={28} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">Compounding</div>
        <div className="mt-1 font-display text-base">Day by day, every day</div>
      </div>
    </div>
  )
}

const LiveTrancheCard = ({
  disbursement,
  live,
  index,
}: {
  disbursement: any
  live: any
  index: number
}) => {
  const ratePerSec = live.dailyInterest / 86400
  const COLORS = { violet: '#a78bfa', cyan: '#22d3ee', emerald: '#34d399', pink: '#f472b6' } as const
  const accent = COLORS[disbursement.color as keyof typeof COLORS]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="absolute left-0 top-0 h-[2px] w-full" style={{ background: accent }} />
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        {disbursement.shortName}
      </div>
      <div className="mt-2 font-mono text-xs text-ink-tertiary">{disbursement.applicationNumber}</div>
      <div className="mt-3 font-display text-3xl font-semibold tabular" style={{ color: accent }}>
        <AnimatedNumber value={Math.round(live.currentOutstanding)} format={formatINR} duration={1100} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-ink-tertiary">
        <Mini label="rate" value={`${live.rate.toFixed(2)}%`} />
        <Mini label="/min" value={`+₹${(ratePerSec * 60).toFixed(2)}`} />
        <Mini label="/day" value={`+${formatINRCompact(live.dailyInterest)}`} />
      </div>
      <div className="mt-3 text-[11px] text-ink-tertiary">
        {live.daysSinceBaseline} day{live.daysSinceBaseline === 1 ? '' : 's'} since last scheduled rest →{' '}
        <span className="text-ink-secondary tabular">+{formatINRCompact(live.accruedSinceBaseline)}</span> accrued.
      </div>
    </motion.div>
  )
}

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">{label}</div>
    <div className="mt-0.5 font-medium text-ink-primary tabular">{value}</div>
  </div>
)

const CombinedCountdown = ({ agg }: { agg: AggregateStatus }) => {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!agg.nextDueDate) {
    return (
      <div className="text-sm text-ink-tertiary">No upcoming payments. Every tranche is fully paid.</div>
    )
  }

  // Countdown is to midnight ET on the due date
  const dueDate = zoneMidnight(agg.nextDueDate)
  const totalSec = Math.max(0, differenceInSeconds(dueDate, new Date()))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
          <CalendarClock size={12} className="text-accent-emerald" />
          Due {fmtDateLong(agg.nextDueDate)}
        </div>
        <div className="font-display text-[44px] font-semibold leading-none tabular gradient-text-emerald">
          {formatINR(agg.nextDueTotal)}
        </div>
        <div className="text-sm text-ink-secondary">
          Combined total across {agg.nextDueRows.length} tranche
          {agg.nextDueRows.length === 1 ? '' : 's'}
        </div>

        <div className="mt-2 space-y-1.5 border-t border-white/[0.05] pt-3">
          {agg.nextDueRows.map((row) => {
            const COLORS = { violet: 'bg-accent-violet', cyan: 'bg-accent-cyan', emerald: 'bg-accent-emerald', pink: 'bg-accent-pink' } as const
            return (
              <div
                key={row.disbursement.applicationNumber}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${COLORS[row.disbursement.color as keyof typeof COLORS]}`} />
                  <span className="font-mono text-ink-secondary">
                    {row.disbursement.applicationNumber}
                  </span>
                  <span className="text-ink-tertiary">· {row.disbursement.shortName}</span>
                </span>
                <span className="font-medium tabular text-ink-primary">
                  {formatINR(row.payment.paymentDue)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 self-center">
        <Bit n={days} label="days" />
        <Bit n={hours} label="hours" />
        <Bit n={minutes} label="mins" />
        <Bit n={seconds} label="secs" />
      </div>
    </div>
  )
}

const Bit = ({ n, label }: { n: number; label: string }) => (
  <div className="rounded-xl border border-white/[0.06] bg-bg-elevated/40 px-2 py-3 text-center">
    <div className="font-display text-[34px] font-semibold leading-none tabular">
      {String(n).padStart(2, '0')}
    </div>
    <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</div>
  </div>
)

const DayHeartbeat = ({ dailyInterest }: { dailyInterest: number }) => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    // tick every 30s — accrual integer doesn't change much faster than that
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  // Use America/New_York clock for the day-elapsed calculation
  const c = clockInZone(undefined, now)
  const totalSecondsInDay = 86400
  const elapsedSec = c.hour * 3600 + c.minute * 60 + c.second
  const pct = (elapsedSec / totalSecondsInDay) * 100
  const accrued = (dailyInterest * elapsedSec) / totalSecondsInDay
  const elapsedHours = c.hour

  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-bg-elevated/70 ring-1 ring-white/5">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-emerald via-accent-cyan to-brand-300"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <Block label="Elapsed today" value={`${elapsedHours} h`} hint={`${pct.toFixed(1)}% of today`} />
        <Block label="Accrued today" value={formatINR(accrued)} hint={`of ${formatINR(dailyInterest)} daily`} />
        <Block
          label="Remaining today"
          value={formatINR(Math.max(0, dailyInterest - accrued))}
          hint={`${24 - elapsedHours} h left`}
        />
      </div>
    </div>
  )
}

const Block = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <div className="rounded-xl border border-white/[0.06] bg-bg-elevated/40 p-3">
    <div className="text-[11px] uppercase tracking-[0.12em] text-ink-tertiary">{label}</div>
    <div className="mt-1 font-display text-lg font-semibold tabular">{value}</div>
    <div className="text-[10px] text-ink-tertiary">{hint}</div>
  </div>
)

export default Live
