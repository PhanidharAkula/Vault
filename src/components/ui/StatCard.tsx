import clsx from 'clsx'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { Ticks } from './Plate'
import type { Tone } from './Plate'

type Props = {
  label: string
  value: number | string
  format?: (n: number) => string
  tone?: Tone
  hint?: ReactNode
  delta?: { value: number; label?: string }
  index?: number
}

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-ink-primary',
  gold: 'text-gold',
  cerulean: 'text-cerulean',
  sage: 'text-sage',
  plum: 'text-plum',
  vermillion: 'text-vermillion',
}

const TONE_BG: Record<Tone, string> = {
  default: 'bg-ink-tertiary',
  gold: 'bg-gold',
  cerulean: 'bg-cerulean',
  sage: 'bg-sage',
  plum: 'bg-plum',
  vermillion: 'bg-vermillion',
}

/**
 * Ledger instrument tile: index number top-right, etched label, serif value,
 * one-line footnote. Flat plate, corner ticks, accent swatch.
 */
export const StatCard = ({ label, value, format, tone = 'default', hint, delta, index = 0 }: Props) => {
  const numeric = typeof value === 'number'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="plate plate-hover relative p-4 md:p-5"
    >
      <Ticks />
      <div className="flex items-start justify-between gap-2">
        <div className="etch flex items-center gap-1.5">
          <span aria-hidden className={clsx('h-1.5 w-1.5', TONE_BG[tone])} />
          {label}
        </div>
        <div className="text-[9px] tracking-[0.18em] text-ink-muted">{String(index + 1).padStart(2, '0')}</div>
      </div>
      <div
        className={clsx(
          'display-num mt-3 font-display text-[22px] font-medium leading-none tracking-tight md:text-[26px]',
          TONE_TEXT[tone],
        )}
      >
        {numeric ? (
          <AnimatedNumber value={value as number} format={format} duration={800} />
        ) : (
          <span>{value}</span>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] leading-relaxed text-ink-tertiary">
        {hint && <div className="min-w-0 truncate">{hint}</div>}
        {delta && (
          <div
            className={clsx(
              'flex items-center gap-1 font-medium tabular',
              delta.value >= 0 ? 'text-sage' : 'text-vermillion',
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
