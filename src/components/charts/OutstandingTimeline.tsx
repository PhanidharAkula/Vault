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
import { motion } from 'framer-motion'
import { DISBURSEMENTS } from '../../data/loanData'
import { buildCombinedTimeline } from '../../lib/calculations'
import { fmtDateShort, fmtDateLong } from '../../lib/dates'
import { formatINRCompact, formatINR } from '../../lib/format'
import { useChartTick } from '../../lib/useChartTick'

type Mode = 'total' | 'stacked'

const COLOR = ['#a78bfa', '#22d3ee', '#34d399', '#f472b6']

export const OutstandingTimeline = ({ todayIso }: { todayIso: string }) => {
  useChartTick()
  const [mode, setMode] = useState<Mode>('stacked')
  const data = useMemo(() => buildCombinedTimeline(), [])

  const todayData = data.find((d) => d.date >= todayIso)

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
          Outstanding · Past, present & future
        </div>
        <div className="flex w-fit items-center rounded-full border border-white/[0.06] bg-bg-elevated/60 p-0.5 text-xs">
          {(['stacked', 'total'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative rounded-full px-3 py-1 capitalize transition ${
                mode === m ? 'text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary'
              }`}
            >
              {mode === m && (
                <motion.div
                  layoutId="modeBg"
                  className="absolute inset-0 -z-10 rounded-full bg-white/[0.06]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {/* One vertical fill gradient per tranche, generated from the
                  DISBURSEMENTS list so new tranches automatically pick up a
                  matching fill (previously the 4th tranche had only a stroke
                  because `g3` wasn't declared here). */}
              {DISBURSEMENTS.map((d, i) => (
                <linearGradient key={d.applicationNumber} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={COLOR[i]} stopOpacity={0.6} />
                  <stop offset="1" stopColor={COLOR[i]} stopOpacity={0} />
                </linearGradient>
              ))}
              <linearGradient id="gtotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#818cf8" stopOpacity={0.55} />
                <stop offset="1" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDateShort}
              tick={{ fontSize: 11 }}
              minTickGap={42}
            />
            <YAxis
              tickFormatter={(v) => formatINRCompact(v).replace('₹', '')}
              tick={{ fontSize: 11 }}
              width={64}
              /* Pad the top of the scale by ~15% so the peak of the area
                 doesn't sit flush against the chart's top edge - there's a
                 tick mark above the data's max for breathing room. */
              domain={[0, (max: number) => max * 1.15]}
            />
            <Tooltip content={<TimelineTooltip mode={mode} />} cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeDasharray: '4 4' }} />

            {/* Rate-change markers */}
            <Customized component={RateChangeMarkers as any} />

            {/* Today */}
            <ReferenceLine x={todayData?.date} stroke="#f0abfc" strokeDasharray="3 3" strokeWidth={1.4}>
            </ReferenceLine>
            {todayData && (
              <ReferenceDot
                x={todayData.date}
                y={todayData.total}
                r={4}
                fill="#f0abfc"
                stroke="#0d0f17"
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
                  stroke={COLOR[i]}
                  strokeWidth={1.6}
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
                stroke="#a5b4fc"
                strokeWidth={2}
                fill="url(#gtotal)"
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {DISBURSEMENTS.map((d, i) => (
          <div key={d.applicationNumber} className="flex items-center gap-2 text-ink-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR[i] }} />
            <span className="font-mono text-ink-tertiary">{d.applicationNumber}</span>
            <span>· {formatINRCompact(d.disbursedAmount)}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-ink-tertiary">
          <span className="h-2 w-2 rounded-full bg-accent-pink" />
          Today
        </div>
      </div>
    </div>
  )
}

const TimelineTooltip = ({ active, payload, label, mode }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-bg-elevated/95 px-3 py-2 text-xs backdrop-blur-md shadow-glow">
      <div className="mb-1 font-semibold text-ink-primary">{fmtDateLong(label)}</div>
      {mode === 'stacked' &&
        payload.map((p: any, i: number) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLOR[i] }} />
              <span className="font-mono text-ink-tertiary">{DISBURSEMENTS[i].applicationNumber}</span>
            </div>
            <div className="font-semibold text-ink-primary tabular">{formatINR(p.value)}</div>
          </div>
        ))}
      {mode === 'total' && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-tertiary">Total</span>
          <span className="font-semibold text-ink-primary tabular">{formatINR(payload[0].value)}</span>
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
              <line
                x1={x}
                x2={x}
                y1={y - 6}
                y2={y + 6}
                stroke={COLOR[i]}
                strokeWidth={1.5}
                opacity={0.75}
              />
              <circle cx={x} cy={y} r={3} fill={COLOR[i]} stroke="#0d0f17" strokeWidth={1.5} />
            </g>
          )
        }),
      )}
    </g>
  )
}
