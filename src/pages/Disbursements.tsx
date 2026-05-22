import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarRange,
  Coins,
  Flame,
  HandCoins,
  Hash,
  Layers,
  Percent,
  TrendingUp,
} from 'lucide-react'
import { GlassCard, Pill, SectionTitle } from '../components/ui/GlassCard'
import { StatCard } from '../components/ui/StatCard'
import { DISBURSEMENTS } from '../data/loanData'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import { computeLiveStatus } from '../lib/calculations'
import { SingleOutstandingChart } from '../components/charts/SingleOutstandingChart'
import { PaymentBreakdownChart } from '../components/charts/PaymentBreakdownChart'
import { PaymentScheduleTable } from '../components/PaymentScheduleTable'
import { RateTimeline } from '../components/charts/RateTimeline'
import { fmtDateLong, monthsBetween, tenureToYM } from '../lib/dates'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import clsx from 'clsx'

const ACCENT: Record<string, { text: string; bg: string; gradTo: string }> = {
  violet: { text: 'text-accent-violet', bg: 'bg-accent-violet', gradTo: 'to-accent-violet' },
  cyan: { text: 'text-accent-cyan', bg: 'bg-accent-cyan', gradTo: 'to-accent-cyan' },
  emerald: { text: 'text-accent-emerald', bg: 'bg-accent-emerald', gradTo: 'to-accent-emerald' },
  pink: { text: 'text-accent-pink', bg: 'bg-accent-pink', gradTo: 'to-accent-pink' },
}

const Disbursements = ({
  initialIndex,
  onConsumeInitial,
}: {
  initialIndex: number | null
  onConsumeInitial: () => void
}) => {
  const todayIso = useTodayIso()
  useCurrency() // subscribe so the currency toggle re-renders all money displays
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (initialIndex != null) {
      setActiveIdx(initialIndex)
      onConsumeInitial()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex])

  const d = DISBURSEMENTS[activeIdx]
  const live = useMemo(() => computeLiveStatus(d, todayIso), [d, todayIso])

  const monthsToFinal = monthsBetween(todayIso, d.finalDate)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Pill tone={d.color}>{d.shortName}</Pill>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="font-mono text-ink-secondary">{d.applicationNumber}</span>
            <span className="ml-3 text-ink-tertiary">·</span>{' '}
            <span className={clsx('gradient-text-brand')}>
              {formatINRCompact(d.disbursedAmount)}
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Disbursed {fmtDateLong(d.disbursedDate)} · matures {fmtDateLong(d.finalDate)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
            Active phase
          </div>
          <div className="font-display text-lg font-semibold">
            <span className={ACCENT[d.color].text}>{formatPercent(live.rate, 2)}</span>{' '}
            <span className="text-ink-tertiary">·</span>{' '}
            {live.isInEMIPhase ? 'EMI' : 'Pre-EMI'}
          </div>
          <div className="text-xs text-ink-tertiary">
            {live.paymentsCompleted}/{live.paymentsTotal} payments · {tenureToYM(monthsToFinal)} left
          </div>
        </div>
      </div>

      {/* Tabs - stack vertically on mobile so each tranche row stays full-width */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-bg-elevated/40 p-1.5 sm:flex-row sm:flex-wrap sm:items-center">
        {DISBURSEMENTS.map((item, i) => {
          const active = activeIdx === i
          return (
            <button
              key={item.applicationNumber}
              onClick={() => setActiveIdx(i)}
              className={clsx(
                'relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition sm:flex-1',
                active ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {active && (
                <motion.div
                  layoutId="trancheActive"
                  className="absolute inset-0 -z-0 rounded-xl bg-white/[0.05] ring-1 ring-white/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={clsx('relative z-10 h-2 w-2 rounded-full', ACCENT[item.color].bg)} />
              <span className="relative z-10 flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">
                  {item.shortName}
                </span>
                <span className="font-mono text-[12px]">{item.applicationNumber}</span>
              </span>
              <span className="relative z-10 ml-auto font-display text-sm font-semibold tabular">
                {formatINRCompact(item.disbursedAmount)}
              </span>
            </button>
          )
        })}
      </div>

      {/* KPI strip - see Overview.tsx for the rationale on the lg breakpoint. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Outstanding"
          value={live.currentOutstanding}
          format={formatINRCompact}
          tone={d.color}
          icon={<Coins size={16} />}
          hint="incl. live accrual"
          index={0}
        />
        <StatCard
          label="Disbursed"
          value={d.disbursedAmount}
          format={formatINRCompact}
          tone="default"
          icon={<HandCoins size={16} />}
          hint={fmtDateLong(d.disbursedDate)}
          index={1}
        />
        <StatCard
          label="Daily interest"
          value={live.dailyInterest}
          format={formatINR}
          tone="amber"
          icon={<Flame size={16} />}
          hint={`@ ${formatPercent(live.rate, 2)} p.a.`}
          index={2}
        />
        <StatCard
          label="EMI"
          value={live.emiAmount ?? 0}
          format={formatINR}
          tone="rose"
          icon={<TrendingUp size={16} />}
          hint={d.emiStartDate ? `from ${fmtDateLong(d.emiStartDate).replace(', 20', " '")}` : ''}
          index={3}
        />
        <StatCard
          label="Total paid"
          value={d.schedule.filter((r) => r.dueDate <= todayIso).reduce((s, r) => s + r.paymentDue, 0)}
          format={formatINRCompact}
          tone="emerald"
          icon={<Hash size={16} />}
          hint={`${live.paymentsCompleted}/${live.paymentsTotal} payments`}
          index={4}
        />
        <StatCard
          label="Lifetime cost"
          value={d.totalPaymentPlanned}
          format={formatINRCompact}
          tone="cyan"
          icon={<CalendarRange size={16} />}
          hint={`${formatINRCompact(d.totalInterestPlanned)} interest`}
          index={5}
        />
      </div>

      {/* Outstanding chart + Rate timeline */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <GlassCard pad="lg">
          <SectionTitle
            eyebrow={d.applicationNumber}
            title="Outstanding journey"
            description="Pink line marks today; dashed lines mark interest-rate revisions; amber dot is the peak."
          />
          <SingleOutstandingChart disbursement={d} todayIso={todayIso} height={300} />
        </GlassCard>

        <GlassCard pad="lg" tone={d.color}>
          <SectionTitle
            eyebrow="Interest rate phases"
            title={`${d.ratePeriods.length} rate period${d.ratePeriods.length > 1 ? 's' : ''}`}
            description="The lender revised the rate over time. These are the active windows."
          />
          <RateTimeline disbursement={d} />

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-bg-elevated/40 p-4 text-sm">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
              <Percent size={12} /> right now
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular">
              {formatPercent(live.rate, 2)} p.a.
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Phase {live.ratePeriodIndex + 1} of {d.ratePeriods.length}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Payment composition */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Per payment"
          title="Interest vs principal across the schedule"
          description="During the pre-EMI phase, only part of the monthly interest is paid in cash; the rest accrues. Once the EMI begins, principal repayment kicks in."
          right={
            <div className="flex items-center gap-3 text-[11px] text-ink-tertiary">
              <Legend dot="bg-accent-rose" label="Interest" />
              <Legend dot="bg-accent-emerald" label="Principal" />
            </div>
          }
        />
        <PaymentBreakdownChart disbursement={d} todayIso={todayIso} />
      </GlassCard>

      {/* Schedule table */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Amortization"
          title="Full payment schedule"
          description={`Every payment from ${fmtDateLong(d.schedule[0].dueDate)} to ${fmtDateLong(d.finalDate)}.`}
          right={
            <div className="hidden items-center gap-2 text-[11px] text-ink-tertiary md:flex">
              <Layers size={14} />
              {d.schedule.length} payments
            </div>
          }
        />
        <PaymentScheduleTable disbursement={d} todayIso={todayIso} pageSize={14} />
      </GlassCard>
    </div>
  )
}

const Legend = ({ dot, label }: { dot: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <span className={clsx('h-2 w-2 rounded-full', dot)} />
    {label}
  </div>
)

export default Disbursements
