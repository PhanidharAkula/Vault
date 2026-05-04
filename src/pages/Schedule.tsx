import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { CalendarClock, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { GlassCard, Pill, SectionTitle } from '../components/ui/GlassCard'
import { DISBURSEMENTS } from '../data/loanData'
import type { DisbursementView, SchedulePayment } from '../data/loanData'
import { fmtDate, fmtDateLong, formatRelative } from '../lib/dates'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import { computeAggregate } from '../lib/calculations'
import { useTodayIso } from '../state/today'

type Row = { d: DisbursementView; r: SchedulePayment }

const Schedule = () => {
  const todayIso = useTodayIso()
  const agg = useMemo(() => computeAggregate(todayIso), [todayIso])
  const [groupBy, setGroupBy] = useState<'date' | 'tranche'>('date')
  const [filter, setFilter] = useState<'all' | 'past' | 'future'>('all')
  const [openDate, setOpenDate] = useState<string | null>(null)

  // Combine all payments
  const all: Row[] = useMemo(() => {
    const rows: Row[] = []
    for (const d of DISBURSEMENTS) for (const r of d.schedule) rows.push({ d, r })
    return rows
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'past') return all.filter((x) => x.r.dueDate <= todayIso)
    if (filter === 'future') return all.filter((x) => x.r.dueDate > todayIso)
    return all
  }, [all, filter, todayIso])

  // Group by month for "date" view
  const byMonth = useMemo(() => {
    const groups: Record<string, Row[]> = {}
    for (const x of filtered) {
      const key = x.r.dueDate.slice(0, 7) // YYYY-MM
      groups[key] = groups[key] ?? []
      groups[key].push(x)
    }
    const sorted = Object.entries(groups).sort(([a], [b]) => (a < b ? -1 : 1))
    return sorted
  }, [filtered])

  const todayMonth = todayIso.slice(0, 7)

  const nextInterestSum = agg.nextDueRows.reduce((s, x) => s + x.payment.interest, 0)
  const nextPrincipalSum = agg.nextDueRows.reduce((s, x) => s + x.payment.principal, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Pill>Master schedule</Pill>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            All payments, every tranche
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {DISBURSEMENTS.reduce((s, d) => s + d.schedule.length, 0)} planned payments across{' '}
            {DISBURSEMENTS.length} disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-white/[0.06] bg-bg-elevated/60 p-0.5 text-xs">
            {(['date', 'tranche'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={clsx(
                  'relative rounded-full px-3 py-1 capitalize transition',
                  groupBy === g ? 'text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
                )}
              >
                {groupBy === g && (
                  <motion.div
                    layoutId="grpBg"
                    className="absolute inset-0 -z-10 rounded-full bg-white/[0.06]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Group by {g}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-full border border-white/[0.06] bg-bg-elevated/60 p-0.5 text-xs">
            {(['all', 'past', 'future'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'relative rounded-full px-3 py-1 capitalize transition',
                  filter === f ? 'text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
                )}
              >
                {filter === f && (
                  <motion.div
                    layoutId="fltBg"
                    className="absolute inset-0 -z-10 rounded-full bg-white/[0.06]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Next due banner — combined across all tranches */}
      {agg.nextDueDate && (
        <GlassCard pad="lg" tone="emerald">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-emerald/15 text-accent-emerald ring-1 ring-accent-emerald/30">
                <CalendarClock size={20} />
              </div>
              <div>
                <Pill tone="emerald">Next due · combined</Pill>
                <div className="mt-2 font-display text-3xl font-semibold tabular gradient-text-emerald">
                  {formatINR(agg.nextDueTotal)}
                </div>
                <div className="mt-0.5 text-sm text-ink-secondary">
                  {fmtDateLong(agg.nextDueDate)} ·{' '}
                  <span className="text-ink-primary">{formatRelative(agg.nextDueDate, todayIso)}</span> ·{' '}
                  {agg.nextDueRows.length} tranche{agg.nextDueRows.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Stat label="Interest" value={formatINRCompact(nextInterestSum)} accent="text-accent-rose" />
              <Stat
                label="Principal"
                value={formatINRCompact(nextPrincipalSum)}
                accent="text-accent-emerald"
              />
              {agg.nextDueRows.map((row) => (
                <Stat
                  key={row.disbursement.applicationNumber}
                  label={row.disbursement.shortName}
                  value={formatINR(row.payment.paymentDue)}
                  dot={
                    row.disbursement.color === 'violet'
                      ? 'bg-accent-violet'
                      : row.disbursement.color === 'cyan'
                        ? 'bg-accent-cyan'
                        : 'bg-accent-emerald'
                  }
                />
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {groupBy === 'date' ? (
        <GlassCard pad="lg">
          <SectionTitle
            eyebrow="Monthly groups"
            title="Combined cashflow by month"
            description="Click a month to expand all payments due in that window across tranches."
            right={
              <div className="flex items-center gap-1.5 text-[11px] text-ink-tertiary">
                <Filter size={12} /> {filtered.length} payments
              </div>
            }
          />
          <div className="space-y-2">
            {byMonth.map(([month, rows]) => {
              const sumDue = rows.reduce((s, x) => s + x.r.paymentDue, 0)
              const sumInt = rows.reduce((s, x) => s + x.r.interest, 0)
              const sumPrin = rows.reduce((s, x) => s + x.r.principal, 0)
              const past = month < todayMonth
              const isCurrent = month === todayMonth
              const open = openDate === month
              return (
                <div key={month} className="overflow-hidden rounded-xl border border-white/[0.05]">
                  <button
                    onClick={() => setOpenDate(open ? null : month)}
                    className={clsx(
                      'flex w-full items-center gap-4 px-4 py-3 text-left transition',
                      isCurrent ? 'bg-accent-emerald/[0.04]' : 'bg-bg-elevated/30 hover:bg-white/[0.02]',
                    )}
                  >
                    {open ? (
                      <ChevronDown size={14} className="text-ink-tertiary" />
                    ) : (
                      <ChevronRight size={14} className="text-ink-tertiary" />
                    )}
                    <div className="w-32">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-tertiary">
                        {past ? 'paid' : isCurrent ? 'this month' : 'scheduled'}
                      </div>
                      <div className="font-medium">
                        {fmtDate(`${month}-01`, 'MMM yyyy')}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-ink-tertiary">Due: </span>
                        <span className="font-semibold tabular">{formatINR(sumDue)}</span>
                      </div>
                      <div>
                        <span className="text-ink-tertiary">Interest: </span>
                        <span className="text-accent-rose tabular">{formatINR(sumInt)}</span>
                      </div>
                      <div>
                        <span className="text-ink-tertiary">Principal: </span>
                        <span className="text-accent-emerald tabular">
                          {formatINR(sumPrin)}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <TrancheChips activeRows={rows} />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-white/[0.05]"
                      >
                       <div className="overflow-x-auto">
                        <div className="min-w-[680px]">
                        <div className="grid grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
                          <div>Tranche</div>
                          <div>Date</div>
                          <div className="text-right">Due</div>
                          <div className="text-right">Interest</div>
                          <div className="text-right">Principal</div>
                          <div className="text-right">Outstanding</div>
                        </div>
                        {rows.map((x, i) => (
                          <motion.div
                            key={x.d.applicationNumber + x.r.srNo}
                            initial={{ opacity: 0, y: -3 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: i * 0.02 }}
                            className="grid grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] items-center gap-3 px-4 py-2 text-sm border-t border-white/[0.03]"
                          >
                            <div>
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                  x.d.color === 'violet' &&
                                    'border-accent-violet/30 bg-accent-violet/10 text-accent-violet',
                                  x.d.color === 'cyan' &&
                                    'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan',
                                  x.d.color === 'emerald' &&
                                    'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                                )}
                              >
                                {x.d.shortName}
                              </span>
                            </div>
                            <div>
                              <div>{fmtDate(x.r.dueDate)}</div>
                              <div className="text-[10px] text-ink-tertiary">
                                #{x.r.srNo} · {formatPercent(x.r.rateAtPayment, 2)}
                              </div>
                            </div>
                            <div className="text-right font-medium tabular">
                              {formatINR(x.r.paymentDue)}
                            </div>
                            <div className="text-right tabular text-accent-rose">
                              {formatINR(x.r.interest)}
                            </div>
                            <div className="text-right tabular text-accent-emerald">
                              {formatINR(x.r.principal)}
                            </div>
                            <div className="text-right font-semibold tabular">
                              {formatINRCompact(x.r.totalOutstanding)}
                            </div>
                          </motion.div>
                        ))}
                        </div>
                       </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {DISBURSEMENTS.map((d) => {
            const rows = filtered.filter((x) => x.d.applicationNumber === d.applicationNumber)
            const sumDue = rows.reduce((s, x) => s + x.r.paymentDue, 0)
            const sumInt = rows.reduce((s, x) => s + x.r.interest, 0)
            const sumPrin = rows.reduce((s, x) => s + x.r.principal, 0)
            return (
              <GlassCard key={d.applicationNumber} pad="lg" tone={d.color}>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <Pill tone={d.color}>{d.shortName}</Pill>
                    <div className="mt-1 font-mono text-sm text-ink-secondary">
                      {d.applicationNumber}
                    </div>
                  </div>
                  <div className="text-right text-xs text-ink-tertiary">
                    {rows.length} payments · {formatINRCompact(sumDue)} total ·{' '}
                    {formatINRCompact(sumInt)} interest ·{' '}
                    {sumPrin > 0 ? formatINRCompact(sumPrin) : 'no principal'}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[60px_120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
                      <div>#</div>
                      <div>Date</div>
                      <div className="text-right">Due</div>
                      <div className="text-right">Interest</div>
                      <div className="text-right">Principal</div>
                      <div className="text-right">Outstanding</div>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.03]">
                      {rows.slice(0, 100).map((x) => (
                        <div
                          key={x.r.srNo}
                          className={clsx(
                            'grid grid-cols-[60px_120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] items-center gap-3 px-4 py-2 text-sm',
                            x.r.dueDate <= todayIso ? 'text-ink-secondary' : 'text-ink-primary',
                          )}
                        >
                          <div className="font-mono text-[11px] text-ink-tertiary">{x.r.srNo}</div>
                          <div>{fmtDate(x.r.dueDate)}</div>
                          <div className="text-right tabular">{formatINR(x.r.paymentDue)}</div>
                          <div className="text-right tabular text-accent-rose">
                            {formatINR(x.r.interest)}
                          </div>
                          <div className="text-right tabular text-accent-emerald">
                            {formatINR(x.r.principal)}
                          </div>
                          <div className="text-right font-semibold tabular">
                            {formatINRCompact(x.r.totalOutstanding)}
                          </div>
                        </div>
                      ))}
                      {rows.length > 100 && (
                        <div className="px-4 py-3 text-center text-xs text-ink-tertiary">
                          Showing first 100 of {rows.length}. Open the tranche page for full schedule.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TrancheChips = ({ activeRows }: { activeRows: Row[] }) => {
  const activeIds = new Set(activeRows.map((r) => r.d.applicationNumber))
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
      <span className="font-medium tabular text-ink-secondary">
        {activeIds.size}/{DISBURSEMENTS.length} active
      </span>
      <div className="flex items-center gap-1.5">
        {DISBURSEMENTS.map((d) => {
          const active = activeIds.has(d.applicationNumber)
          return (
            <span
              key={d.applicationNumber}
              title={`${d.shortName} (${d.applicationNumber})${active ? ' · active' : ' · not yet disbursed'}`}
              className={clsx(
                'h-2 w-2 rounded-full ring-1 transition',
                active
                  ? d.color === 'violet'
                    ? 'bg-accent-violet ring-accent-violet/40'
                    : d.color === 'cyan'
                      ? 'bg-accent-cyan ring-accent-cyan/40'
                      : 'bg-accent-emerald ring-accent-emerald/40'
                  : 'bg-white/[0.06] ring-white/[0.08]',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

const Stat = ({
  label,
  value,
  accent,
  dot,
}: {
  label: string
  value: string
  accent?: string
  dot?: string
}) => (
  <div className="flex min-w-[112px] items-center gap-3 rounded-xl border border-white/[0.06] bg-bg-elevated/50 px-3 py-2">
    {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dot)} />}
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">{label}</div>
      <div className={clsx('mt-0.5 font-semibold tabular', accent ?? 'text-ink-primary')}>{value}</div>
    </div>
  </div>
)

export default Schedule
