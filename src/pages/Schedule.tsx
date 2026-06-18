import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { Plate, SectionTitle, Tag, InkSwatch } from '../components/ui/Plate'
import { Stamp } from '../components/ui/decor'
import { DISBURSEMENTS, TRANCHE_VAR } from '../data/loanData'
import type { DisbursementView, SchedulePayment } from '../data/loanData'
import { fmtDate, fmtDateLong, formatRelative } from '../lib/dates'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import { computeAggregate } from '../lib/calculations'
import { useTodayIso } from '../state/today'
import { useCurrency } from '../state/currency'

type Row = { d: DisbursementView; r: SchedulePayment }

const Schedule = () => {
  const todayIso = useTodayIso()
  useCurrency() // subscribe so currency toggle re-renders all formatINR calls
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
    return Object.entries(groups).sort(([a], [b]) => (a < b ? -1 : 1))
  }, [filtered])

  const todayMonth = todayIso.slice(0, 7)

  const nextInterestSum = agg.nextDueRows.reduce((s, x) => s + x.payment.interest, 0)
  const nextPrincipalSum = agg.nextDueRows.reduce((s, x) => s + x.payment.principal, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="gold">Plate 03</Tag>
            <Tag>Master schedule</Tag>
          </div>
          <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight md:text-[36px]">
            Every payment, every tranche<span className="text-vermillion">.</span>
          </h1>
          <p className="mt-1.5 text-xs text-ink-secondary">
            {DISBURSEMENTS.reduce((s, d) => s + d.schedule.length, 0)} planned entries across{' '}
            {DISBURSEMENTS.length} disbursements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="seg">
            {(['date', 'tranche'] as const).map((g) => (
              <button key={g} data-on={groupBy === g} onClick={() => setGroupBy(g)} className="seg-btn capitalize">
                by {g}
              </button>
            ))}
          </div>
          <div className="seg">
            {(['all', 'past', 'future'] as const).map((f) => (
              <button key={f} data-on={filter === f} onClick={() => setFilter(f)} className="seg-btn capitalize">
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Due notice banner - combined across all tranches */}
      {agg.nextDueDate && (
        <Plate pad="lg" tone="gold">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Tag tone="gold">Due notice · combined</Tag>
              <div className="display-num mt-2.5 font-display text-3xl font-medium text-gold">
                {formatINR(agg.nextDueTotal)}
              </div>
              <div className="mt-1 text-[11px] text-ink-secondary">
                {fmtDateLong(agg.nextDueDate)} ·{' '}
                <span className="text-ink-primary">{formatRelative(agg.nextDueDate, todayIso)}</span> ·{' '}
                {agg.nextDueRows.length} tranche{agg.nextDueRows.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BannerCell label="Interest" value={formatINRCompact(nextInterestSum)} accent="text-vermillion" />
              <BannerCell label="Principal" value={formatINRCompact(nextPrincipalSum)} accent="text-sage" />
              {agg.nextDueRows.map((row) => (
                <BannerCell
                  key={row.disbursement.applicationNumber}
                  label={row.disbursement.shortName}
                  value={formatINR(row.payment.paymentDue)}
                  dot={TRANCHE_VAR[row.disbursement.color]}
                />
              ))}
            </div>
          </div>
        </Plate>
      )}

      {groupBy === 'date' ? (
        <Plate pad="lg">
          <SectionTitle
            fig="01"
            eyebrow="Monthly folios"
            title="Combined cashflow by month"
            description="Expand a month to see every entry due in that window across tranches."
            right={<div className="etch">{filtered.length} entries</div>}
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
                <div key={month} className="overflow-hidden border border-line">
                  <button
                    onClick={() => setOpenDate(open ? null : month)}
                    className={clsx(
                      'flex w-full items-center gap-4 px-4 py-3 text-left transition-colors',
                      isCurrent ? 'bg-gold/[0.06]' : 'bg-bg-base hover:bg-ink-primary/[0.025]',
                    )}
                  >
                    <ChevronRight
                      size={16}
                      className={clsx('shrink-0 text-ink-muted transition-transform', open && 'rotate-90')}
                    />
                    <div className="w-32 shrink-0">
                      <div className="text-[9px] uppercase tracking-[0.16em] text-ink-tertiary">
                        {past ? 'settled' : isCurrent ? 'this month' : 'scheduled'}
                      </div>
                      <div className="mt-0.5 text-[13px] font-semibold tracking-wide">
                        {fmtDate(`${month}-01`, 'MMM yyyy')}
                      </div>
                    </div>
                    {/* Mobile keeps only the Due summary inline; the full
                        breakdown is one tap away once the month expands. */}
                    <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-[12px]">
                      <div>
                        <span className="text-ink-tertiary">due </span>
                        <span className="font-semibold tabular">{formatINR(sumDue)}</span>
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-ink-tertiary">int </span>
                        <span className="tabular text-vermillion">{formatINR(sumInt)}</span>
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-ink-tertiary">prin </span>
                        <span className="tabular text-sage">{formatINR(sumPrin)}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        {past && (
                          <Stamp tone="sage" className="hidden !text-[8px] sm:inline-block">
                            settled
                          </Stamp>
                        )}
                        {isCurrent && (
                          <Stamp tone="vermillion" className="hidden !text-[8px] sm:inline-block">
                            current
                          </Stamp>
                        )}
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
                        className="overflow-hidden border-t border-line"
                      >
                        <div className="overflow-x-auto">
                          <div className="min-w-[680px]">
                            <div className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-3 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
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
                                className="grid grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] items-center gap-3 border-t border-line px-4 py-2 text-[12px]"
                              >
                                <div>
                                  <span
                                    className="inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
                                    style={{
                                      color: TRANCHE_VAR[x.d.color],
                                      borderColor: 'var(--line)',
                                    }}
                                  >
                                    <InkSwatch color={TRANCHE_VAR[x.d.color]} className="!h-1.5 !w-1.5" />
                                    {x.d.shortName.replace('Tranche ', 'T')}
                                  </span>
                                </div>
                                <div>
                                  <div className="tabular">{fmtDate(x.r.dueDate)}</div>
                                  <div className="text-[9px] tracking-[0.08em] text-ink-muted">
                                    № {x.r.srNo} · {formatPercent(x.r.rateAtPayment, 2)}
                                  </div>
                                </div>
                                <div className="text-right font-semibold tabular">{formatINR(x.r.paymentDue)}</div>
                                <div className="text-right tabular text-vermillion">{formatINR(x.r.interest)}</div>
                                <div className="text-right tabular text-sage">{formatINR(x.r.principal)}</div>
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
        </Plate>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {DISBURSEMENTS.map((d) => {
            const rows = filtered.filter((x) => x.d.applicationNumber === d.applicationNumber)
            const sumDue = rows.reduce((s, x) => s + x.r.paymentDue, 0)
            const sumInt = rows.reduce((s, x) => s + x.r.interest, 0)
            const sumPrin = rows.reduce((s, x) => s + x.r.principal, 0)
            return (
              <Plate key={d.applicationNumber} pad="lg" tone={d.color}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Tag tone={d.color}>{d.shortName}</Tag>
                    <div className="mt-1.5 text-[11px] tracking-[0.06em] text-ink-secondary">
                      № {d.applicationNumber}
                    </div>
                  </div>
                  <div className="text-right text-[10px] leading-relaxed text-ink-tertiary">
                    {rows.length} entries · {formatINRCompact(sumDue)} total ·{' '}
                    {formatINRCompact(sumInt)} interest ·{' '}
                    {sumPrin > 0 ? `${formatINRCompact(sumPrin)} principal` : 'no principal'}
                  </div>
                </div>
                <div className="overflow-x-auto border border-line">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[56px_120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-3 border-b border-line-strong bg-bg-base px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
                      <div>№</div>
                      <div>Date</div>
                      <div className="text-right">Due</div>
                      <div className="text-right">Interest</div>
                      <div className="text-right">Principal</div>
                      <div className="text-right">Outstanding</div>
                    </div>
                    <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
                      {rows.slice(0, 100).map((x) => (
                        <div
                          key={x.r.srNo}
                          className={clsx(
                            'grid grid-cols-[56px_120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px] items-center gap-3 px-4 py-2 text-[12px]',
                            x.r.dueDate <= todayIso ? 'text-ink-tertiary' : 'text-ink-primary',
                          )}
                        >
                          <div className="text-[10px] tabular text-ink-muted">
                            {String(x.r.srNo).padStart(3, '0')}
                          </div>
                          <div className="tabular">{fmtDate(x.r.dueDate)}</div>
                          <div className="text-right tabular">{formatINR(x.r.paymentDue)}</div>
                          <div className="text-right tabular text-vermillion">{formatINR(x.r.interest)}</div>
                          <div className="text-right tabular text-sage">{formatINR(x.r.principal)}</div>
                          <div className="text-right font-semibold tabular">
                            {formatINRCompact(x.r.totalOutstanding)}
                          </div>
                        </div>
                      ))}
                      {rows.length > 100 && (
                        <div className="px-4 py-3 text-center text-[11px] text-ink-tertiary">
                          First 100 of {rows.length}. Open the tranche file for the full ledger.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Plate>
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
    <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.14em] text-ink-tertiary">
      <span className="font-medium tabular text-ink-secondary">
        {activeIds.size}/{DISBURSEMENTS.length}
      </span>
      <div className="flex items-center gap-1.5">
        {DISBURSEMENTS.map((d) => {
          const active = activeIds.has(d.applicationNumber)
          return (
            <span
              key={d.applicationNumber}
              title={`${d.shortName} (${d.applicationNumber})${active ? ' · active' : ' · not yet disbursed'}`}
              className="h-2 w-2 border border-line"
              style={active ? { background: TRANCHE_VAR[d.color], borderColor: 'transparent' } : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

const BannerCell = ({
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
  <div className="flex min-w-[112px] items-center gap-3 border border-line bg-bg-base px-3 py-2">
    {dot && <InkSwatch color={dot} className="!h-1.5 !w-1.5" />}
    <div>
      <div className="text-[8px] uppercase tracking-[0.18em] text-ink-tertiary">{label}</div>
      <div className={clsx('mt-0.5 text-[12px] font-semibold tabular', accent ?? 'text-ink-primary')}>
        {value}
      </div>
    </div>
  </div>
)

export default Schedule
