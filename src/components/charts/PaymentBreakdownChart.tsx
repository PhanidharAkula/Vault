import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10 }} minTickGap={50} />
          <YAxis
            tickFormatter={(v) => formatINRCompact(v).replace('₹', '')}
            tick={{ fontSize: 10 }}
            width={64}
          />
          <Tooltip content={<BTooltip />} cursor={{ fill: 'var(--chart-grid)' }} />
          <ReferenceLine
            x={data.find((d) => d.date >= todayIso)?.date}
            stroke="rgb(var(--c-vermillion))"
            strokeDasharray="3 3"
          />
          <Bar
            dataKey="interest"
            stackId="a"
            fill="rgb(var(--c-vermillion))"
            fillOpacity={0.75}
            isAnimationActive
            animationDuration={700}
          />
          <Bar
            dataKey="principal"
            stackId="a"
            fill="rgb(var(--c-sage))"
            fillOpacity={0.85}
            isAnimationActive
            animationDuration={700}
          />
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
    <div className="readout">
      <div className="etch mb-1.5 !text-[9px]">{fmtDateLong(label)}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink-tertiary">Interest</span>
        <span className="tabular text-vermillion">{formatINR(interest)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink-tertiary">Principal</span>
        <span className="tabular text-sage">{formatINR(principal)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-line pt-1">
        <span className="text-ink-secondary">Payment</span>
        <span className="font-semibold tabular text-ink-primary">{formatINR(interest + principal)}</span>
      </div>
    </div>
  )
}
