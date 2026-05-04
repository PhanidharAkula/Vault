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

const TONE: Record<string, { stroke: string; gradId: string; gradFrom: string; gradTo: string }> = {
  violet: { stroke: '#a78bfa', gradId: 'soV', gradFrom: '#a78bfa', gradTo: '#a78bfa' },
  cyan: { stroke: '#22d3ee', gradId: 'soC', gradFrom: '#22d3ee', gradTo: '#22d3ee' },
  emerald: { stroke: '#34d399', gradId: 'soE', gradFrom: '#34d399', gradTo: '#34d399' },
}

export const SingleOutstandingChart = ({
  disbursement,
  todayIso,
  height = 280,
}: {
  disbursement: DisbursementView
  todayIso: string
  height?: number
}) => {
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
  const t = TONE[disbursement.color]

  const todayPoint = data.find((d) => d.date >= todayIso)

  const peakIndex = data.reduce((maxI, p, i) => (p.outstanding > data[maxI].outstanding ? i : maxI), 0)
  const peakPoint = data[peakIndex]

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={t.gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={t.gradFrom} stopOpacity={0.55} />
              <stop offset="1" stopColor={t.gradTo} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 11 }} minTickGap={50} />
          <YAxis
            tickFormatter={(v) => formatINRCompact(v).replace('₹', '')}
            tick={{ fontSize: 11 }}
            width={64}
          />
          <Tooltip content={<TT />} cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeDasharray: '4 4' }} />

          {/* Rate change verticals */}
          <Customized
            component={(p: any) => <RateLines disbursement={disbursement} {...p} />}
          />

          <ReferenceLine x={todayPoint?.date} stroke="#f0abfc" strokeDasharray="3 3" />
          {todayPoint && (
            <ReferenceDot
              x={todayPoint.date}
              y={todayPoint.outstanding}
              r={4}
              fill="#f0abfc"
              stroke="#0d0f17"
              strokeWidth={2}
            />
          )}

          {/* Peak */}
          <ReferenceDot
            x={peakPoint.date}
            y={peakPoint.outstanding}
            r={4}
            fill="#fbbf24"
            stroke="#0d0f17"
            strokeWidth={2}
          />

          <Area
            type="monotone"
            dataKey="outstanding"
            stroke={t.stroke}
            strokeWidth={2}
            fill={`url(#${t.gradId})`}
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
    <div className="rounded-xl border border-white/10 bg-bg-elevated/95 px-3 py-2 text-xs backdrop-blur-md shadow-glow">
      <div className="mb-1 font-semibold">{fmtDateLong(label)}</div>
      <div className="space-y-0.5">
        <Row k="Outstanding" v={formatINR(p.outstanding)} />
        <Row k="Accrued interest" v={formatINR(p.interestAccrued)} />
        <Row k="Rate at this point" v={formatPercent(p.rate, 2)} />
        {p.srNo > 0 && <Row k="Payment #" v={`${p.srNo}`} />}
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
        return (
          <g key={rc.date}>
            <line
              x1={x}
              x2={x}
              y1={top}
              y2={bottom}
              stroke={rc.to > rc.from ? '#fb7185' : '#34d399'}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <foreignObject x={x - 28} y={top + 4} width={56} height={20}>
              <div
                style={{
                  fontSize: 10,
                  textAlign: 'center',
                  color: rc.to > rc.from ? '#fb7185' : '#34d399',
                  fontWeight: 600,
                }}
              >
                {rc.to > rc.from ? '↑' : '↓'} {rc.to.toFixed(2)}%
              </div>
            </foreignObject>
          </g>
        )
      })}
    </g>
  )
}
