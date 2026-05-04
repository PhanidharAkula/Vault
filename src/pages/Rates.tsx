import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { GlassCard, Pill, SectionTitle } from '../components/ui/GlassCard'
import { DISBURSEMENTS } from '../data/loanData'
import { useTodayIso } from '../state/today'
import { fmtDateLong } from '../lib/dates'
import { formatPercent } from '../lib/format'
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

const COLORS = ['#a78bfa', '#22d3ee', '#34d399']

const Rates = () => {
  const todayIso = useTodayIso()

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
        // find rate active on dateIso
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
        <Pill>Rate intelligence</Pill>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Interest rate timeline
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Every revision the lender has made across all three disbursements.
        </p>
      </div>

      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Time series"
          title="Active rate, month by month"
          description="Each line follows one tranche through every revision. Pink line is today."
        />
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(parseISO(d), "MMM ''yy")}
                tick={{ fontSize: 11 }}
                minTickGap={50}
              />
              <YAxis
                domain={[10.5, 12]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                width={48}
              />
              <Tooltip content={<RateTT />} />
              <ReferenceLine x={`${todayIso.slice(0, 7)}-01`} stroke="#f0abfc" strokeDasharray="3 3" />
              {DISBURSEMENTS.map((d, i) => (
                <Line
                  key={d.applicationNumber}
                  type="stepAfter"
                  dataKey={`d${i}`}
                  stroke={COLORS[i]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={900}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          {DISBURSEMENTS.map((d, i) => (
            <div key={d.applicationNumber} className="flex items-center gap-2 text-ink-secondary">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
              <span className="font-mono text-ink-tertiary">{d.applicationNumber}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Event log */}
      <GlassCard pad="lg">
        <SectionTitle
          eyebrow="Audit trail"
          title="Every rate change ever applied"
          description="Each event shows which tranche was updated and how the rate moved."
        />
        <div className="space-y-2.5">
          {allEvents.map((ev, i) => {
            const delta = ev.to - ev.from
            const isInitial = ev.from === ev.to
            const Icon = isInitial ? Minus : delta > 0 ? ArrowUp : ArrowDown
            const color = isInitial ? 'text-ink-tertiary' : delta > 0 ? 'text-accent-rose' : 'text-accent-emerald'
            const past = ev.date <= todayIso
            return (
              <motion.div
                key={`${ev.disb}-${ev.date}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className={clsx(
                  'flex items-center gap-4 rounded-xl border border-white/[0.05] bg-bg-elevated/40 px-4 py-3',
                  !past && 'opacity-90',
                )}
              >
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{ background: `${COLORS[ev.disb]}22`, color: COLORS[ev.disb] }}
                >
                  <Icon size={16} className={color} />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-ink-tertiary">
                    {fmtDateLong(ev.date)}
                  </div>
                  <div className="mt-0.5 text-sm">
                    <span className="font-mono text-ink-secondary">
                      {DISBURSEMENTS[ev.disb].applicationNumber}
                    </span>{' '}
                    {isInitial ? 'opened at' : 'rate revised to'}{' '}
                    <span className="font-semibold text-ink-primary tabular">
                      {formatPercent(ev.to, 2)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {!isInitial && (
                    <>
                      <div className="text-[11px] text-ink-tertiary">From → To</div>
                      <div className="font-mono text-sm">
                        <span className="text-ink-secondary tabular">
                          {formatPercent(ev.from, 2)}
                        </span>{' '}
                        <span className="text-ink-tertiary">→</span>{' '}
                        <span className={clsx('tabular', color)}>{formatPercent(ev.to, 2)}</span>
                      </div>
                    </>
                  )}
                  {isInitial && (
                    <div className="text-[11px] text-ink-tertiary">Disbursement opens</div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}

const RateTT = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-bg-elevated/95 px-3 py-2 text-xs backdrop-blur-md shadow-glow">
      <div className="mb-1 font-semibold">{format(parseISO(label), 'MMM yyyy')}</div>
      {payload.map((p: any, i: number) =>
        p.value && !isNaN(p.value) ? (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
              <span className="font-mono text-ink-tertiary">
                {DISBURSEMENTS[i].applicationNumber}
              </span>
            </div>
            <span className="font-semibold tabular">{formatPercent(p.value, 2)}</span>
          </div>
        ) : null,
      )}
    </div>
  )
}

export default Rates
