import { useEffect, useState } from 'react'
import clsx from 'clsx'

type Props = {
  /** Final width as a percentage (0-100). */
  pct: number
  /** Tailwind / arbitrary background class for the fill. */
  fillClassName?: string
  /** Inline background style (used when colour comes from a variable like a tranche tone). */
  fillStyle?: React.CSSProperties
  /** Track height in pixels (default 6px). */
  height?: number
  /** Track background class. */
  trackClassName?: string
  /** Animation duration in ms (default 1000). */
  duration?: number
  /** Animation delay in ms (default 0). */
  delay?: number
}

/**
 * A horizontal fill bar that always animates from 0 → pct on mount,
 * regardless of any framer-motion `initial={false}` propagation higher up
 * the tree. Square-cornered and hairline-framed, like a ledger column.
 */
export const DrawBar = ({
  pct,
  fillClassName,
  fillStyle,
  height = 6,
  trackClassName = 'bg-bg-base',
  duration = 1000,
  delay = 0,
}: Props) => {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setDrawn(true))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [])
  const target = Math.max(0, Math.min(100, pct))
  return (
    <div
      className={clsx('relative w-full overflow-hidden border border-line', trackClassName)}
      style={{ height }}
    >
      <div
        className={clsx('h-full', fillClassName)}
        style={{
          width: `${drawn ? target : 0}%`,
          transition: `width ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
          ...fillStyle,
        }}
      />
    </div>
  )
}
