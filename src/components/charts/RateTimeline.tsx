import { motion } from 'framer-motion'
import { fmtDateShort } from '../../lib/dates'
import type { DisbursementView } from '../../data/loanData'
import { differenceInDays, parseISO } from 'date-fns'

const COLORS: Record<string, string> = {
  violet: '#a78bfa',
  cyan: '#22d3ee',
  emerald: '#34d399',
  pink: '#f472b6',
}

/**
 * Renders the per-disbursement rate-period detail cards.  The big segmented
 * bar that used to sit above this grid was removed — it had no label and the
 * cards below carry every meaningful piece of data (phase #, duration, rate,
 * delta vs previous, start date).
 *
 * `compact={true}` is now a no-op (returns null) — kept on the prop signature
 * so existing call sites don't break, but compact contexts (Tranche cards on
 * the Overview) no longer render anything for rate phases.
 */
export const RateTimeline = ({
  disbursement,
  compact = false,
}: {
  disbursement: DisbursementView
  compact?: boolean
}) => {
  if (compact) return null

  const periods = disbursement.ratePeriods
  const finalDate = disbursement.finalDate
  const accent = COLORS[disbursement.color] ?? '#a78bfa'

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {periods.map((p, i) => {
        const months = (() => {
          const next = periods[i + 1]
          const periodEnd = next ? parseISO(next.activeStartDate) : parseISO(finalDate)
          const days = differenceInDays(periodEnd, parseISO(p.activeStartDate))
          return Math.round(days / 30.4)
        })()
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
            className="rounded-xl border border-white/[0.06] bg-bg-elevated/40 px-3 py-2.5"
          >
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-tertiary">
              <div className="whitespace-nowrap">Phase {i + 1}</div>
              <div className="mt-0.5 whitespace-nowrap normal-case tracking-normal text-ink-secondary">
                {months} {months === 1 ? 'Month' : 'Months'}
              </div>
            </div>
            <div
              className="mt-1.5 font-display text-lg font-semibold tabular"
              style={{ color: accent }}
            >
              {p.rateOfInterest.toFixed(2)}%
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[11px] text-ink-tertiary">
              <span>{fmtDateShort(p.activeStartDate)}</span>
              {i > 0 && (
                <span
                  className={`tabular ${
                    p.rateOfInterest > periods[i - 1].rateOfInterest
                      ? 'text-accent-rose'
                      : p.rateOfInterest < periods[i - 1].rateOfInterest
                        ? 'text-accent-emerald'
                        : 'text-ink-tertiary'
                  }`}
                >
                  {p.rateOfInterest > periods[i - 1].rateOfInterest
                    ? '↑'
                    : p.rateOfInterest < periods[i - 1].rateOfInterest
                      ? '↓'
                      : '·'}
                  {Math.abs(p.rateOfInterest - periods[i - 1].rateOfInterest).toFixed(2)}
                </span>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
