import clsx from 'clsx'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { AnimatedNumber } from './AnimatedNumber'

type Props = {
  label: string
  value: number | string
  format?: (n: number) => string
  tone?: 'default' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'pink'
  hint?: ReactNode
  icon?: ReactNode
  delta?: { value: number; label?: string }
  index?: number
}

// Soft radial wash that bleeds into the card from the top-right (no hard edges)
const TONE_WASH: Record<NonNullable<Props['tone']>, string> = {
  default:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(99,102,241,0.16),rgba(99,102,241,0)_60%)]',
  violet:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(167,139,250,0.20),rgba(167,139,250,0)_60%)]',
  cyan:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(34,211,238,0.18),rgba(34,211,238,0)_60%)]',
  emerald:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(52,211,153,0.18),rgba(52,211,153,0)_60%)]',
  amber:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(251,191,36,0.18),rgba(251,191,36,0)_60%)]',
  rose:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(251,113,133,0.18),rgba(251,113,133,0)_60%)]',
  pink:
    'bg-[radial-gradient(120%_60%_at_100%_0%,rgba(244,114,182,0.18),rgba(244,114,182,0)_60%)]',
}

const TONE_ICON: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-brand-300',
  violet: 'text-accent-violet',
  cyan: 'text-accent-cyan',
  emerald: 'text-accent-emerald',
  amber: 'text-accent-amber',
  rose: 'text-accent-rose',
  pink: 'text-accent-pink',
}

export const StatCard = ({
  label,
  value,
  format,
  tone = 'default',
  hint,
  icon,
  delta,
  index = 0,
}: Props) => {
  const numeric = typeof value === 'number'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover relative isolate overflow-hidden rounded-2xl p-5 shadow-inner-soft"
    >
      {/* soft tone wash — no hard edges */}
      <div
        aria-hidden
        className={clsx('pointer-events-none absolute inset-0', TONE_WASH[tone])}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">
          {label}
        </div>
        {icon && <div className={clsx(TONE_ICON[tone])}>{icon}</div>}
      </div>
      <div className="relative mt-3 font-display text-2xl font-semibold tracking-tight tabular md:text-3xl">
        {numeric ? (
          <AnimatedNumber value={value as number} format={format} duration={800} />
        ) : (
          <span>{value}</span>
        )}
      </div>
      <div className="relative mt-2 flex items-center justify-between gap-2 text-[12px] text-ink-tertiary">
        {hint && <div className="min-w-0 truncate">{hint}</div>}
        {delta && (
          <div
            className={clsx(
              'flex items-center gap-1 font-medium',
              delta.value >= 0 ? 'text-accent-emerald' : 'text-accent-rose',
            )}
          >
            {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.value).toFixed(2)}%
            {delta.label && <span className="text-ink-tertiary">{delta.label}</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}
