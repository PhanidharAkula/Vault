import { useMemo, useState } from 'react'
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
import { DISBURSEMENTS, TRANCHE_VAR } from '../../data/loanData'
import { buildCombinedTimeline } from '../../lib/calculations'
import { fmtDateShort, fmtDateLong } from '../../lib/dates'
import { formatINRCompact, formatINR } from '../../lib/format'
import { useChartTick } from '../../lib/useChartTick'

type Mode = 'total' | 'stacked'

const INK = DISBURSEMENTS.map((d) => TRANCHE_VAR[d.color])
const TODAY_INK = 'rgb(var(--c-vermillion))'

export const OutstandingTimeline = ({ todayIso }: { todayIso: string }) => {
  useChartTick()
  const [mode, setMode] = useState<Mode>('stacked')
  const data = useMemo(() => buildCombinedTimeline(), [])

  const todayData = data.find((d) => d.date >= todayIso)

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="etch">Outstanding · past, present &amp; future</div>
        <div className="seg w-fit">
          {(['stacked', 'total'] as const).map((m) => (
            <button type="button" key={m} data-on={mode === m} onClick={() => setMode(m)} className="seg-btn capitalize">
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {DISBURSEMENTS.map((d, i) => (
                <linearGradient key={d.applicationNumber} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={INK[i]} stopOpacity={0.5} />
                  <stop offset="1" stopColor={INK[i]} stopOpacity={0.04} />
                </linearGradient>
              ))}
              <linearGradient id="gtotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgb(var(--c-gold))" stopOpacity={0.45} />
                <stop offset="1" stopColor="rgb(var(--c-gold))" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10 }} minTickGap={42} />
            <YAxis
              tickFormatter={(v) => formatINRCompact(v).replace('₹', '')}
              tick={{ fontSize: 10 }}
              width={64}
              /* Pad the top of the scale ~15% so the peak doesn't sit flush
                 against the chart's top edge. */
              domain={[0, (max: number) => max * 1.15]}
            />
            <Tooltip
              content={<TimelineTooltip mode={mode} />}
              cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
            />

            {/* Rate-change markers */}
            <Customized component={RateChangeMarkers as never} />

            {/* Today */}
            <ReferenceLine x={todayData?.date} stroke={TODAY_INK} strokeDasharray="3 3" strokeWidth={1.2} />
            {todayData && (
              <ReferenceDot
                x={todayData.date}
                y={todayData.total}
                r={4}
                fill={TODAY_INK}
                stroke="rgb(var(--bg-surface))"
                strokeWidth={2}
              />
            )}

            {mode === 'stacked' ? (
              DISBURSEMENTS.map((d, i) => (
                <Area
                  key={d.applicationNumber}
                  type="monotone"
                  dataKey={`d${i}`}
                  stackId="1"
                  stroke={INK[i]}
                  strokeWidth={1.4}
                  fill={`url(#g${i})`}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey="total"
                stroke="rgb(var(--c-gold))"
                strokeWidth={1.8}
                fill="url(#gtotal)"
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px]">
        {DISBURSEMENTS.map((d, i) => (
          <div key={d.applicationNumber} className="flex items-center gap-2 text-ink-secondary">
            <span aria-hidden className="h-2 w-2" style={{ background: INK[i] }} />
            <span className="tracking-[0.06em] text-ink-tertiary">{d.applicationNumber}</span>
            <span className="tabular">· {formatINRCompact(d.disbursedAmount)}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-vermillion">
          <span aria-hidden className="inline-block h-[9px] w-px bg-vermillion" />
          today
        </div>
      </div>
    </div>
  )
}

const TimelineTooltip = ({ active, payload, label, mode }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="readout">
      <div className="etch mb-1.5 !text-[9px]">{fmtDateLong(label)}</div>
      {mode === 'stacked' &&
        payload.map((p: any, i: number) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-2 w-2" style={{ background: INK[i] }} />
              <span className="text-ink-tertiary">{DISBURSEMENTS[i].applicationNumber}</span>
            </div>
            <div className="font-semibold tabular text-ink-primary">{formatINR(p.value)}</div>
          </div>
        ))}
      {mode === 'total' && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-ink-tertiary">Total</span>
          <span className="font-semibold tabular text-ink-primary">{formatINR(payload[0].value)}</span>
        </div>
      )}
    </div>
  )
}

// Custom-painted markers showing rate changes per loan along the timeline
const RateChangeMarkers = ({ xAxisMap, yAxisMap }: any) => {
  if (!xAxisMap || !yAxisMap) return null
  const xKey = Object.keys(xAxisMap)[0]
  const yKey = Object.keys(yAxisMap)[0]
  const xScale = xAxisMap[xKey].scale
  const yScale = yAxisMap[yKey].scale

  return (
    <g>
      {DISBURSEMENTS.map((d, i) =>
        d.rateChanges.map((rc) => {
          const x = xScale(rc.date)
          if (x == null || isNaN(x)) return null
          const row = d.schedule.find((r) => r.dueDate >= rc.date)
          if (!row) return null
          const y = yScale(row.totalOutstanding)
          if (y == null || isNaN(y)) return null
          return (
            <g key={`${d.applicationNumber}-${rc.date}`}>
              <line x1={x} x2={x} y1={y - 6} y2={y + 6} stroke={INK[i]} strokeWidth={1.4} opacity={0.8} />
              <circle cx={x} cy={y} r={2.6} fill={INK[i]} stroke="rgb(var(--bg-surface))" strokeWidth={1.4} />
            </g>
          )
        }),
      )}
    </g>
  )
}
