import { useEffect, useRef, useState } from 'react'

type Props = {
  value: number
  duration?: number
  decimals?: number
  format?: (n: number) => string
  className?: string
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Smoothly interpolates a number when `value` changes. Display state starts
 * at the target value, so the very first render is silent — subsequent
 * `value` changes animate from the previously-displayed value to the new
 * target over `duration` ms with a cubic ease-out.
 *
 * For first-mount count-up animations (where you want it to grow from 0 →
 * value on initial paint), use the inline `useCountUp` hook in
 * `LiveOutstandingHero.tsx` instead — that one explicitly seeds `0`.
 */
export const AnimatedNumber = ({
  value,
  duration = 900,
  decimals = 0,
  format,
  className,
}: Props) => {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    fromRef.current = display
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const next = fromRef.current + (value - fromRef.current) * easeOut(t)
      setDisplay(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // `display` is intentionally excluded — re-running on every tick would
    // cancel the in-flight animation and create a feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const out = format ? format(display) : display.toFixed(decimals)
  return <span className={className}>{out}</span>
}
