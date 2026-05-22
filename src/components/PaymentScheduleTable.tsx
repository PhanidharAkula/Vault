import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'
import type { DisbursementView, SchedulePayment } from '../data/loanData'
import { fmtDate } from '../lib/dates'
import { formatINR, formatPercent } from '../lib/format'

type Filter = 'all' | 'past' | 'future' | 'pre-emi' | 'emi'

export const PaymentScheduleTable = ({
  disbursement,
  todayIso,
  pageSize = 14,
}: {
  disbursement: DisbursementView
  todayIso: string
  pageSize?: number
}) => {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let rows: SchedulePayment[] = disbursement.schedule
    if (filter === 'past') rows = rows.filter((r) => r.dueDate <= todayIso)
    if (filter === 'future') rows = rows.filter((r) => r.dueDate > todayIso)
    if (filter === 'pre-emi') rows = rows.filter((r) => r.principal === 0)
    if (filter === 'emi') rows = rows.filter((r) => r.principal > 0)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          String(r.srNo).includes(q) ||
          r.dueDate.includes(q) ||
          fmtDate(r.dueDate).toLowerCase().includes(q),
      )
    }
    return rows
  }, [disbursement, todayIso, filter, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  // Auto-jump to the page containing today's next-due payment whenever the
  // tranche or filter changes. Runs as an effect (not in the render body) so
  // the setState happens after the render has committed.
  useEffect(() => {
    const idx = filtered.findIndex((r) => r.dueDate >= todayIso)
    if (idx >= 0) setPage(Math.floor(idx / pageSize))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disbursement.applicationNumber, filter])

  return (
    <div>
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
          <Filter size={12} />
          Filter
        </div>
        <div className="flex items-center rounded-full border border-white/[0.06] bg-bg-elevated/60 p-0.5 text-xs">
          {(['all', 'past', 'future', 'pre-emi', 'emi'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f)
                setPage(0)
              }}
              className={clsx(
                'relative rounded-full px-3 py-1 capitalize transition',
                filter === f ? 'text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary',
              )}
            >
              {filter === f && (
                <motion.div
                  layoutId="filterBg"
                  className="absolute inset-0 -z-10 rounded-full bg-white/[0.06]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {f === 'pre-emi' ? 'Pre-EMI' : f}
            </button>
          ))}
        </div>
        {/* On mobile the search sits inline with the filter pills (left-aligned).
            From sm+ `ml-auto` pushes it to the row's right end as before. */}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-bg-elevated/60 px-3 py-1.5 text-xs sm:ml-auto">
          <Search size={12} className="text-ink-tertiary" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Search by # or date"
            /* `text-base` (16px) on mobile prevents iOS Safari's automatic
               zoom-into-input behavior; `sm:text-xs` restores the smaller
               size everywhere a real keyboard is in play. */
            className="w-44 bg-transparent text-base outline-none placeholder:text-ink-muted sm:text-xs"
          />
        </div>
      </div>

      {/* Table - wraps in horizontal scroll on mobile so the fixed-grid
          columns don't squeeze unreadably. min-w forces the inner grid to
          its full width regardless of viewport. */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.05]">
       <div className="min-w-[820px]">
        <div className="grid grid-cols-[60px_120px_120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px_minmax(0,1fr)] items-center gap-4 border-b border-white/[0.05] bg-bg-elevated/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
          <div>#</div>
          <div>Due date</div>
          <div>Phase</div>
          <div className="text-right">Payment due</div>
          <div className="text-right">Interest</div>
          <div className="text-right">Principal</div>
          <div className="text-right">Rate</div>
          <div className="text-right">Outstanding</div>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {slice.map((r, i) => {
            const past = r.dueDate <= todayIso
            const isNext = !past && filtered.findIndex((x) => x.dueDate > todayIso) === safePage * pageSize + i
            return (
              <div
                key={r.srNo}
                className={clsx(
                  'grid grid-cols-[60px_120px_120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px_minmax(0,1fr)] items-center gap-4 px-4 py-2.5 text-sm transition',
                  past ? 'text-ink-secondary' : 'text-ink-primary',
                  isNext && 'bg-accent-emerald/[0.04]',
                  !past && !isNext && 'hover:bg-white/[0.02]',
                )}
              >
                <div className="font-mono text-[11px] text-ink-tertiary">{r.srNo}</div>
                <div>
                  <div className="font-medium">{fmtDate(r.dueDate, 'd MMM yyyy')}</div>
                  <div className="text-[10px] text-ink-tertiary">
                    {past ? 'paid' : isNext ? 'next' : 'scheduled'}
                  </div>
                </div>
                <div>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      r.principal > 0
                        ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
                        : 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber',
                    )}
                  >
                    {r.principal > 0 ? 'EMI' : 'Pre-EMI'}
                  </span>
                </div>
                <div className="text-right font-medium tabular">{formatINR(r.paymentDue)}</div>
                <div className="text-right tabular text-accent-rose">{formatINR(r.interest)}</div>
                <div className="text-right tabular text-accent-emerald">
                  {formatINR(r.principal)}
                </div>
                <div className="text-right">
                  <span className="font-mono text-[12px] text-ink-secondary tabular">
                    {formatPercent(r.rateAtPayment, 2)}
                  </span>
                </div>
                <div className="text-right font-semibold tabular">
                  {formatINR(r.totalOutstanding)}
                </div>
              </div>
            )
          })}
          {slice.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink-tertiary">No payments match the filter.</div>
          )}
        </div>
       </div>
      </div>

      {/* Pager */}
      <div className="mt-3 flex items-center justify-between text-xs text-ink-tertiary">
        <div>
          Showing {slice.length} of {filtered.length} ·{' '}
          <span className="font-mono text-ink-secondary">
            page {safePage + 1}/{totalPages}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.06] bg-bg-elevated/40 text-ink-secondary transition hover:text-ink-primary disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.06] bg-bg-elevated/40 text-ink-secondary transition hover:text-ink-primary disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
