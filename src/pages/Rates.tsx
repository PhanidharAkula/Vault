import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Plate, SectionTitle, Tag, InkSwatch } from '../components/ui/Plate'
import { DISBURSEMENTS, TRANCHE_VAR } from '../data/loanData'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'
import { fmtDateLong } from '../lib/dates'
import { formatPercent } from '../lib/format'
import { useChartTick } from '../lib/useChartTick'
import { parseISO, format } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import clsx from 'clsx'

type Event = { date: string; disb: number; from: number; to: number; rate: number }

const INK = DISBURSEMENTS.map((d) => TRANCHE_VAR[d.color])

const Rates = () => {
  useChartTick()
  const todayIso = useTodayIso()
  useCurrency() // subscribe so currency toggle re-renders rate-derived values

  const allEvents: Event[] = useMemo(() => {
    const list: Event[] = []
    DISBURSEMENTS.forEach((d, i) => {
      d.ratePeriods.forEach((rp, j) => {
        const prev = j === 0 ? rp.rateOfInterest : d.ratePeriods[j - 1].rateOfInterest
        list.push({
          date: rp.activeStartDate,
          disb: i,
          from: prev,
          to: rp.rateOfInterest,
          rate: rp.rateOfInterest,
        })
      })
    })
    return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }, [])

  // Build month-by-month chart series for each disbursement
  const chartData = useMemo(() => {
    const start = '2024-07'
    const end = '2038-08'
    const months: string[] = []
    let cur = parseISO(start + '-01')
    const last = parseISO(end + '-01')
    while (cur <= last) {
      months.push(format(cur, 'yyyy-MM'))
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return months.map((m) => {
      const point: Record<string, number | string> = { date: `${m}-01` }
      DISBURSEMENTS.forEach((d, i) => {
        const dateIso = `${m}-11`
        let active = d.ratePeriods[0]
        if (dateIso < d.disbursedDate) {
          point[`d${i}`] = NaN as unknown as number
          return
        }
        for (let j = d.ratePeriods.length - 1; j >= 0; j--) {
          if (d.ratePeriods[j].activeStartDate <= dateIso) {
            active = d.ratePeriods[j]
            break
          }
        }
        point[`d${i}`] = active.rateOfInterest
      })
      return point
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="gold">Plate 04</Tag>
          <Tag>Rate registry</Tag>
        </div>
        <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-[36px]">
          The price of money, over time<span className="text-vermillion">.</span>
        </h1>
        <p className="mt-1.5 text-xs text-ink-secondary">
          Every revision the lender has made across all {DISBURSEMENTS.length} disbursements.
        </p>
      </div>

      <Plate pad="lg">
        <SectionTitle
          fig="01"
          eyebrow="Time series"
          title="Active rate, month by month"
          description="Each step-line follows one tranche through every revision. The vermillion needle is today."
        />
        <div className="h-[210px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(parseISO(d), "MMM ''yy")}
                tick={{ fontSize: 10 }}
                minTickGap={50}
              />
              <YAxis domain={[10.5, 12]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} width={48} />
              <Tooltip content={<RateTT />} />
              <ReferenceLine
                x={`${todayIso.slice(0, 7)}-01`}
                stroke="rgb(var(--c-vermillion))"
                strokeDasharray="3 3"
              />
              {DISBURSEMENTS.map((d, i) => (
                <Line
                  key={d.applicationNumber}
                  type="stepAfter"
                  dataKey={`d${i}`}
                  stroke={INK[i]}
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 3.5, stroke: 'rgb(var(--bg-surface))', strokeWidth: 1.5 }}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={900}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px]">
          {DISBURSEMENTS.map((d, i) => (
            <div key={d.applicationNumber} className="flex items-center gap-2 text-ink-secondary">
              <InkSwatch color={INK[i]} />
              <span className="tracking-[0.06em] text-ink-tertiary">{d.applicationNumber}</span>
            </div>
          ))}
        </div>
      </Plate>

      {/* Registry */}
      <Plate pad="lg">
        <SectionTitle
          fig="02"
          eyebrow="Audit trail"
          title="Every revision ever applied"
          description="Each entry records which tranche was repriced and how the rate moved."
          right={<div className="etch">{allEvents.length} entries</div>}
        />
        <div className="divide-y divide-line border border-line">
          {allEvents.map((ev, i) => {
            const delta = ev.to - ev.from
            const isInitial = ev.from === ev.to
            const Glyph = isInitial ? Minus : delta > 0 ? ArrowUp : ArrowDown
            const color = isInitial ? 'text-ink-tertiary' : delta > 0 ? 'text-vermillion' : 'text-sage'
            const past = ev.date <= todayIso
            return (
              <motion.div
                key={`${ev.disb}-${ev.date}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
                className={clsx(
                  'relative flex items-center gap-4 bg-bg-base px-4 py-3',
                  !past && 'opacity-80',
                )}
              >
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 top-0 w-[2px]"
                  style={{ background: INK[ev.disb] }}
                />
                <div className="w-7 shrink-0 text-center text-[10px] tabular text-ink-muted">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className={clsx('flex w-5 shrink-0 justify-center', color)}>
                  <Glyph size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-ink-tertiary">
                    {fmtDateLong(ev.date)}
                  </div>
                  <div className="mt-0.5 break-words text-[12px]">
                    <span className="tracking-[0.04em] text-ink-secondary">
                      {DISBURSEMENTS[ev.disb].applicationNumber}
                    </span>{' '}
                    <span className="text-ink-tertiary">{isInitial ? 'opened at' : 'revised to'}</span>{' '}
                    <span className="font-semibold tabular text-ink-primary">{formatPercent(ev.to, 2)}</span>
                  </div>
                </div>
                {/* From → To breakdown - hidden on narrow screens. */}
                <div className="hidden text-right sm:block">
                  {!isInitial ? (
                    <>
                      <div className="text-[9px] uppercase tracking-[0.16em] text-ink-tertiary">from → to</div>
                      <div className="mt-0.5 text-[12px]">
                        <span className="tabular text-ink-secondary">{formatPercent(ev.from, 2)}</span>{' '}
                        <span className="text-ink-muted">→</span>{' '}
                        <span className={clsx('tabular font-semibold', color)}>{formatPercent(ev.to, 2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[9px] uppercase tracking-[0.16em] text-ink-tertiary">
                      disbursement opens
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </Plate>
    </div>
  )
}

const RateTT = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="readout">
      <div className="etch mb-1.5 !text-[9px]">{format(parseISO(label), 'MMM yyyy')}</div>
      {payload.map((p: any, i: number) =>
        p.value && !isNaN(p.value) ? (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-2 w-2" style={{ background: INK[i] }} />
              <span className="text-ink-tertiary">{DISBURSEMENTS[i].applicationNumber}</span>
            </div>
            <span className="font-semibold tabular text-ink-primary">{formatPercent(p.value, 2)}</span>
          </div>
        ) : null,
      )}
    </div>
  )
}

export default Rates
