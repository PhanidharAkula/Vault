import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Plate, SectionTitle, Tag, InkSwatch } from '../components/ui/Plate'
import { DrawBar } from '../components/ui/DrawBar'
import { Gauge } from '../components/ui/Gauge'
import { DISBURSEMENTS, MASTER, TRANCHE_VAR } from '../data/loanData'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import { useChartTick } from '../lib/useChartTick'
import { computeAggregate } from '../lib/calculations'
import { formatINR, formatINRCompact } from '../lib/format'
import { fmtDateLong, monthsBetween, tenureToYM } from '../lib/dates'

const SAGE = 'rgb(var(--c-sage))'
const VERMILLION = 'rgb(var(--c-vermillion))'
const GOLD = 'rgb(var(--c-gold))'
const CERULEAN = 'rgb(var(--c-cerulean))'

const PIE_TOOLTIP_STYLE = {
  background: 'rgb(var(--bg-elevated))',
  border: '1px solid var(--line-strong)',
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "'Spline Sans Mono', ui-monospace, monospace",
}

const Analytics = () => {
  useChartTick()
  const todayIso = useTodayIso()
  useCurrency() // subscribe so currency toggle re-renders all aggregates + charts
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  // Chart data is memoized so Recharts doesn't restart its animations every
  // time TodayProvider ticks. For "principal" we use `totalDisbursed` rather
  // than the principal-column sum (which double-counts pre-EMI accrued
  // interest repaid via EMI principal).
  const principalVsInterest = useMemo(
    () => [
      { name: 'Principal', value: agg.totalDisbursed, color: SAGE },
      { name: 'Interest', value: agg.totalPlannedInterest, color: VERMILLION },
    ],
    [agg.totalDisbursed, agg.totalPlannedInterest],
  )

  const trancheShares = useMemo(
    () =>
      DISBURSEMENTS.map((d) => ({
        name: d.shortName,
        value: d.disbursedAmount,
        color: TRANCHE_VAR[d.color],
        label: d.applicationNumber,
      })),
    [],
  )

  const interestPhaseSplit = useMemo(() => {
    let preEmiInterest = 0
    let emiInterest = 0
    for (const d of DISBURSEMENTS) {
      for (const r of d.schedule) {
        if (r.principal === 0) preEmiInterest += r.interest
        else emiInterest += r.interest
      }
    }
    return [
      { name: 'Pre-EMI interest', value: preEmiInterest, color: GOLD },
      { name: 'EMI interest', value: emiInterest, color: VERMILLION },
    ]
  }, [])

  const interestPctOfPrincipal =
    (agg.totalPlannedInterest / DISBURSEMENTS.reduce((s, d) => s + d.disbursedAmount, 0)) * 100

  // tenure progress
  const totalDays = monthsBetween(MASTER.firstDisbursedDate, MASTER.finalMaturity) * 30.4
  const elapsedDays = monthsBetween(MASTER.firstDisbursedDate, todayIso) * 30.4
  const tenurePct = (elapsedDays / totalDays) * 100

  // payments completion
  const paidPct =
    ((agg.totalPlannedPayments - agg.totalRemainingPayments) / agg.totalPlannedPayments) * 100

  // EMI start date
  const emiStarts = DISBURSEMENTS.map((d) => d.emiStartDate).filter(Boolean) as string[]
  const earliestEmi = emiStarts.sort()[0]

  // Combined EMI amount
  const combinedEmi = DISBURSEMENTS.reduce(
    (s, d) => s + (d.emiStartIndex >= 0 ? d.schedule[d.emiStartIndex].paymentDue : 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="gold">Plate 06</Tag>
          <Tag tone="cerulean">Composition</Tag>
        </div>
        <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-[36px]">
          The anatomy of the debt<span className="text-vermillion">.</span>
        </h1>
        <p className="mt-1.5 text-xs text-ink-secondary">
          The story behind the figures - what is owed where, and where it's headed.
        </p>
      </div>

      {/* Headline metrics */}
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <Headline
          eyebrow="Cost of borrowing"
          title={formatINRCompact(agg.totalPlannedInterest)}
          subtitle={`${interestPctOfPrincipal.toFixed(0)}% of principal`}
          tone="text-vermillion"
          body={`Total interest charges of ${formatINR(agg.totalPlannedInterest)} across all ${DISBURSEMENTS.length} tranches by ${fmtDateLong(MASTER.finalMaturity)}.`}
          index={0}
        />
        <Headline
          eyebrow="Tenure horizon"
          title={tenureToYM(monthsBetween(MASTER.firstDisbursedDate, MASTER.finalMaturity))}
          subtitle="first drawdown to final EMI"
          tone="text-gold"
          body={`The whole structure runs from ${fmtDateLong(MASTER.firstDisbursedDate)} to ${fmtDateLong(MASTER.finalMaturity)}, with synchronized maturity across all tranches.`}
          index={1}
        />
        <Headline
          eyebrow="Future EMI"
          title={formatINR(combinedEmi)}
          subtitle={earliestEmi ? `from ${fmtDateLong(earliestEmi)}` : ''}
          tone="text-sage"
          body={`After the moratorium ends, the combined EMI is ${formatINR(combinedEmi)} per month until ${fmtDateLong(MASTER.finalMaturity)}.`}
          index={2}
        />
      </div>

      {/* Composition rings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Plate pad="lg">
          <SectionTitle
            fig="01"
            eyebrow="Lifetime payment makeup"
            title="Where every rupee will go"
            description="Out of all payments planned, how much is principal vs interest."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="h-[220px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={principalVsInterest}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={92}
                    stroke="none"
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {principalVsInterest.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={PIE_TOOLTIP_STYLE} formatter={((v: number) => formatINR(v)) as never} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {principalVsInterest.map((s) => {
                const pct = (s.value / agg.totalPlannedPayment) * 100
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <InkSwatch color={s.color} />
                        <span className="text-ink-secondary">{s.name}</span>
                      </div>
                      <span className="font-semibold tabular">{formatINR(s.value)}</span>
                    </div>
                    <div className="mt-1.5">
                      <DrawBar pct={pct} fillStyle={{ background: s.color }} height={6} duration={1200} />
                    </div>
                    <div className="mt-1 text-[10px] tabular text-ink-tertiary">{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
              <div className="border border-line bg-bg-base p-3 text-[11px] leading-relaxed text-ink-secondary">
                <div className="etch mb-1 !text-[8px]">Insight</div>
                Roughly{' '}
                <span className="font-semibold text-vermillion">
                  {formatINRCompact(agg.totalPlannedInterest)}
                </span>{' '}
                in interest charges for{' '}
                <span className="font-semibold text-sage">{formatINRCompact(agg.totalDisbursed)}</span> of
                principal.
              </div>
            </div>
          </div>
        </Plate>

        <Plate pad="lg">
          <SectionTitle
            fig="02"
            eyebrow="Tranche exposure"
            title="Disbursement composition"
            description="How the principal splits across the drawdowns."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="h-[220px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={trancheShares}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={92}
                    stroke="none"
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {trancheShares.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={PIE_TOOLTIP_STYLE} formatter={((v: number) => formatINR(v)) as never} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 self-center text-[12px]">
              {trancheShares.map((s, i) => {
                const total = trancheShares.reduce((sum, x) => sum + x.value, 0)
                const pct = (s.value / total) * 100
                return (
                  <div key={s.name} className="border border-line bg-bg-base px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <InkSwatch color={s.color} />
                        <span className="truncate text-[11px] tracking-[0.04em] text-ink-secondary">
                          {s.label}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold tabular">{formatINR(s.value)}</span>
                    </div>
                    <div className="mt-1.5">
                      <DrawBar
                        pct={pct}
                        fillStyle={{ background: s.color }}
                        height={5}
                        duration={1200}
                        delay={i * 50}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Plate>
      </div>

      {/* Pre-EMI vs EMI interest */}
      <Plate pad="lg">
        <SectionTitle
          fig="03"
          eyebrow="Where the interest happens"
          title="Pre-EMI vs EMI: where the cost compounds"
          description="During the moratorium, interest accrues but is barely paid - that's where the outstanding balloons."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr]">
          <div className="h-[220px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={interestPhaseSplit}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive
                >
                  {interestPhaseSplit.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={PIE_TOOLTIP_STYLE} formatter={((v: number) => formatINR(v)) as never} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 self-center text-[12px]">
            {interestPhaseSplit.map((s) => {
              const total = interestPhaseSplit.reduce((sum, x) => sum + x.value, 0)
              const pct = (s.value / total) * 100
              return (
                <div key={s.name} className="border border-line bg-bg-base px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <InkSwatch color={s.color} />
                      <span className="text-ink-secondary">{s.name}</span>
                    </div>
                    <span className="font-semibold tabular">{formatINR(s.value)}</span>
                  </div>
                  <div className="mt-1 text-[10px] tabular text-ink-tertiary">{pct.toFixed(1)}%</div>
                </div>
              )
            })}
            <div className="border border-line bg-bg-base p-3 text-[11px] leading-relaxed text-ink-secondary">
              <div className="etch mb-1 !text-[8px]">Why it matters</div>
              The pre-EMI part-interest paid each month covers only a fraction of what's charged. The
              unpaid difference accrues into the outstanding balance, which then earns interest itself.
            </div>
          </div>
        </div>
      </Plate>

      {/* Instrument panel */}
      <Plate pad="lg">
        <SectionTitle
          fig="04"
          eyebrow="Progress"
          title="Where things stand now"
          description="Tenure used, payments cleared, and interest already paid - read off the dials."
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <DialCell>
            <Gauge value={tenurePct} accent={GOLD} label="tenure elapsed" sublabel="of the total horizon" size={200} />
          </DialCell>
          <DialCell>
            <Gauge
              value={paidPct}
              accent={CERULEAN}
              label="payments cleared"
              sublabel={`${agg.totalPlannedPayments - agg.totalRemainingPayments} of ${agg.totalPlannedPayments}`}
              size={200}
            />
          </DialCell>
          <DialCell>
            <Gauge
              value={(agg.totalInterestPaid / agg.totalPlannedInterest) * 100}
              accent={VERMILLION}
              label="interest paid"
              sublabel={`${formatINRCompact(agg.totalInterestPaid)} / ${formatINRCompact(agg.totalPlannedInterest)}`}
              size={200}
            />
          </DialCell>
        </div>
      </Plate>
    </div>
  )
}

const DialCell = ({ children }: { children: React.ReactNode }) => (
  <div className="grid place-items-center border border-line bg-bg-base px-4 pb-5 pt-6">{children}</div>
)

const Headline = ({
  eyebrow,
  title,
  subtitle,
  body,
  tone,
  index,
}: {
  eyebrow: string
  title: string
  subtitle: string
  body: string
  tone: string
  index: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.07 }}
    className="plate relative min-w-0 p-5"
  >
    <div className="etch">{eyebrow}</div>
    <div className={`display-num mt-2.5 break-words font-display text-[28px] font-medium leading-none tracking-tight ${tone}`}>
      {title}
    </div>
    <div className="etch mt-1.5 !text-[9px]">{subtitle}</div>
    <p className="mt-3 break-words text-[11px] leading-relaxed text-ink-secondary">{body}</p>
  </motion.div>
)

export default Analytics
