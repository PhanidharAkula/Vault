import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { GlassCard, Pill, SectionTitle } from '../components/ui/GlassCard'
import { DrawBar } from '../components/ui/DrawBar'
import { DISBURSEMENTS, MASTER } from '../data/loanData'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import { useTheme } from '../state/theme'
import { useChartTick } from '../lib/useChartTick'
import { computeAggregate } from '../lib/calculations'
import { formatINR, formatINRCompact } from '../lib/format'
import { fmtDateLong, monthsBetween, tenureToYM } from '../lib/dates'

const COLORS = ['#a78bfa', '#22d3ee', '#34d399', '#f472b6']

const Analytics = () => {
  useChartTick()
  const todayIso = useTodayIso()
  useCurrency() // subscribe so currency toggle re-renders all aggregates + charts
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])

  // All chart data is memoized so Recharts doesn't restart its animations
  // every time `TodayProvider` ticks (which happens every second). Without
  // these memos, the data arrays get fresh references on every re-render,
  // and Recharts treats that as "data changed" and replays the animation
  // from scratch - producing the chunky stop-start effect.
  //
  // For "principal" we use `totalDisbursed` (the ₹55L loan) rather than the
  // sum of the `principal` column - the column total double-counts the
  // pre-EMI accrued interest that ends up being repaid via EMI principal.
  // Disbursed (₹55L) + interest charged (₹73.56L) = lifetime payment ✓.
  const principalVsInterest = useMemo(
    () => [
      { name: 'Principal', value: agg.totalDisbursed, color: '#34d399' },
      { name: 'Interest', value: agg.totalPlannedInterest, color: '#fb7185' },
    ],
    [agg.totalDisbursed, agg.totalPlannedInterest],
  )

  const trancheShares = useMemo(
    () =>
      DISBURSEMENTS.map((d, i) => ({
        name: d.shortName,
        value: d.disbursedAmount,
        color: COLORS[i],
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
      { name: 'Pre-EMI interest', value: preEmiInterest, color: '#fbbf24' },
      { name: 'EMI interest', value: emiInterest, color: '#fb7185' },
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
        <Pill tone="cyan">Insights</Pill>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The story behind the numbers. What is owed where, and where it's headed.
        </p>
      </div>

      {/* Headline metrics */}
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <Headline
          eyebrow="Cost of borrowing"
          title={formatINRCompact(agg.totalPlannedInterest)}
          subtitle={`${interestPctOfPrincipal.toFixed(0)}% of principal`}
          color="rose"
          body={`Total interest charges of ${formatINR(agg.totalPlannedInterest)} across all ${DISBURSEMENTS.length} tranches by ${fmtDateLong(MASTER.finalMaturity)}.`}
        />
        <Headline
          eyebrow="Tenure horizon"
          title={tenureToYM(monthsBetween(MASTER.firstDisbursedDate, MASTER.finalMaturity))}
          subtitle="from first disbursement to final EMI"
          color="violet"
          body={`The whole loan structure runs from ${fmtDateLong(MASTER.firstDisbursedDate)} to ${fmtDateLong(MASTER.finalMaturity)}, with synchronized maturity across all tranches.`}
        />
        <Headline
          eyebrow="Future EMI"
          title={formatINR(combinedEmi)}
          subtitle={earliestEmi ? `from ${fmtDateLong(earliestEmi)}` : ''}
          color="emerald"
          body={`After the moratorium ends, the combined EMI is ${formatINR(combinedEmi)} per month until ${fmtDateLong(MASTER.finalMaturity)}.`}
        />
      </div>

      {/* Big composition charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard pad="lg">
          <SectionTitle
            eyebrow="Lifetime payment makeup"
            title="Where every rupee will go"
            description="Out of the total payments planned, how much is principal vs interest."
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
                    innerRadius={56}
                    outerRadius={86}
                    stroke="none"
                    paddingAngle={3}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {principalVsInterest.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(13,15,23,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={((v: number) => formatINR(v)) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {principalVsInterest.map((s) => {
                const pct = (s.value / (agg.totalPlannedPayment)) * 100
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-ink-secondary">{s.name}</span>
                      </div>
                      <span className="font-semibold tabular">{formatINR(s.value)}</span>
                    </div>
                    <div className="mt-1">
                      <DrawBar
                        pct={pct}
                        fillStyle={{ background: s.color }}
                        trackClassName="bg-bg-elevated/60"
                        height={6}
                        duration={1200}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-ink-tertiary tabular">{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
              <div className="rounded-lg border border-white/[0.06] bg-bg-elevated/40 p-3 text-xs text-ink-secondary">
                <div className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">Insight</div>
                Roughly{' '}
                <span className="font-semibold text-accent-rose">
                  {formatINRCompact(agg.totalPlannedInterest)}
                </span>{' '}
                in interest charges for{' '}
                <span className="font-semibold text-accent-emerald">
                  {formatINRCompact(agg.totalDisbursed)}
                </span>{' '}
                of principal.
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard pad="lg">
          <SectionTitle
            eyebrow="Tranche exposure"
            title="Disbursement composition"
            description="How the principal is split across the three drawdowns."
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
                    innerRadius={56}
                    outerRadius={86}
                    stroke="none"
                    paddingAngle={3}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {trancheShares.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(13,15,23,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={((v: number) => formatINR(v)) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 self-center text-sm">
              {trancheShares.map((s, i) => {
                const total = trancheShares.reduce((sum, x) => sum + x.value, 0)
                const pct = (s.value / total) * 100
                return (
                  <div
                    key={s.name}
                    className="rounded-lg border border-white/[0.05] bg-bg-elevated/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="truncate font-mono text-ink-secondary text-xs">{s.label}</span>
                      </div>
                      <span className="shrink-0 font-semibold tabular">{formatINR(s.value)}</span>
                    </div>
                    <div className="mt-1">
                      <DrawBar
                        pct={pct}
                        fillStyle={{ background: s.color }}
                        trackClassName="bg-bg-base/60"
                        height={6}
                        duration={1200}
                        delay={i * 50}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Pre-EMI vs EMI interest */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Where the interest happens"
          title="Pre-EMI vs EMI: where the cost compounds"
          description="During the moratorium (study + grace period), interest accrues but is barely paid; that's where outstanding balloons."
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
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive
                >
                  {interestPhaseSplit.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(13,15,23,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={((v: number) => formatINR(v)) as any}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 self-center text-sm">
            {interestPhaseSplit.map((s) => {
              const total = interestPhaseSplit.reduce((sum, x) => sum + x.value, 0)
              const pct = (s.value / total) * 100
              return (
                <div
                  key={s.name}
                  className="rounded-lg border border-white/[0.05] bg-bg-elevated/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-ink-secondary">{s.name}</span>
                    </div>
                    <span className="font-semibold tabular">{formatINR(s.value)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-ink-tertiary tabular">{pct.toFixed(1)}%</div>
                </div>
              )
            })}
            <div className="rounded-lg border border-white/[0.06] bg-bg-elevated/40 p-3 text-xs text-ink-secondary">
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">Why it matters</div>
              The pre-EMI part-interest paid each month covers only a fraction of what's actually
              charged. The unpaid difference accrues into the outstanding balance, which then earns
              interest itself.
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Progress dials */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Progress"
          title="Where things stand now"
          description="Tenure used, payments cleared, and outstanding consumed, at a glance."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Dial label="Tenure elapsed" pct={tenurePct} suffix="of the total horizon" color="#a78bfa" />
          <Dial label="Payments cleared" pct={paidPct} suffix={`${agg.totalPlannedPayments - agg.totalRemainingPayments} of ${agg.totalPlannedPayments}`} color="#22d3ee" />
          <Dial label="Interest paid" pct={(agg.totalInterestPaid / agg.totalPlannedInterest) * 100} suffix={`${formatINRCompact(agg.totalInterestPaid)} / ${formatINRCompact(agg.totalPlannedInterest)}`} color="#fb7185" />
        </div>
      </GlassCard>
    </div>
  )
}

const Headline = ({
  eyebrow,
  title,
  subtitle,
  body,
  color,
}: {
  eyebrow: string
  title: string
  subtitle: string
  body: string
  color: 'rose' | 'violet' | 'emerald' | 'cyan'
}) => {
  const map = {
    rose: 'gradient-text-brand',
    violet: 'gradient-text-brand',
    emerald: 'gradient-text-emerald',
    cyan: 'gradient-text-cyan',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass relative min-w-0 overflow-hidden rounded-2xl p-5"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
        {eyebrow}
      </div>
      <div className={`mt-2 font-display text-3xl font-semibold tabular ${map[color]} break-words`}>{title}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">{subtitle}</div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary break-words">{body}</p>
    </motion.div>
  )
}

const Dial = ({ label, pct, suffix, color }: { label: string; pct: number; suffix: string; color: string }) => {
  const { theme } = useTheme()
  // Theme-aware track colour - `rgba(255,255,255,0.05)` is invisible on white,
  // so we flip to a translucent dark in light mode.
  const trackStroke =
    theme === 'light' ? 'rgba(14,17,26,0.10)' : 'rgba(255,255,255,0.06)'

  // Hand-rolled SVG gauge.  Recharts' RadialBar only rounds the leading edge
  // of its bar - for tiny values (e.g. 1.6%) the *starting* edge stays sharp
  // because there isn't enough arc length for both corner radii to fit.
  // SVG `stroke-linecap="round"` rounds both ends of any stroked path
  // regardless of length, so a custom arc avoids the issue entirely.
  const SIZE_W = 220
  const SIZE_H = 170
  const r = 78
  const stroke = 16
  const cx = SIZE_W / 2
  // Vertically-centre the arc inside the container.  The 240° arc spans
  // 1.5·r vertically (top point to start/end points), so cy = SIZE_H/2 + 0.25·r.
  const cy = SIZE_H / 2 + r * 0.25
  // Arc spans 240°: from 210° (lower-left) sweeping clockwise through the
  // bottom to -30° (lower-right). All maths in degrees; SVG y axis points down.
  const startAngle = 210
  const sweepDeg = 240
  const endAngle = startAngle - sweepDeg // -30
  const fullArcLen = (sweepDeg / 360) * 2 * Math.PI * r
  const value = Math.max(0, Math.min(100, pct))
  const visibleLen = (value / 100) * fullArcLen
  const dashOffset = fullArcLen - visibleLen

  // Animate the colored stroke from 0 → visibleLen on mount.
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

  const trackPath = arcPath(cx, cy, r, startAngle, endAngle)

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-bg-elevated/40 p-4 text-center">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</div>
      <div className="relative mx-auto mt-4 h-[170px] w-[220px]">
        <svg width={SIZE_W} height={SIZE_H} viewBox={`0 0 ${SIZE_W} ${SIZE_H}`}>
          {/* Track (gray) */}
          <path
            d={trackPath}
            stroke={trackStroke}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
          {/* Progress (color) - both ends rounded via stroke-linecap.
              Stroke-dashoffset animates from full-length (hidden) to the
              target offset, drawing the arc clockwise from the start. */}
          <path
            d={trackPath}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={fullArcLen}
            strokeDashoffset={drawn ? dashOffset : fullArcLen}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>
        {/* Text sits at the arc's circle centre (cy), not the container's
            geometric centre. Since the arc opens downward, cy is below the
            container midpoint by `r * 0.25`, and aligning the text to it
            makes it feel visually centred inside the gauge. */}
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="text-center"
            style={{ transform: `translateY(${r * 0.25}px)` }}
          >
            <div className="font-display text-2xl font-semibold tabular">{pct.toFixed(1)}%</div>
            <div className="text-[10px] text-ink-tertiary">{suffix}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Build an SVG arc path from `startDeg` to `endDeg` (math polar coords:
// 0° east, 90° north, angles increase counter-clockwise). The arc curves
// upward through the top of the circle - `sweepFlag=1` selects the side of
// the chord that contains the centre (i.e. the upper arc when both points
// are in the lower half of the circle).
const arcPath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number): string => {
  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
  }
  const start = polar(startDeg)
  const end = polar(endDeg)
  const largeArc = Math.abs(startDeg - endDeg) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export default Analytics
