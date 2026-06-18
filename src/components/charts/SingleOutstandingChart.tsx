import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Customized,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtDateShort, fmtDateLong } from '../../lib/dates'
import { formatINR, formatINRCompact, formatPercent } from '../../lib/format'
import type { DisbursementView } from '../../data/loanData'
import { TRANCHE_VAR } from '../../data/loanData'
import { useChartTick } from '../../lib/useChartTick'

const TODAY_INK = 'rgb(var(--c-vermillion))'

export const SingleOutstandingChart = ({
  disbursement,
  todayIso,
  height = 280,
}: {
  disbursement: DisbursementView
  todayIso: string
  height?: number
}) => {
  useChartTick()
  // Memoize so Recharts doesn't replay its animation every TodayProvider tick
  const data = useMemo(
    () => [
      {
        date: disbursement.disbursedDate,
        outstanding: disbursement.disbursedAmount,
        interestAccrued: 0,
        rate: disbursement.ratePeriods[0].rateOfInterest,
        srNo: 0,
      },
      ...disbursement.schedule.map((r) => ({
        date: r.dueDate,
        outstanding: r.totalOutstanding,
        interestAccrued: r.interestAccrued,
        rate: r.rateAtPayment,
        srNo: r.srNo,
      })),
    ],
    [disbursement],
  )
  const ink = TRANCHE_VAR[disbursement.color]

  const todayPoint = data.find((d) => d.date >= todayIso)

  const peakIndex = data.reduce((maxI, p, i) => (p.outstanding > data[maxI].outstanding ? i : maxI), 0)
  const peakPoint = data[peakIndex]

  return (
    // Mobile gets a shorter chart (210px); from sm: upwards honour `height`.
    <div className="h-[210px] sm:h-[var(--chart-h,280px)]" style={{ ['--chart-h' as string]: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`so-${disbursement.color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={ink} stopOpacity={0.45} />
              <stop offset="1" stopColor={ink} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10 }} minTickGap={50} />
          <YAxis
            tickFormatter={(v) => formatINRCompact(v).replace('₹', '')}
            tick={{ fontSize: 10 }}
            width={64}
            domain={[0, (max: number) => max * 1.15]}
          />
          <Tooltip content={<TT />} cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }} />

          {/* Rate change verticals */}
          <Customized component={(p: any) => <RateLines disbursement={disbursement} {...p} />} />

          <ReferenceLine x={todayPoint?.date} stroke={TODAY_INK} strokeDasharray="3 3" />
          {todayPoint && (
            <ReferenceDot
              x={todayPoint.date}
              y={todayPoint.outstanding}
              r={4}
              fill={TODAY_INK}
              stroke="rgb(var(--bg-surface))"
              strokeWidth={2}
            />
          )}

          {/* Peak */}
          <ReferenceDot
            x={peakPoint.date}
            y={peakPoint.outstanding}
            r={4}
            fill="rgb(var(--c-gold))"
            stroke="rgb(var(--bg-surface))"
            strokeWidth={2}
          />

          <Area
            type="monotone"
            dataKey="outstanding"
            stroke={ink}
            strokeWidth={1.8}
            fill={`url(#so-${disbursement.color})`}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="readout">
      <div className="etch mb-1.5 !text-[9px]">{fmtDateLong(label)}</div>
      <div className="space-y-0.5">
        <Row k="Outstanding" v={formatINR(p.outstanding)} />
        <Row k="Accrued interest" v={formatINR(p.interestAccrued)} />
        <Row k="Rate at this point" v={formatPercent(p.rate, 2)} />
        {p.srNo > 0 && <Row k="Payment №" v={`${p.srNo}`} />}
      </div>
    </div>
  )
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-ink-tertiary">{k}</span>
    <span className="font-medium tabular text-ink-primary">{v}</span>
  </div>
)

const RateLines = ({ disbursement, xAxisMap, offset }: any) => {
  if (!xAxisMap) return null
  const xKey = Object.keys(xAxisMap)[0]
  const xScale = xAxisMap[xKey].scale
  const top = offset.top
  const bottom = top + offset.height
  return (
    <g>
      {disbursement.rateChanges.map((rc: any) => {
        const x = xScale(rc.date)
        if (x == null || isNaN(x)) return null
        const up = rc.to > rc.from
        const color = up ? 'rgb(var(--c-vermillion))' : 'rgb(var(--c-sage))'
        return (
          <g key={rc.date}>
            <line
              x1={x}
              x2={x}
              y1={top}
              y2={bottom}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.55}
            />
            <foreignObject x={x - 28} y={top + 4} width={56} height={20}>
              <div
                style={{
                  fontSize: 9,
                  textAlign: 'center',
                  color,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {up ? '↑' : '↓'} {rc.to.toFixed(2)}%
              </div>
            </foreignObject>
          </g>
        )
      })}
    </g>
  )
}
