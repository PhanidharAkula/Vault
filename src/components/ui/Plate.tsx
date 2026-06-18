import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export type Tone = 'default' | 'gold' | 'cerulean' | 'sage' | 'plum' | 'vermillion'

const PAD = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

// Inset accent strip along the top edge - stops short of the corner ticks.
const TONE_EDGE: Record<Tone, string> = {
  default: '',
  gold: 'bg-gold',
  cerulean: 'bg-cerulean',
  sage: 'bg-sage',
  plum: 'bg-plum',
  vermillion: 'bg-vermillion',
}

type PlateProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: Tone
  pad?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  /** Corner registration ticks - on by default; disable for nested plates. */
  ticks?: boolean
}

/** Corner registration marks - plant inside any relatively-positioned box. */
export const Ticks = () => (
  <>
    <span aria-hidden className="ptick ptick-tl" />
    <span aria-hidden className="ptick ptick-tr" />
    <span aria-hidden className="ptick ptick-bl" />
    <span aria-hidden className="ptick ptick-br" />
  </>
)

/**
 * The flat engraved panel every module sits on. No glass, no glow - paper,
 * one hairline, four registration ticks, and an optional accent edge.
 */
export const Plate = ({
  children,
  tone = 'default',
  pad = 'md',
  interactive = false,
  ticks = true,
  className,
  ...rest
}: PlateProps) => {
  return (
    <div
      {...rest}
      className={clsx('plate', PAD[pad], interactive && 'plate-hover cursor-pointer', className)}
    >
      {ticks && <Ticks />}
      {tone !== 'default' && (
        <span
          aria-hidden
          className={clsx('absolute left-3 right-3 top-0 h-px', TONE_EDGE[tone])}
        />
      )}
      {children}
    </div>
  )
}

/**
 * Section header in the engraving register:
 *   FIG. 04 - EYEBROW                      [right slot]
 *   Title in serif
 *   description
 *   ───────┤ measurement rule ├───────
 */
export const SectionTitle = ({
  fig,
  eyebrow,
  title,
  description,
  right,
}: {
  /** Figure number, e.g. "04". Rendered as `FIG. 04`. */
  fig?: string
  eyebrow?: string
  title: string
  description?: string
  right?: ReactNode
}) => (
  <div className="mb-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {(fig || eyebrow) && (
          <div className="etch flex items-baseline gap-2">
            {fig && <span className="text-gold">fig. {fig}</span>}
            {fig && eyebrow && <span aria-hidden className="text-ink-muted">-</span>}
            {eyebrow && <span>{eyebrow}</span>}
          </div>
        )}
        <h2 className="mt-1.5 font-display text-xl font-medium tracking-tight text-ink-primary md:text-[22px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
    <div className="rule-ticked mt-3" aria-hidden />
  </div>
)

/** Bracketed registry tag - `[ EDUCATION LOAN ]`. */
export const Tag = ({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) => {
  const map: Record<Tone, string> = {
    default: 'text-ink-secondary border-line',
    gold: 'text-gold border-gold/40 bg-gold/[0.06]',
    cerulean: 'text-cerulean border-cerulean/40 bg-cerulean/[0.06]',
    sage: 'text-sage border-sage/40 bg-sage/[0.06]',
    plum: 'text-plum border-plum/40 bg-plum/[0.06]',
    vermillion: 'text-vermillion border-vermillion/40 bg-vermillion/[0.06]',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.2em]',
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Tiny square swatch - the ledger's color key for a tranche. */
export const InkSwatch = ({ color, className }: { color: string; className?: string }) => (
  <span
    aria-hidden
    className={clsx('inline-block h-2 w-2 shrink-0', className)}
    style={{ background: color }}
  />
)
