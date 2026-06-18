import { useState } from 'react'
import clsx from 'clsx'

type Direction = 'up' | 'down'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * One mechanical counter wheel. When `ch` changes, the new glyph rolls in
 * while the old one rolls out - upward for increases, downward for
 * decreases - like the digit wheels of a gas meter.
 *
 * The cell is exactly `1ch` wide, which in the mono face equals the advance
 * width of every digit, so wheels never wobble as they spin.
 */
export const RollingDigit = ({
  ch,
  direction = 'up',
  duration = 480,
  className,
}: {
  ch: string
  direction?: Direction
  duration?: number
  className?: string
}) => {
  // Derived-from-previous-render state (the documented render-phase pattern):
  // when the glyph changes we remember the outgoing one and bump the key so
  // both layers remount with fresh animations - starting this same frame.
  const [s, setS] = useState<{ cur: string; prev: string | null; k: number }>({
    cur: ch,
    prev: null,
    k: 0,
  })
  if (s.cur !== ch) {
    setS({ cur: ch, prev: s.cur, k: s.k + 1 })
  }

  return (
    <span
      className={clsx('relative inline-block overflow-hidden align-baseline', className)}
      style={{ width: '1ch' }}
    >
      {/* invisible sizer keeps the line box / baseline honest */}
      <span className="invisible">0</span>
      <span
        key={`c${s.k}`}
        className="absolute inset-0 text-center"
        style={
          s.k > 0
            ? { animation: `odo-${direction}-in ${duration}ms ${EASE}` }
            : undefined
        }
      >
        {s.cur}
      </span>
      {s.prev !== null && (
        <span
          key={`p${s.k}`}
          aria-hidden
          className="absolute inset-0 text-center"
          style={{ animation: `odo-${direction}-out ${duration}ms ${EASE} forwards` }}
        >
          {s.prev}
        </span>
      )}
    </span>
  )
}

/**
 * A full odometer: formats `value` with `format`, renders every digit as a
 * rolling wheel and every symbol (₹ $ , .) as a fixed glyph. Wheels keep
 * their identity by position-from-the-right, so the paise wheels keep
 * spinning even when the integer part grows a digit.
 */
export const Odometer = ({
  value,
  format,
  className,
  duration = 480,
}: {
  value: number
  format: (n: number) => string
  className?: string
  duration?: number
}) => {
  // Track roll direction from the previous render's value (render-phase
  // derived state - keeps direction in lockstep with the digits below).
  const [track, setTrack] = useState<{ value: number; dir: Direction }>({ value, dir: 'up' })
  if (track.value !== value) {
    setTrack({ value, dir: value >= track.value ? 'up' : 'down' })
  }

  const chars = format(value).split('')

  return (
    <span className={clsx('inline-flex items-baseline whitespace-nowrap leading-none', className)}>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i
        if (/\d/.test(ch)) {
          return <RollingDigit key={`d${fromRight}`} ch={ch} direction={track.dir} duration={duration} />
        }
        return <span key={`s${fromRight}`}>{ch}</span>
      })}
    </span>
  )
}
