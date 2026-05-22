import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtDateShort, fmtDateLong } from '../../lib/dates'
import { formatINR, formatINRCompact } from '../../lib/format'
import type { DisbursementView } from '../../data/loanData'
import { useChartTick } from '../../lib/useChartTick'

export const PaymentBreakdownChart = ({
  disbursement,
  todayIso,
}: {
  disbursement: DisbursementView
  todayIso: string
}) => {
  useChartTick()
  const data = useMemo(
    () =>
      disbursement.schedule.map((r) => ({
        date: r.dueDate,
        srNo: r.srNo,
        interest: r.interest,
        principal: r.principal,
      })),
    [disbursement],
  )

  return (
    <div className="h-[200px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={0} barCategoryGap={0}>
          <defs>
            <linearGradient id="bInt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fb7185" stopOpacity={1} />
              <stop offset="1" stopColor="#fb7185" stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id="bPrin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34d399" stopOpacity={1} />
              <stop offset="1" stopColor="#34d399" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDateShort}
            tick={{ fontSize: 11 }}
            minTickGap={50}
          />
          <YAxis tickFormatter={(v) => formatINRCompact(v).replace('₹', '')} tick={{ fontSize: 11 }} width={64} />
          <Tooltip content={<BTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <ReferenceLine x={data.find((d) => d.date >= todayIso)?.date} stroke="#f0abfc" strokeDasharray="3 3" />
          <Bar dataKey="interest" stackId="a" fill="url(#bInt)" isAnimationActive animationDuration={700}>
            {data.map((_, i) => (
              <Cell key={i} />
            ))}
          </Bar>
          <Bar dataKey="principal" stackId="a" fill="url(#bPrin)" isAnimationActive animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const BTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const interest = payload.find((p: any) => p.dataKey === 'interest')?.value ?? 0
  const principal = payload.find((p: any) => p.dataKey === 'principal')?.value ?? 0
  return (
    <div className="rounded-xl border border-white/10 bg-bg-elevated/95 px-3 py-2 text-xs backdrop-blur-md shadow-glow">
      <div className="mb-1 font-semibold">{fmtDateLong(label)}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink-tertiary">Interest</span>
        <span className="text-accent-rose tabular">{formatINR(interest)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink-tertiary">Principal</span>
        <span className="text-accent-emerald tabular">{formatINR(principal)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-white/10 pt-1">
        <span className="text-ink-secondary">EMI</span>
        <span className="font-semibold tabular">{formatINR(interest + principal)}</span>
      </div>
    </div>
  )
}
