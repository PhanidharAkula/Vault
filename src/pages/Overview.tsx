import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LiveOutstandingHero } from '../components/LiveOutstandingHero'
import { OutstandingTimeline } from '../components/charts/OutstandingTimeline'
import { DisbursementCard } from '../components/DisbursementCard'
import { Plate, SectionTitle, Tag, InkSwatch } from '../components/ui/Plate'
import { StatCard } from '../components/ui/StatCard'
import { DrawBar } from '../components/ui/DrawBar'
import { TapeTimeline } from '../components/ui/TapeTimeline'
import { computeAggregate } from '../lib/calculations'
import { DISBURSEMENTS, MASTER, TRANCHE_VAR } from '../data/loanData'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import { fmtDateLong, formatRelative, tenureToYM, monthsBetween } from '../lib/dates'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'

const Overview = ({ onOpenDisbursement }: { onOpenDisbursement: (i: number) => void }) => {
  const todayIso = useTodayIso()
  useCurrency() // subscribe so the currency toggle re-renders all formatINR calls

  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  const totalCostOfLoan = agg.totalPlannedPayment
  const interestShare = (agg.totalPlannedInterest / totalCostOfLoan) * 100

  const monthsToFinal = monthsBetween(todayIso, MASTER.finalMaturity)

  // Combined next due (sum across tranches sharing earliest date)
  const nextInterestSum = agg.nextDueRows.reduce((s, x) => s + x.payment.interest, 0)
  const nextPrincipalSum = agg.nextDueRows.reduce((s, x) => s + x.payment.principal, 0)
  const nextOutstandingAfter = agg.nextDueRows.reduce((s, x) => s + x.payment.totalOutstanding, 0)

  // Combined monthly EMI across all tranches.
  const combinedEmi = DISBURSEMENTS.reduce(
    (s, d) => s + (d.emiStartIndex >= 0 ? d.schedule[d.emiStartIndex].paymentDue : 0),
    0,
  )

  // Earliest date any tranche transitions into EMI.
  const emiStarts = DISBURSEMENTS.map((d) => d.emiStartDate).filter(Boolean) as string[]
  const fullEmiStartDate = emiStarts.sort()[0] ?? MASTER.finalMaturity

  return (
    <div className="space-y-6">
      {/* Heading plate */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="gold">Plate 01</Tag>
            <Tag>Education loan</Tag>
            <Tag tone="sage">on schedule</Tag>
          </div>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-[40px]">
            Master ledger<span className="text-vermillion">.</span>
          </h1>
          <p className="mt-1.5 text-xs text-ink-secondary">
            Good day, {MASTER.applicantName.split(' ')[0]} - the live state of loan{' '}
            <span className="text-ink-primary">№ {MASTER.applicationNumber}</span>. Every figure rolls
            forward with time.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="etch">Final maturity</div>
          <div className="mt-1 font-display text-lg font-medium">{fmtDateLong(MASTER.finalMaturity)}</div>
          <div className="text-[10px] tracking-[0.08em] text-ink-tertiary">
            {tenureToYM(monthsToFinal)} remaining
          </div>
        </div>
      </div>

      {/* Hero counter */}
      <LiveOutstandingHero />

      {/* The full term, as a measuring tape */}
      <Plate pad="lg">
        <SectionTitle
          fig="01"
          eyebrow="The full term"
          title="Fourteen years on one tape"
          description="Every disbursement, rate revision and milestone from first drawdown to final settlement."
        />
        <TapeTimeline todayIso={todayIso} />
      </Plate>

      {/* KPI strip - 2-up until lg (values overflow at md), then 3/6-up. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Disbursed"
          value={agg.totalDisbursed}
          format={formatINRCompact}
          tone="gold"
          hint={`across ${DISBURSEMENTS.length} tranches`}
          index={0}
        />
        <StatCard
          label="Principal paid"
          value={agg.totalPrincipalPaid}
          format={formatINRCompact}
          tone="sage"
          hint={
            agg.totalPrincipalPaid > 0
              ? `${agg.totalPaid > 0 ? `${formatINRCompact(agg.totalPaid)} cash out` : ''}`
              : `EMI starts ${fmtDateLong(fullEmiStartDate).replace(/^\d+ /, '').replace(', 20', " '")}`
          }
          index={1}
        />
        <StatCard
          label="Interest paid"
          value={agg.totalInterestPaid}
          format={formatINRCompact}
          tone="vermillion"
          hint={`+${formatINRCompact(agg.totalInterestAccrued)} accrued`}
          index={2}
        />
        <StatCard
          label="Daily interest"
          value={agg.totalDailyInterest}
          format={(n) => formatINR(n)}
          tone="vermillion"
          hint="at today's outstanding"
          index={3}
        />
        <StatCard
          label="Weighted rate"
          value={agg.weightedAverageRate}
          format={(n) => formatPercent(n, 2)}
          tone="cerulean"
          hint="across live balances"
          index={4}
        />
        <StatCard
          label="Remaining"
          value={agg.totalRemainingPayments}
          format={(n) => `${Math.round(n)}`}
          tone="default"
          hint={`of ${agg.totalPlannedPayments} payments`}
          index={5}
        />
      </div>

      {/* Timeline + due notice */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Plate pad="lg">
          <SectionTitle
            fig="02"
            eyebrow="Master view"
            title="Outstanding across time"
            description={`Stacked across all ${DISBURSEMENTS.length} disbursements. The vermillion needle is today; small ticks mark rate revisions.`}
          />
          <OutstandingTimeline todayIso={todayIso} />
        </Plate>

        <div className="space-y-4">
          {/* DUE NOTICE - the payment stub */}
          {agg.nextDueDate && (
            <Plate pad="lg" tone="gold" className="overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <Tag tone="gold">Due notice · combined</Tag>
                <span className="text-[10px] tracking-[0.08em] text-ink-tertiary">
                  {formatRelative(agg.nextDueDate, todayIso)}
                </span>
              </div>
              <div className="display-num mt-4 font-display text-[34px] font-medium leading-none text-gold md:text-[42px]">
                {formatINR(agg.nextDueTotal)}
              </div>
              <div className="mt-1.5 text-[11px] text-ink-secondary">
                {fmtDateLong(agg.nextDueDate)} · {agg.nextDueRows.length} tranche
                {agg.nextDueRows.length === 1 ? '' : 's'}
              </div>

              {/* perforation */}
              <div className="relative -mx-6 my-4">
                <div className="border-t border-dashed border-line-strong" />
                <span aria-hidden className="absolute -left-[7px] -top-[7px] h-[14px] w-[14px] rounded-full border border-line bg-bg-base" />
                <span aria-hidden className="absolute -right-[7px] -top-[7px] h-[14px] w-[14px] rounded-full border border-line bg-bg-base" />
              </div>

              {/* counterfoil */}
              <div className="grid grid-cols-3 gap-2">
                <StubCell label="Interest" value={formatINRCompact(nextInterestSum)} tone="text-vermillion" />
                <StubCell label="Principal" value={formatINRCompact(nextPrincipalSum)} tone="text-sage" />
                <StubCell label="Balance after" value={formatINRCompact(nextOutstandingAfter)} tone="text-ink-primary" />
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <div className="etch !text-[9px]">Per tranche</div>
                <div className="mt-2 space-y-1.5">
                  {agg.nextDueRows.map((row) => (
                    <div
                      key={row.disbursement.applicationNumber}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="flex items-center gap-2">
                        <InkSwatch color={TRANCHE_VAR[row.disbursement.color]} className="!h-1.5 !w-1.5" />
                        <span className="tracking-[0.06em] text-ink-secondary">
                          {row.disbursement.applicationNumber}
                        </span>
                      </span>
                      <span className="font-semibold tabular text-ink-primary">
                        {formatINR(row.payment.paymentDue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Plate>
          )}

          {/* Lifetime cost */}
          <Plate pad="lg">
            <Tag tone="plum">Lifetime cost</Tag>
            <div className="mt-3.5">
              <div className="display-num font-display text-[30px] font-medium leading-none text-ink-primary">
                {formatINRCompact(totalCostOfLoan)}
              </div>
              <div className="mt-1.5 text-[11px] text-ink-secondary">
                Total payments planned over the loan lifetime
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {/* Principal disbursed + interest cost = lifetime payment. Uses
                  `totalDisbursed` (not the principal column sum, which would
                  double-count pre-EMI accrued interest repaid via EMI). */}
              <SplitBar label="Principal" value={agg.totalDisbursed} total={totalCostOfLoan} color="rgb(var(--c-sage))" />
              <SplitBar label="Interest" value={agg.totalPlannedInterest} total={totalCostOfLoan} color="rgb(var(--c-vermillion))" />
            </div>
            <div className="mt-3.5 border-t border-line pt-3 text-[10px] leading-relaxed text-ink-tertiary">
              {interestShare.toFixed(1)}% of every rupee paid is interest.
            </div>
          </Plate>
        </div>
      </div>

      {/* Tranche dossiers */}
      <div>
        <SectionTitle
          fig="03"
          eyebrow="Per disbursement"
          title="The tranche files"
          description="Open any dossier for its full schedule, rate moves, and projection."
          right={
            <div className="etch hidden md:block">{DISBURSEMENTS.length} files active</div>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DISBURSEMENTS.map((d, i) => (
            <DisbursementCard key={d.applicationNumber} d={d} index={i} onOpen={() => onOpenDisbursement(i)} />
          ))}
        </div>
      </div>

      {/* Marginalia */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="etch mb-3">Marginalia</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Note
            index="i"
            title={formatINRCompact(agg.totalPlannedInterest)}
            subtitle="lifetime interest"
            body={`Roughly ${((agg.totalPlannedInterest / agg.totalDisbursed) * 100).toFixed(0)}% of the principal disbursed - the price of time itself.`}
          />
          <Note
            index="ii"
            title={fmtDateLong(fullEmiStartDate)}
            subtitle="full EMI begins"
            body={`From this date the combined monthly EMI across all ${DISBURSEMENTS.length} tranches is ${formatINRCompact(combinedEmi)} - principal repayment finally kicks in.`}
          />
          <Note
            index="iii"
            title={formatINR(Math.round(agg.totalDailyInterest * 30))}
            subtitle="interest / month"
            body={`At today's outstanding, interest accrues at roughly ${formatINRCompact(agg.totalDailyInterest)} per day, every day, including today.`}
          />
        </div>
      </motion.div>
    </div>
  )
}

const StubCell = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <div className="border border-line bg-bg-base p-2">
    <div className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">{label}</div>
    <div className={`mt-1 text-[11px] font-semibold tabular ${tone}`}>{value}</div>
  </div>
)

const SplitBar = ({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) => {
  const pct = (value / total) * 100
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="uppercase tracking-[0.14em] text-ink-tertiary">{label}</span>
        <span className="font-medium tabular text-ink-primary">
          {formatINR(value)} <span className="text-ink-tertiary">· {pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="mt-1.5">
        <DrawBar pct={pct} fillStyle={{ background: color }} height={6} />
      </div>
    </div>
  )
}

const Note = ({
  index,
  title,
  subtitle,
  body,
}: {
  index: string
  title: string
  subtitle: string
  body: string
}) => (
  <div className="relative border-l border-line-strong py-1 pl-5">
    <span className="absolute -left-px top-1 h-7 w-px bg-gold" aria-hidden />
    <div className="font-display text-sm italic text-gold">{index}.</div>
    <div className="display-num mt-1.5 font-display text-2xl font-medium tracking-tight text-ink-primary">
      {title}
    </div>
    <div className="etch mt-0.5 !text-[9px]">{subtitle}</div>
    <p className="mt-2.5 text-[11px] leading-relaxed text-ink-secondary">{body}</p>
  </div>
)

export default Overview
