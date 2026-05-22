import { useLayoutEffect, useState } from 'react'

// Recharts' ResponsiveContainer occasionally mis-measures its parent on first
// paint (the browser hasn't finished layout yet, or the parent is briefly 0×0
// during a Framer Motion entrance animation). It only re-measures when the
// component re-renders or the window resizes - so without a force-rerender,
// the chart can stay invisible.
//
// This hook triggers exactly one re-render on the next animation frame after
// mount, giving the layout time to settle before Recharts runs.
export const useChartTick = (): void => {
  const [, setTick] = useState(0)
  useLayoutEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      // Two RAFs: first lets the browser commit the initial paint, second
      // fires after the next paint when the resize observer has reported.
      raf2 = requestAnimationFrame(() => setTick(1))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])
}
