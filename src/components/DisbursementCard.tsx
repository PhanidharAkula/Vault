import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { DisbursementView } from '../data/loanData'
import { TRANCHE_VAR } from '../data/loanData'
import { computeLiveStatus } from '../lib/calculations'
import { useTodayIso } from '../state/today'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import { fmtDateShort, formatRelative } from '../lib/dates'
import { DrawBar } from './ui/DrawBar'
import { Ticks } from './ui/Plate'

/**
 * Tranche dossier - one file per drawdown. Flat plate, tranche-ink edge,
 * serif outstanding, three-column meta strip, progress column, footer line.
 */
export const DisbursementCard = ({
  d,
  index,
  onOpen,
}: {
  d: DisbursementView
  index: number
  onOpen?: () => void
}) => {
  const todayIso = useTodayIso()
  const status = computeLiveStatus(d, todayIso)
  const progress = (status.paymentsCompleted / status.paymentsTotal) * 100
  const ink = TRANCHE_VAR[d.color]

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="plate plate-hover group relative p-5 text-left"
    >
      <Ticks />
      <span aria-hidden className="absolute left-3 right-3 top-0 h-px" style={{ background: ink }} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="etch flex items-center gap-2">
            <span aria-hidden className="h-2 w-2" style={{ background: ink }} />
            {d.shortName}
          </div>
          <div className="mt-1.5 text-[10px] tracking-[0.1em] text-ink-tertiary">
            № {d.applicationNumber}
          </div>
        </div>
        <span className="etch flex items-center gap-1 !text-ink-muted transition-colors group-hover:!text-gold">
          open
          <ArrowRight
            size={13}
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </span>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <div>
          <div className="display-num font-display text-[28px] font-medium leading-none tracking-tight text-ink-primary">
            {formatINRCompact(status.currentOutstanding)}
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            current outstanding
          </div>
        </div>
        <div className="text-right">
          <div className="display-num font-display text-base font-medium" style={{ color: ink }}>
            {formatINRCompact(d.disbursedAmount)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">disbursed</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-line border border-line bg-bg-base text-center">
        <Meta label="rate" value={formatPercent(status.rate, 2)} />
        <Meta label="opened" value={fmtDateShort(d.disbursedDate)} />
        <Meta label="paid" value={`${status.paymentsCompleted}/${status.paymentsTotal}`} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.18em] text-ink-tertiary">
          <span>Schedule progress</span>
          <span className="tabular">{progress.toFixed(1)}%</span>
        </div>
        <div className="mt-1.5">
          <DrawBar pct={progress} fillStyle={{ background: ink }} height={5} delay={index * 60} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px]">
        <div className="flex items-center gap-1.5 text-ink-secondary">
          <span className="text-ink-tertiary">next</span>
          <span className="font-semibold tabular">
            {status.nextPayment ? formatINR(status.nextPayment.paymentDue) : '-'}
          </span>
          {status.nextPayment && (
            <span className="text-ink-tertiary">· {formatRelative(status.nextPayment.dueDate, todayIso)}</span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-tertiary">
          {status.isInEMIPhase ? 'emi active' : 'pre-emi'}
        </span>
      </div>
    </motion.button>
  )
}

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div className="px-2 py-2">
    <div className="text-[9px] uppercase tracking-[0.16em] text-ink-tertiary">{label}</div>
    <div className="mt-0.5 text-[11px] font-semibold tabular text-ink-primary">{value}</div>
  </div>
)
