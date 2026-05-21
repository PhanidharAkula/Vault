import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote,
  CalendarClock,
  Coins,
  Flame,
  Layers,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { LiveOutstandingHero } from '../components/LiveOutstandingHero'
import { OutstandingTimeline } from '../components/charts/OutstandingTimeline'
import { DisbursementCard } from '../components/DisbursementCard'
import { GlassCard, Pill, SectionTitle } from '../components/ui/GlassCard'
import { StatCard } from '../components/ui/StatCard'
import { DrawBar } from '../components/ui/DrawBar'
import { computeAggregate } from '../lib/calculations'
import { DISBURSEMENTS, MASTER } from '../data/loanData'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import { fmtDateLong, formatRelative, tenureToYM, monthsBetween } from '../lib/dates'
import { useTodayIso } from '../state/today'

const Overview = ({ onOpenDisbursement }: { onOpenDisbursement: (i: number) => void }) => {
  const todayIso = useTodayIso()
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  const totalCostOfLoan = agg.totalPlannedPayment
  const interestShare = (agg.totalPlannedInterest / totalCostOfLoan) * 100

  const monthsToFinal = monthsBetween(todayIso, MASTER.finalMaturity)

  // Combined next due (sum across tranches sharing earliest date)
  const nextInterestSum = agg.nextDueRows.reduce((s, x) => s + x.payment.interest, 0)
  const nextPrincipalSum = agg.nextDueRows.reduce((s, x) => s + x.payment.principal, 0)
  const nextOutstandingAfter = agg.nextDueRows.reduce((s, x) => s + x.payment.totalOutstanding, 0)

  // Combined monthly EMI across all tranches (each tranche contributes its
  // first EMI row's paymentDue). Computed from the schedule so it stays in
  // sync as new tranches are added.
  const combinedEmi = DISBURSEMENTS.reduce(
    (s, d) => s + (d.emiStartIndex >= 0 ? d.schedule[d.emiStartIndex].paymentDue : 0),
    0,
  )

  // Earliest date any tranche transitions into EMI (where principal repayment
  // begins). Pulled from the schedule rather than hardcoded.
  const emiStarts = DISBURSEMENTS.map((d) => d.emiStartDate).filter(Boolean) as string[]
  const fullEmiStartDate = emiStarts.sort()[0] ?? MASTER.finalMaturity

  return (
    <div className="space-y-6">
      {/* Heading row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Pill tone="violet">Education loan</Pill>
            <Pill>{DISBURSEMENTS.length} disbursements</Pill>
            <Pill tone="emerald">on schedule</Pill>
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight md:text-[34px]">
            Welcome back, <span className="gradient-text-brand">{MASTER.applicantName.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Here is the live state of your loan{' '}
            <span className="font-mono text-ink-primary">{MASTER.applicationNumber}</span>. Every metric
            updates as time passes.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">
            Final maturity
          </div>
          <div className="font-display text-lg font-semibold">{fmtDateLong(MASTER.finalMaturity)}</div>
          <div className="text-xs text-ink-tertiary">
            {tenureToYM(monthsToFinal)} remaining
          </div>
        </div>
      </div>

      {/* Hero */}
      <LiveOutstandingHero />

      {/* KPI strip — tighter than 3-up at md (820px iPad portrait) makes the
          values overflow ('L' suffix wraps), so we hold 2-up until lg+. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Disbursed"
          value={agg.totalDisbursed}
          format={formatINRCompact}
          tone="violet"
          icon={<Banknote size={16} />}
          hint={`across ${DISBURSEMENTS.length} tranches`}
          index={0}
        />
        <StatCard
          label="Principal paid"
          value={agg.totalPrincipalPaid}
          format={formatINRCompact}
          tone="emerald"
          icon={<Receipt size={16} />}
          hint={
            agg.totalPrincipalPaid > 0
              ? `${agg.totalPaid > 0 ? `${formatINRCompact(agg.totalPaid)} cash out` : ''}`
              : 'EMI starts Sep 2027'
          }
          index={1}
        />
        <StatCard
          label="Interest paid"
          value={agg.totalInterestPaid}
          format={formatINRCompact}
          tone="rose"
          icon={<Flame size={16} />}
          hint={`+${formatINRCompact(agg.totalInterestAccrued)} accrued`}
          index={2}
        />
        <StatCard
          label="Daily interest"
          value={agg.totalDailyInterest}
          format={(n) => formatINR(n)}
          tone="amber"
          icon={<TrendingUp size={16} />}
          hint="at today's outstanding"
          index={3}
        />
        <StatCard
          label="ROI"
          value={agg.weightedAverageRate}
          format={(n) => formatPercent(n, 2)}
          tone="cyan"
          icon={<Coins size={16} />}
          hint="weighted rate of interest"
          index={4}
        />
        <StatCard
          label="Remaining"
          value={agg.totalRemainingPayments}
          format={(n) => `${Math.round(n)}`}
          tone="default"
          icon={<CalendarClock size={16} />}
          hint={`of ${agg.totalPlannedPayments} payments`}
          index={5}
        />
      </div>

      {/* Timeline + Next payment */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <GlassCard pad="lg">
          <SectionTitle
            eyebrow="Master view"
            title="Outstanding across time"
            description={`Stacked across all ${DISBURSEMENTS.length} disbursements. Pink dot is today; coloured ticks are interest-rate changes.`}
          />
          <OutstandingTimeline todayIso={todayIso} />
        </GlassCard>

        {/* Next payment + at-a-glance */}
        <div className="space-y-4">
          {agg.nextDueDate && (
            <GlassCard pad="lg" tone="emerald">
              <div className="flex items-center justify-between">
                <Pill tone="emerald">Next due · combined</Pill>
                <span className="text-[11px] text-ink-tertiary">
                  {formatRelative(agg.nextDueDate, todayIso)}
                </span>
              </div>
              <div className="mt-3 font-display text-3xl font-semibold leading-none tabular gradient-text-emerald md:text-[44px]">
                {formatINR(agg.nextDueTotal)}
              </div>
              <div className="mt-1 text-sm text-ink-secondary">
                {fmtDateLong(agg.nextDueDate)} · {agg.nextDueRows.length} tranche
                {agg.nextDueRows.length === 1 ? '' : 's'}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-ink-tertiary">
                <div className="rounded-lg border border-white/[0.06] bg-bg-elevated/50 p-2">
                  <div className="uppercase tracking-[0.12em]">Interest</div>
                  <div className="mt-0.5 font-medium text-ink-primary tabular">
                    {formatINRCompact(nextInterestSum)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-bg-elevated/50 p-2">
                  <div className="uppercase tracking-[0.12em]">Principal</div>
                  <div className="mt-0.5 font-medium text-ink-primary tabular">
                    {formatINRCompact(nextPrincipalSum)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-bg-elevated/50 p-2">
                  <div className="uppercase tracking-[0.12em]">Total after</div>
                  <div className="mt-0.5 font-medium text-ink-primary tabular">
                    {formatINRCompact(nextOutstandingAfter)}
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-white/[0.05] pt-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                  Per tranche
                </div>
                <div className="mt-2 space-y-1.5">
                  {agg.nextDueRows.map((row) => (
                    <div
                      key={row.disbursement.applicationNumber}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.disbursement.color === 'violet'
                              ? 'bg-accent-violet'
                              : row.disbursement.color === 'cyan'
                                ? 'bg-accent-cyan'
                                : row.disbursement.color === 'emerald'
                                  ? 'bg-accent-emerald'
                                  : 'bg-accent-pink'
                          }`}
                        />
                        <span className="font-mono text-ink-secondary">
                          {row.disbursement.applicationNumber}
                        </span>
                      </span>
                      <span className="font-medium tabular text-ink-primary">
                        {formatINR(row.payment.paymentDue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard pad="lg" tone="violet">
            <Pill tone="violet">Lifetime cost</Pill>
            <div className="mt-3">
              <div className="font-display text-3xl font-semibold tabular gradient-text-brand">
                {formatINRCompact(totalCostOfLoan)}
              </div>
              <div className="mt-1 text-sm text-ink-secondary">
                Total payments planned over the loan lifetime
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {/* Principal disbursed (₹55L) + Interest cost (₹73.56L) = lifetime
                  payment (₹1.29 Cr). Using `totalDisbursed` here instead of the
                  `principal` column sum, because that column also includes the
                  pre-EMI accrued interest (≈₹17L) that gets repaid via EMI
                  principal — counting it again under Principal would double up. */}
              <SplitBar
                label="Principal"
                value={agg.totalDisbursed}
                total={totalCostOfLoan}
                color="emerald"
              />
              <SplitBar
                label="Interest"
                value={agg.totalPlannedInterest}
                total={totalCostOfLoan}
                color="rose"
              />
            </div>
            <div className="mt-3 text-[11px] text-ink-tertiary">
              {interestShare.toFixed(1)}% of every rupee paid is interest.
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Disbursement cards */}
      <div>
        <SectionTitle
          eyebrow="Per disbursement"
          title="Tranche performance"
          description="Click any tranche to dive into its full schedule, rate moves, and projection."
          right={
            <div className="hidden items-center gap-2 text-[11px] text-ink-tertiary md:flex">
              <Layers size={14} /> {DISBURSEMENTS.length} disbursements active
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DISBURSEMENTS.map((d, i) => (
            <DisbursementCard key={d.applicationNumber} d={d} index={i} onOpen={() => onOpenDisbursement(i)} />
          ))}
        </div>
      </div>

      {/* Insights ribbon */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <Insight
          eyebrow="Cost ratio"
          title={`₹${(agg.totalPlannedInterest / 1e5).toFixed(1)} L`}
          subtitle="lifetime interest"
          body={`You'll pay ${formatINRCompact(agg.totalPlannedInterest)} in interest over the loan's lifetime, roughly ${(agg.totalPlannedInterest / agg.totalDisbursed * 100).toFixed(0)}% of the principal disbursed.`}
        />
        <Insight
          eyebrow="EMI horizon"
          title={fmtDateLong(fullEmiStartDate)}
          subtitle="full EMI begins"
          body={`From ${fmtDateLong(fullEmiStartDate)}, the combined monthly EMI across all ${DISBURSEMENTS.length} tranches will be ${formatINRCompact(combinedEmi)}. That's when principal repayment kicks in.`}
        />
        <Insight
          eyebrow="Burn rate"
          title={formatINR(Math.round(agg.totalDailyInterest * 30))}
          subtitle="interest / month"
          body={`At today's outstanding, you're accruing roughly ${formatINRCompact(agg.totalDailyInterest)} per day, or ${formatINRCompact(agg.totalDailyInterest * 30)} every month.`}
        />
      </motion.div>
    </div>
  )
}

const SplitBar = ({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: 'emerald' | 'rose'
}) => {
  const pct = (value / total) * 100
  const bg = color === 'emerald' ? 'bg-accent-emerald' : 'bg-accent-rose'
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-tertiary">{label}</span>
        <span className="font-medium tabular text-ink-primary">
          {formatINR(value)} <span className="text-ink-tertiary">· {pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="mt-1">
        <DrawBar pct={pct} fillClassName={bg} trackClassName="bg-bg-elevated" height={6} />
      </div>
    </div>
  )
}

const Insight = ({
  eyebrow,
  title,
  subtitle,
  body,
}: {
  eyebrow: string
  title: string
  subtitle: string
  body: string
}) => (
  <div className="glass relative overflow-hidden rounded-2xl p-5">
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
      {eyebrow}
    </div>
    <div className="mt-2 font-display text-2xl font-semibold tabular gradient-text-brand">
      {title}
    </div>
    <div className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">{subtitle}</div>
    <div className="mt-3 text-[13px] leading-relaxed text-ink-secondary">{body}</div>
  </div>
)

export default Overview
