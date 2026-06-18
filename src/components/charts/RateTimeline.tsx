import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { fmtDateShort } from '../../lib/dates'
import type { DisbursementView } from '../../data/loanData'
import { TRANCHE_VAR } from '../../data/loanData'
import { differenceInDays, parseISO } from 'date-fns'

export const RateTimeline = ({ disbursement }: { disbursement: DisbursementView }) => {
  const periods = disbursement.ratePeriods
  const finalDate = disbursement.finalDate
  const ink = TRANCHE_VAR[disbursement.color]

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
            key={p.activeStartDate}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
            className="relative border border-line bg-bg-base px-3 py-2.5"
          >
            <span aria-hidden className="absolute left-0 top-0 h-px w-4" style={{ background: ink }} />
            <div className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-tertiary">
              <div className="whitespace-nowrap">Phase {i + 1}</div>
              <div className="mt-0.5 whitespace-nowrap normal-case tracking-normal text-ink-secondary">
                {months} {months === 1 ? 'month' : 'months'}
              </div>
            </div>
            <div className="display-num mt-1.5 font-display text-lg font-medium tabular" style={{ color: ink }}>
              {p.rateOfInterest.toFixed(2)}%
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-ink-tertiary">
              <span>{fmtDateShort(p.activeStartDate)}</span>
              {i > 0 &&
                (() => {
                  const prev = periods[i - 1].rateOfInterest
                  const Dir = p.rateOfInterest > prev ? ArrowUp : p.rateOfInterest < prev ? ArrowDown : Minus
                  const tone =
                    p.rateOfInterest > prev
                      ? 'text-vermillion'
                      : p.rateOfInterest < prev
                        ? 'text-sage'
                        : 'text-ink-tertiary'
                  return (
                    <span className={`inline-flex items-center gap-0.5 tabular ${tone}`}>
                      <Dir size={11} />
                      {Math.abs(p.rateOfInterest - prev).toFixed(2)}
                    </span>
                  )
                })()}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
