import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

type Tone = 'default' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose'

const TONE_GLOW: Record<Tone, string> = {
  default: '',
  violet:
    'before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(60%_120%_at_0%_0%,rgba(167,139,250,0.18),transparent_70%)]',
  cyan:
    'before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(60%_120%_at_0%_0%,rgba(34,211,238,0.18),transparent_70%)]',
  emerald:
    'before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(60%_120%_at_0%_0%,rgba(52,211,153,0.18),transparent_70%)]',
  amber:
    'before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(60%_120%_at_0%_0%,rgba(251,191,36,0.18),transparent_70%)]',
  rose:
    'before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(60%_120%_at_0%_0%,rgba(251,113,133,0.18),transparent_70%)]',
}

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: Tone
  pad?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}

const PAD = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

export const GlassCard = ({
  children,
  tone = 'default',
  pad = 'md',
  interactive = false,
  className,
  ...rest
}: GlassCardProps) => {
  return (
    <div
      {...rest}
      className={clsx(
        'glass relative isolate overflow-hidden rounded-2xl shadow-inner-soft',
        TONE_GLOW[tone],
        PAD[pad],
        interactive && 'glass-hover cursor-pointer hover:translate-y-[-1px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export const SectionTitle = ({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string
  title: string
  description?: string
  right?: ReactNode
}) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div>
      {eyebrow && (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
    </div>
    {right}
  </div>
)

export const Pill = ({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose'
  className?: string
}) => {
  const map = {
    default: 'bg-white/[0.04] text-ink-secondary border-white/10',
    violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/30',
    cyan: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30',
    emerald: 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/30',
    amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
    rose: 'bg-accent-rose/10 text-accent-rose border-accent-rose/30',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]',
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
