import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import clsx from 'clsx'
import type { DisbursementView, SchedulePayment } from '../data/loanData'
import { fmtDate } from '../lib/dates'
import { formatINR, formatPercent } from '../lib/format'

type Filter = 'all' | 'past' | 'future' | 'pre-emi' | 'emi'

/**
 * The amortization ledger. Mono columns, hairline rules, debit ink for
 * interest, credit ink for principal, a gold rule on the next-due line.
 * Pagination reads as folios.
 */
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
      rows = rows.filter((r) => {
        // Match what the row actually shows: the zero-padded serial ("001")
        // and the formatted due date ("11 Aug 2024"). We deliberately do NOT
        // search the raw ISO date ("2024-12-11") - its hidden month/day digits
        // would match queries like "12" (December) or "01" (January) on rows
        // that don't visibly contain them.
        const srNo = String(r.srNo).padStart(3, '0')
        const date = fmtDate(r.dueDate, 'd MMM yyyy').toLowerCase()
        return srNo.includes(q) || date.includes(q)
      })
    }
    return rows
  }, [disbursement, todayIso, filter, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  // Auto-jump to the folio containing the next-due payment whenever the
  // tranche or filter changes.
  useEffect(() => {
    const idx = filtered.findIndex((r) => r.dueDate >= todayIso)
    if (idx >= 0) setPage(Math.floor(idx / pageSize))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disbursement.applicationNumber, filter])

  return (
    <div>
      {/* Filters - on mobile the label, segmented control and search each take
          a full-width row (gap-y matches the row's bottom margin so the spacing
          reads evenly). From sm+ they share one row: label + control left,
          search right. Seg and search share a fixed h-9 so they line up. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-3">
        <div className="etch">filter</div>
        <div className="seg h-9 w-full min-w-0 sm:w-auto">
          {(['all', 'past', 'future', 'pre-emi', 'emi'] as Filter[]).map((f) => (
            <button
              type="button"
              key={f}
              data-on={filter === f}
              onClick={() => {
                setFilter(f)
                setPage(0)
              }}
              className="seg-btn flex min-w-0 flex-1 items-center justify-center capitalize sm:flex-none"
            >
              {f === 'pre-emi' ? 'Pre-EMI' : f === 'emi' ? 'EMI' : f}
            </button>
          ))}
        </div>
        {/* Search - full width on its own row on mobile so the icon, input and
            clear button share one line; sized and right-aligned from sm+. */}
        <div className="flex h-9 w-full items-center gap-2 border border-line bg-bg-base px-3 text-xs sm:ml-auto sm:w-auto">
          <Search size={16} className="shrink-0 text-ink-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="search # or date"
            /* Matches the table's 12px body text. iOS focus-zoom is prevented
               by the viewport's `maximum-scale=1` (index.html), so no 16px
               bump is needed. Flexes to fill the row on mobile; fixed at sm+. */
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-muted sm:w-44 sm:flex-none"
          />
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setPage(0)
            }}
            disabled={!query}
            aria-label="Clear search"
            /* Disabled while empty - `disabled:cursor-default` overrides the
               global `not-allowed` so an empty search reads as plain default. */
            className="grid shrink-0 place-items-center text-ink-muted transition-colors enabled:hover:text-ink-primary disabled:cursor-default disabled:opacity-30"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Ledger - wraps in horizontal scroll on mobile so the fixed-grid
          columns don't squeeze unreadably. */}
      <div className="overflow-x-auto border border-line">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[56px_120px_96px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_104px_minmax(0,1fr)] items-center gap-4 border-b border-line-strong bg-bg-base px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
            <div>№</div>
            <div>Due date</div>
            <div>Phase</div>
            <div className="text-right">Payment</div>
            <div className="text-right text-vermillion/80">Interest</div>
            <div className="text-right text-sage/80">Principal</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Outstanding</div>
          </div>
          <div className="divide-y divide-line">
            {slice.map((r, i) => {
              const past = r.dueDate <= todayIso
              const isNext =
                !past && filtered.findIndex((x) => x.dueDate > todayIso) === safePage * pageSize + i
              return (
                <div
                  key={r.srNo}
                  className={clsx(
                    'relative grid grid-cols-[56px_120px_96px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_104px_minmax(0,1fr)] items-center gap-4 px-4 py-2.5 text-[12px] transition-colors',
                    past ? 'text-ink-tertiary' : 'text-ink-primary',
                    isNext && 'bg-gold/[0.07]',
                    !past && !isNext && 'hover:bg-ink-primary/[0.025]',
                  )}
                >
                  {isNext && <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[2px] bg-gold" />}
                  <div className="text-[10px] tabular text-ink-muted">{String(r.srNo).padStart(3, '0')}</div>
                  <div>
                    <div className={clsx('font-medium tabular', past && 'line-through decoration-ink-muted/60 decoration-[0.5px]')}>
                      {fmtDate(r.dueDate, 'd MMM yyyy')}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                      {past ? 'settled' : isNext ? '→ next' : 'scheduled'}
                    </div>
                  </div>
                  <div>
                    <span
                      className={clsx(
                        'inline-flex border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]',
                        r.principal > 0
                          ? 'border-sage/40 text-sage'
                          : 'border-gold/40 text-gold',
                      )}
                    >
                      {r.principal > 0 ? 'emi' : 'pre-emi'}
                    </span>
                  </div>
                  <div className="text-right font-semibold tabular">{formatINR(r.paymentDue)}</div>
                  <div className="text-right tabular text-vermillion">{formatINR(r.interest)}</div>
                  <div className="text-right tabular text-sage">{formatINR(r.principal)}</div>
                  <div className="text-right tabular text-ink-secondary">{formatPercent(r.rateAtPayment, 2)}</div>
                  <div className="text-right font-semibold tabular">{formatINR(r.totalOutstanding)}</div>
                </div>
              )
            })}
            {slice.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-ink-tertiary">
                No payments match the filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Folio pager */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-tertiary">
        <div>
          {slice.length} of {filtered.length} entries ·{' '}
          <span className="tabular text-ink-secondary">
            folio {safePage + 1}/{totalPages}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous folio"
            className="grid h-7 w-7 place-items-center border border-line bg-bg-base text-ink-secondary transition hover:border-line-strong hover:text-ink-primary disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next folio"
            className="grid h-7 w-7 place-items-center border border-line bg-bg-base text-ink-secondary transition hover:border-line-strong hover:text-ink-primary disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
