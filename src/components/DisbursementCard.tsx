import { motion } from 'framer-motion'
import { ArrowUpRight, Calendar, Hash, Percent } from 'lucide-react'
import type { DisbursementView } from '../data/loanData'
import { computeLiveStatus } from '../lib/calculations'
import { useTodayIso } from '../state/today'
import { formatINR, formatINRCompact, formatPercent } from '../lib/format'
import { fmtDateShort, formatRelative } from '../lib/dates'
import { DrawBar } from './ui/DrawBar'

const COLOR_DOT = {
  violet: 'bg-accent-violet',
  cyan: 'bg-accent-cyan',
  emerald: 'bg-accent-emerald',
  pink: 'bg-accent-pink',
} as const

const COLOR_GLOW = {
  violet: 'shadow-glow-violet',
  cyan: 'shadow-glow-cyan',
  emerald: 'shadow-glow-emerald',
  pink: 'shadow-glow-violet', // pink reuses the violet glow shadow (no dedicated pink glow utility)
} as const

// Soft tone wash that fades into transparency at the corner — no hard edges.
const TONE_WASH = {
  violet:
    'bg-[radial-gradient(120%_70%_at_100%_0%,rgba(167,139,250,0.22),rgba(167,139,250,0)_60%)]',
  cyan:
    'bg-[radial-gradient(120%_70%_at_100%_0%,rgba(34,211,238,0.20),rgba(34,211,238,0)_60%)]',
  emerald:
    'bg-[radial-gradient(120%_70%_at_100%_0%,rgba(52,211,153,0.20),rgba(52,211,153,0)_60%)]',
  pink:
    'bg-[radial-gradient(120%_70%_at_100%_0%,rgba(244,114,182,0.22),rgba(244,114,182,0)_60%)]',
} as const

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

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`glass glass-hover group relative overflow-hidden rounded-2xl p-5 text-left ${COLOR_GLOW[d.color]}`}
    >
      {/* soft tone wash — no hard edges */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${TONE_WASH[d.color]}`}
      />

      {/* All content sits in a relative stacking context above the wash */}
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
              <span className={`h-1.5 w-1.5 rounded-full ${COLOR_DOT[d.color]}`} />
              {d.shortName}
            </div>
            <div className="mt-1.5 font-mono text-[11px] text-ink-secondary">{d.applicationNumber}</div>
          </div>
          <ArrowUpRight
            size={16}
            className="translate-y-0 text-ink-tertiary transition-[transform,color] duration-200 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ink-primary"
          />
        </div>

        <div className="mt-4 flex items-baseline gap-3">
          <div>
            <div className="font-display text-3xl font-semibold tabular">
              {formatINRCompact(status.currentOutstanding)}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-tertiary">current outstanding</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[11px] text-ink-tertiary">disbursed</div>
            <div className="font-display text-base font-medium tabular">
              {formatINRCompact(d.disbursedAmount)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-ink-tertiary">
          <Meta icon={<Percent size={10} />} label="rate">
            <span className="font-medium text-ink-primary tabular">{formatPercent(status.rate, 2)}</span>
          </Meta>
          <Meta icon={<Calendar size={10} />} label="disb.">
            <span className="font-medium text-ink-primary">{fmtDateShort(d.disbursedDate)}</span>
          </Meta>
          <Meta icon={<Hash size={10} />} label="paid">
            <span className="font-medium text-ink-primary tabular">
              {status.paymentsCompleted}/{status.paymentsTotal}
            </span>
          </Meta>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-ink-tertiary">
            <span>Tenure progress</span>
            <span className="tabular">{progress.toFixed(1)}%</span>
          </div>
          <div className="mt-2">
            <DrawBar
              pct={progress}
              fillClassName={COLOR_DOT[d.color]}
              trackClassName="bg-bg-elevated"
              height={6}
              delay={index * 50}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-ink-secondary">
            <span className="text-ink-tertiary">Next:</span>
            <span className="font-medium tabular">
              {status.nextPayment ? formatINR(status.nextPayment.paymentDue) : formatINR(0)}
            </span>
            {status.nextPayment && (
              <span className="text-ink-tertiary">
                · {formatRelative(status.nextPayment.dueDate, todayIso)}
              </span>
            )}
          </div>
          <div className="text-ink-tertiary">
            {status.isInEMIPhase ? 'EMI active' : 'Pre-EMI'}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

const Meta = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-0.5">{children}</div>
  </div>
)
