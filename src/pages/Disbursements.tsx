import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Plate, SectionTitle, Tag, InkSwatch } from '../components/ui/Plate'
import { StatCard } from '../components/ui/StatCard'
import { DISBURSEMENTS, TRANCHE_VAR } from '../data/loanData'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import { computeLiveStatus } from '../lib/calculations'
import { SingleOutstandingChart } from '../components/charts/SingleOutstandingChart'
import { PaymentBreakdownChart } from '../components/charts/PaymentBreakdownChart'
import { PaymentScheduleTable } from '../components/PaymentScheduleTable'
import { RateTimeline } from '../components/charts/RateTimeline'
import { fmtDateLong, monthsBetween, tenureToYM } from '../lib/dates'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'

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
  const ink = TRANCHE_VAR[d.color]

  const monthsToFinal = monthsBetween(todayIso, d.finalDate)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="gold">Plate 02</Tag>
            <Tag tone={d.color}>{d.shortName}</Tag>
          </div>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-[36px]">
            <span className="display-num" style={{ color: ink }}>
              {formatINRCompact(d.disbursedAmount)}
            </span>{' '}
            <span className="text-ink-tertiary">·</span>{' '}
            <span className="text-[0.6em] tracking-[0.04em] text-ink-secondary">№ {d.applicationNumber}</span>
          </h1>
          <p className="mt-1.5 text-xs text-ink-secondary">
            Disbursed {fmtDateLong(d.disbursedDate)} · matures {fmtDateLong(d.finalDate)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="etch">Active phase</div>
          <div className="mt-1 font-display text-lg font-medium">
            <span style={{ color: ink }}>{formatPercent(live.rate, 2)}</span>{' '}
            <span className="text-ink-tertiary">·</span> {live.isInEMIPhase ? 'EMI' : 'Pre-EMI'}
          </div>
          <div className="text-[10px] tracking-[0.08em] text-ink-tertiary">
            {live.paymentsCompleted}/{live.paymentsTotal} payments · {tenureToYM(monthsToFinal)} left
          </div>
        </div>
      </div>

      {/* File tabs - stack vertically on mobile so each row stays full-width */}
      <div className="flex flex-col gap-1 border border-line bg-bg-surface p-1 sm:flex-row sm:items-stretch">
        {DISBURSEMENTS.map((item, i) => {
          const active = activeIdx === i
          const itemInk = TRANCHE_VAR[item.color]
          return (
            <button
              type="button"
              key={item.applicationNumber}
              onClick={() => setActiveIdx(i)}
              className={clsx(
                'relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors sm:flex-1',
                active ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {active && (
                <motion.div
                  layoutId="trancheActive"
                  className="absolute inset-0 border border-line-strong bg-bg-elevated"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                >
                  <span aria-hidden className="absolute left-0 right-0 top-0 h-[2px]" style={{ background: itemInk }} />
                </motion.div>
              )}
              <InkSwatch color={itemInk} className="relative z-10" />
              <span className="relative z-10 flex min-w-0 flex-col">
                <span className="etch !text-[8px]">{item.shortName}</span>
                <span className="truncate text-[11px] tracking-[0.04em]">{item.applicationNumber}</span>
              </span>
              <span className="display-num relative z-10 ml-auto font-display text-sm font-medium tabular">
                {formatINRCompact(item.disbursedAmount)}
              </span>
            </button>
          )
        })}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Outstanding"
          value={live.currentOutstanding}
          format={formatINRCompact}
          tone={d.color}
          hint="incl. live accrual"
          index={0}
        />
        <StatCard
          label="Disbursed"
          value={d.disbursedAmount}
          format={formatINRCompact}
          tone="default"
          hint={fmtDateLong(d.disbursedDate)}
          index={1}
        />
        <StatCard
          label="Daily interest"
          value={live.dailyInterest}
          format={formatINR}
          tone="vermillion"
          hint={`@ ${formatPercent(live.rate, 2)} p.a.`}
          index={2}
        />
        <StatCard
          label="EMI"
          value={live.emiAmount ?? 0}
          format={formatINR}
          tone="plum"
          hint={d.emiStartDate ? `from ${fmtDateLong(d.emiStartDate).replace(', 20', " '")}` : ''}
          index={3}
        />
        <StatCard
          label="Total paid"
          value={d.schedule.filter((r) => r.dueDate <= todayIso).reduce((s, r) => s + r.paymentDue, 0)}
          format={formatINRCompact}
          tone="sage"
          hint={`${live.paymentsCompleted}/${live.paymentsTotal} payments`}
          index={4}
        />
        <StatCard
          label="Lifetime cost"
          value={d.totalPaymentPlanned}
          format={formatINRCompact}
          tone="cerulean"
          hint={`${formatINRCompact(d.totalInterestPlanned)} interest`}
          index={5}
        />
      </div>

      {/* Outstanding chart + Rate phases */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Plate pad="lg">
          <SectionTitle
            fig="01"
            eyebrow={`№ ${d.applicationNumber}`}
            title="Outstanding journey"
            description="Vermillion needle marks today; dashed verticals mark rate revisions; the gold dot is the peak."
          />
          <SingleOutstandingChart disbursement={d} todayIso={todayIso} height={300} />
        </Plate>

        <Plate pad="lg" tone={d.color}>
          <SectionTitle
            fig="02"
            eyebrow="Interest rate phases"
            title={`${d.ratePeriods.length} rate period${d.ratePeriods.length > 1 ? 's' : ''}`}
            description="Every window the lender has priced this tranche through."
          />
          <RateTimeline disbursement={d} />

          <div className="mt-5 border border-line bg-bg-base p-4">
            <div className="etch">Right now</div>
            <div className="display-num mt-1.5 font-display text-2xl font-medium tabular text-ink-primary">
              {formatPercent(live.rate, 2)} <span className="text-sm text-ink-tertiary">p.a.</span>
            </div>
            <div className="mt-1 text-[10px] tracking-[0.08em] text-ink-tertiary">
              Phase {live.ratePeriodIndex + 1} of {d.ratePeriods.length}
            </div>
          </div>
        </Plate>
      </div>

      {/* Payment composition */}
      <Plate pad="lg">
        <SectionTitle
          fig="03"
          eyebrow="Per payment"
          title="Interest vs principal across the schedule"
          description="During pre-EMI, only part of the monthly interest is paid in cash; the rest accrues. Once the EMI begins, principal repayment kicks in."
          right={
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              <Legend color="rgb(var(--c-vermillion))" label="Interest" />
              <Legend color="rgb(var(--c-sage))" label="Principal" />
            </div>
          }
        />
        <PaymentBreakdownChart disbursement={d} todayIso={todayIso} />
      </Plate>

      {/* Amortization ledger */}
      <Plate pad="lg">
        <SectionTitle
          fig="04"
          eyebrow="Amortization"
          title="Full payment schedule"
          description={`Every entry from ${fmtDateLong(d.schedule[0].dueDate)} to ${fmtDateLong(d.finalDate)}.`}
          right={<div className="etch hidden md:block">{d.schedule.length} entries</div>}
        />
        <PaymentScheduleTable disbursement={d} todayIso={todayIso} pageSize={14} />
      </Plate>
    </div>
  )
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <InkSwatch color={color} />
    {label}
  </div>
)

export default Disbursements
