import { useEffect, useState } from 'react'

// Count up from 0 (or whatever target was previously) toward `target` over
// `duration` ms using a cubic ease-out. Used for on-mount count-up animations
// where we want the number to grow from 0 to its real value, rather than
// snap into place. Lives at module scope so multiple components share the
// same implementation (Overview hero, Live view big number).
export const useCountUp = (target: number, duration = 1400): number => {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = value
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])
  return value
}
