import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Plate, SectionTitle, Tag, InkSwatch } from '../components/ui/Plate'
import { Escapement } from '../components/ui/decor'
import { Odometer, RollingDigit } from '../components/ui/Odometer'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useNow, useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import type { AggregateStatus } from '../lib/calculations'
import { computeAggregate, computeLiveStatus } from '../lib/calculations'
import { DISBURSEMENTS, TRANCHE_VAR } from '../data/loanData'
import type { DisbursementView } from '../data/loanData'
import { formatINR, formatINRCompact, formatINRPrecise } from '../lib/format'
import { fmtDateLong } from '../lib/dates'
import { clockInZone, zoneMidnight } from '../lib/timezone'
import { differenceInSeconds } from 'date-fns'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

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

const Live = () => {
  const todayIso = useTodayIso()
  const now = useNow()
  useCurrency() // subscribe so currency toggle re-renders the ticker + accrual stats
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  const ratePerSec = agg.totalDailyInterest / 86400
  const clock = clockInZone(undefined, now)
  const secToday = clock.hour * 3600 + clock.minute * 60 + clock.second
  const liveOutstanding = agg.totalCurrentOutstanding + agg.totalDailyInterest * (secToday / 86400)
  const accruedToday = agg.totalDailyInterest * (secToday / 86400)

  const windT = useWindUp()

  return (
    <div className="space-y-6">
      <div className="section-enter section-enter-d0">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="gold">Plate 05</Tag>
          <Tag tone="vermillion">
            <span aria-hidden className="h-1 w-1 rounded-full bg-vermillion blink" />
            realtime
          </Tag>
        </div>
        <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-[36px]">
          The live desk<span className="text-vermillion">.</span>
        </h1>
        <p className="mt-1.5 text-xs text-ink-secondary">
          Interest never sleeps. The paise wheels below are turning right now - this is the meter
          running.
        </p>
      </div>

      {/* The meter */}
      <div className="section-enter section-enter-d1">
        <Plate pad="lg" className="!p-5 md:!p-7">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div className="min-w-0">
              <div className="etch flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-vermillion blink" />
                Outstanding · this very second
              </div>
              <div className="mt-4 overflow-x-clip">
                <Odometer
                  value={liveOutstanding * windT}
                  format={formatINRPrecise}
                  className="text-[clamp(32px,8vw,66px)] font-medium tabular tracking-tight text-ink-primary"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
                <RateCell label="per second" value={`+${formatINRPrecise(ratePerSec)}`} />
                <RateCell label="per minute" value={`+${formatINR(ratePerSec * 60)}`} />
                <RateCell label="per hour" value={`+${formatINR(ratePerSec * 3600)}`} />
                <RateCell label="per day" value={`+${formatINR(agg.totalDailyInterest)}`} />
              </div>

              <div className="mt-6">
                <div className="etch">Accrued since the last scheduled rest</div>
                <div className="display-num mt-1.5 font-display text-3xl font-medium tabular text-gold">
                  <AnimatedNumber value={Math.round(agg.totalAccruedToday)} format={formatINR} duration={900} />
                </div>
                <div className="mt-1 text-[10px] tracking-[0.06em] text-ink-tertiary">
                  {agg.perDisbursement[0]?.daysSinceBaseline ?? 0} days × {formatINR(agg.totalDailyInterest)} / day
                </div>
              </div>
            </div>

            {/* The escapement */}
            <div className="grid place-items-center self-center py-2">
              <div className="relative grid place-items-center">
                <Escapement size={186} />
              </div>
              <div className="mt-5 text-center">
                <div className="etch">Compounding</div>
                <div className="mt-1 font-display text-base italic text-ink-secondary">
                  day by day, every day
                </div>
                <div className="mt-2 text-[10px] tabular text-ink-tertiary">
                  +{formatINRPrecise(accruedToday)} so far today
                </div>
              </div>
            </div>
          </div>
        </Plate>
      </div>

      {/* Per-tranche meters */}
      <div className="section-enter section-enter-d2">
        <SectionTitle
          fig="01"
          eyebrow="Per tranche"
          title="Four engines, one debt"
          description="Each tranche carries its own daily-interest engine."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DISBURSEMENTS.map((d, i) => {
            const live = computeLiveStatus(d, todayIso)
            return <LiveTrancheCard key={d.applicationNumber} disbursement={d} live={live} index={i} />
          })}
        </div>
      </div>

      {/* Combined countdown */}
      <div className="section-enter section-enter-d3">
        <Plate pad="lg">
          <SectionTitle
            fig="02"
            eyebrow="Countdown"
            title="Next combined payment"
            description="All tranches share the same due date - one timer covers them all."
          />
          <CombinedCountdown agg={agg} />
        </Plate>
      </div>

      {/* Day meter */}
      <div className="section-enter section-enter-d4">
        <Plate pad="lg">
          <SectionTitle
            fig="03"
            eyebrow="Today's meter"
            title="The day, hour by hour"
            description="A graduated meter of today with the running cash accrual."
          />
          <DayMeter dailyInterest={agg.totalDailyInterest} />
        </Plate>
      </div>
    </div>
  )
}

const RateCell = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-bg-base px-3 py-2.5">
    <div className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">{label}</div>
    <div className="mt-1 text-[12px] font-semibold tabular text-vermillion">{value}</div>
  </div>
)

const LiveTrancheCard = ({
  disbursement,
  live,
  index,
}: {
  disbursement: DisbursementView
  live: ReturnType<typeof computeLiveStatus>
  index: number
}) => {
  const ratePerSec = live.dailyInterest / 86400
  const ink = TRANCHE_VAR[disbursement.color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="plate relative p-5"
    >
      <span aria-hidden className="absolute left-0 right-0 top-0 h-[2px]" style={{ background: ink }} />
      <div className="etch flex items-center gap-2">
        <InkSwatch color={ink} className="!h-1.5 !w-1.5" />
        {disbursement.shortName}
      </div>
      <div className="mt-1.5 text-[10px] tracking-[0.08em] text-ink-tertiary">
        № {disbursement.applicationNumber}
      </div>
      <div className="display-num mt-3 font-display text-[26px] font-medium leading-none tabular" style={{ color: ink }}>
        <AnimatedNumber value={Math.round(live.currentOutstanding)} format={formatINR} duration={1100} />
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-line border border-line bg-bg-base text-center">
        <Mini label="rate" value={`${live.rate.toFixed(2)}%`} />
        <Mini label="/min" value={`+₹${(ratePerSec * 60).toFixed(2)}`} />
        <Mini label="/day" value={`+${formatINRCompact(live.dailyInterest)}`} />
      </div>
      <div className="mt-3 text-[10px] leading-relaxed text-ink-tertiary">
        {live.daysSinceBaseline} day{live.daysSinceBaseline === 1 ? '' : 's'} since last rest →{' '}
        <span className="tabular text-ink-secondary">+{formatINRCompact(live.accruedSinceBaseline)}</span>{' '}
        accrued.
      </div>
    </motion.div>
  )
}

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="px-1.5 py-2">
    <div className="text-[8px] uppercase tracking-[0.16em] text-ink-tertiary">{label}</div>
    <div className="mt-0.5 text-[10px] font-semibold tabular text-ink-primary">{value}</div>
  </div>
)

const CombinedCountdown = ({ agg }: { agg: AggregateStatus }) => {
  const now = useNow() // re-renders every second

  if (!agg.nextDueDate) {
    return (
      <div className="text-xs text-ink-tertiary">No upcoming payments. Every tranche is fully settled.</div>
    )
  }

  // Countdown is to local midnight on the due date.
  const dueDate = zoneMidnight(agg.nextDueDate)
  const totalSec = Math.max(0, differenceInSeconds(dueDate, now))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="etch">Due {fmtDateLong(agg.nextDueDate)}</div>
        <div className="display-num font-display text-[40px] font-medium leading-none tabular text-gold">
          {formatINR(agg.nextDueTotal)}
        </div>
        <div className="text-[11px] text-ink-secondary">
          Combined total across {agg.nextDueRows.length} tranche
          {agg.nextDueRows.length === 1 ? '' : 's'}
        </div>

        <div className="mt-2 space-y-1.5 border-t border-line pt-3">
          {agg.nextDueRows.map((row) => (
            <div key={row.disbursement.applicationNumber} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2">
                <InkSwatch color={TRANCHE_VAR[row.disbursement.color]} className="!h-1.5 !w-1.5" />
                <span className="tracking-[0.06em] text-ink-secondary">{row.disbursement.applicationNumber}</span>
                <span className="text-ink-tertiary">· {row.disbursement.shortName}</span>
              </span>
              <span className="font-semibold tabular text-ink-primary">{formatINR(row.payment.paymentDue)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 self-center">
        <FlapCell n={days} label="days" />
        <FlapCell n={hours} label="hours" />
        <FlapCell n={minutes} label="mins" />
        <FlapCell n={seconds} label="secs" hot />
      </div>
    </div>
  )
}

/** Split-flap cell - two rolling wheels with the flap hinge across the middle. */
const FlapCell = ({ n, label, hot = false }: { n: number; label: string; hot?: boolean }) => {
  const [a, b] = String(Math.min(99, n)).padStart(2, '0').split('')
  return (
    <div className="relative border border-line bg-bg-base px-1 py-3 text-center">
      <div
        className={clsx(
          'relative mx-auto flex w-fit items-baseline text-[32px] font-semibold leading-none tabular md:text-[38px]',
          hot ? 'text-vermillion' : 'text-ink-primary',
        )}
      >
        <RollingDigit ch={a} direction="down" duration={380} />
        <RollingDigit ch={b} direction="down" duration={380} />
      </div>
      {/* flap hinge */}
      <span aria-hidden className="pointer-events-none absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-line" />
      <div className="mt-2 text-[8px] uppercase tracking-[0.2em] text-ink-tertiary">{label}</div>
    </div>
  )
}

const DayMeter = ({ dailyInterest }: { dailyInterest: number }) => {
  const now = useNow()
  // Day-elapsed is local-timezone based - the meter fills from the viewer's
  // local midnight to the next.
  const c = clockInZone(undefined, now)
  const elapsedSec = c.hour * 3600 + c.minute * 60 + c.second
  const pct = (elapsedSec / 86400) * 100
  const accrued = (dailyInterest * elapsedSec) / 86400

  return (
    <div>
      {/* graduated meter - hour ticks, fill, needle */}
      <div className="relative h-10 border border-line bg-bg-base">
        <div
          className="absolute bottom-0 left-0 top-0 bg-gold/15"
          style={{ width: `${pct}%`, transition: 'width 1s linear' }}
        />
        {Array.from({ length: 25 }).map((_, h) => {
          const major = h % 6 === 0
          return (
            <span
              key={h}
              aria-hidden
              className={clsx('absolute bottom-0 w-px', major ? 'bg-line-strong' : 'bg-line')}
              style={{ left: `${(h / 24) * 100}%`, height: major ? '100%' : '38%' }}
            />
          )
        })}
        <span
          aria-hidden
          className="absolute bottom-0 top-0 w-[2px] bg-vermillion"
          style={{ left: `${pct}%`, transition: 'left 1s linear' }}
        />
        {/* hour figures */}
        {[0, 6, 12, 18, 24].map((h) => (
          <span
            key={h}
            className="absolute top-full mt-1 -translate-x-1/2 text-[8px] tabular tracking-[0.12em] text-ink-muted"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MeterBlock label="Elapsed today" value={`${c.hour} h ${c.minute} m`} hint={`${pct.toFixed(1)}% of today`} />
        <MeterBlock
          label="Accrued today"
          value={formatINRPrecise(accrued)}
          hint={`of ${formatINR(dailyInterest)} daily`}
          hot
        />
        <MeterBlock
          label="Remaining today"
          value={formatINR(Math.max(0, dailyInterest - accrued))}
          hint={`${23 - c.hour} h ${60 - c.minute} m left`}
        />
      </div>
    </div>
  )
}

const MeterBlock = ({
  label,
  value,
  hint,
  hot = false,
}: {
  label: string
  value: string
  hint: string
  hot?: boolean
}) => (
  <div className="border border-line bg-bg-base p-3.5">
    <div className="etch !text-[9px]">{label}</div>
    <div className={clsx('mt-1.5 text-base font-semibold tabular', hot ? 'text-vermillion' : 'text-ink-primary')}>
      {value}
    </div>
    <div className="mt-0.5 text-[10px] text-ink-tertiary">{hint}</div>
  </div>
)

export default Live
