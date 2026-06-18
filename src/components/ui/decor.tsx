import { useState } from 'react'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Guilloche rosette - the engraved-banknote ornament. A wreath of thin
 * ellipses; spins one revolution per 90 s when `spin` is on.
 */
export const Guilloche = ({
  size = 220,
  petals = 18,
  stroke = 'rgb(var(--c-gold))',
  opacity = 0.55,
  spin = true,
  className,
}: {
  size?: number
  petals?: number
  stroke?: string
  opacity?: number
  spin?: boolean
  className?: string
}) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={className}
    aria-hidden
    style={{ display: 'block' }}
  >
    <g className={spin ? 'rosette-spin' : undefined} style={{ transformOrigin: '50px 50px' }}>
      {Array.from({ length: petals }).map((_, i) => (
        <ellipse
          key={i}
          cx="50"
          cy="50"
          rx="40"
          ry="13.5"
          fill="none"
          stroke={stroke}
          strokeWidth="0.3"
          opacity={opacity}
          transform={`rotate(${(180 / petals) * i} 50 50)`}
        />
      ))}
    </g>
    <circle cx="50" cy="50" r="47" fill="none" stroke={stroke} strokeWidth="0.45" opacity={opacity * 0.9} />
    <circle cx="50" cy="50" r="44.5" fill="none" stroke={stroke} strokeWidth="0.3" opacity={opacity * 0.6} />
    <circle cx="50" cy="50" r="9" fill="none" stroke={stroke} strokeWidth="0.45" opacity={opacity} />
  </svg>
)

/** Rubber stamp - `SETTLED`, `CURRENT`, `DUE`. Pressed at a 7° tilt. */
export const Stamp = ({
  children,
  tone = 'vermillion',
  animate = false,
  className,
}: {
  children: ReactNode
  tone?: 'vermillion' | 'sage' | 'gold' | 'ink'
  animate?: boolean
  className?: string
}) => {
  const color = {
    vermillion: 'text-vermillion',
    sage: 'text-sage',
    gold: 'text-gold',
    ink: 'text-ink-tertiary',
  }[tone]
  return (
    <span className={clsx('stamp select-none', animate && 'stamp-in', color, className)}>
      {children}
    </span>
  )
}

/**
 * Escapement dial - a watch face of 60 graduations with a hand that jumps
 * once per second. Interest never sleeps; neither does the hand.
 *
 * The hand is seeded to the real wall-clock second on mount via a negative
 * animation-delay, so opening the page shows the true current second instead
 * of restarting at 12 o'clock. The 60s/steps(60) animation then keeps ticking
 * in step with real seconds. Read once at mount (stable across re-renders).
 */
export const Escapement = ({ size = 168, className }: { size?: number; className?: string }) => {
  const [startOffset] = useState(() => {
    const now = new Date()
    return now.getSeconds() + now.getMilliseconds() / 1000
  })
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
    {/* graduations - every 5th is a major tick */}
    {Array.from({ length: 60 }).map((_, i) => {
      const major = i % 5 === 0
      const a = (i / 60) * Math.PI * 2
      const r0 = major ? 41 : 44
      const x1 = 50 + r0 * Math.sin(a)
      const y1 = 50 - r0 * Math.cos(a)
      const x2 = 50 + 47 * Math.sin(a)
      const y2 = 50 - 47 * Math.cos(a)
      return (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={major ? 'var(--line-strong)' : 'var(--line)'}
          strokeWidth={major ? 1 : 0.6}
        />
      )
    })}
    <circle cx="50" cy="50" r="49" fill="none" stroke="var(--line)" strokeWidth="0.6" />
    {/* the hand - jumps in 60 discrete steps per revolution, started at the
        real current second so it never resets to 12 o'clock on open */}
    <g
      className="escapement-hand"
      style={{ transformOrigin: '50px 50px', animationDelay: `-${startOffset}s` }}
    >
      <line x1="50" y1="50" x2="50" y2="9" stroke="rgb(var(--c-vermillion))" strokeWidth="1.2" />
      <line x1="50" y1="50" x2="50" y2="60" stroke="rgb(var(--c-vermillion))" strokeWidth="1.2" />
    </g>
    <circle cx="50" cy="50" r="2.4" fill="rgb(var(--c-vermillion))" />
    <circle cx="50" cy="50" r="0.9" fill="rgb(var(--bg-surface))" />
  </svg>
  )
}
