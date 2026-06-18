import { useEffect, useState } from 'react'

// How far the readout is dropped into the gap below the needle pivot. The
// readout is absolutely positioned, so the outer wrapper carries this same
// value as bottom padding to reserve the space - keeping the dial face where
// it looks right while letting the host box grow to contain it.
const READOUT_DROP = 38

const polar = (cx: number, cy: number, r: number, thetaDeg: number) => {
  // theta measured clockwise from 12 o'clock
  const rad = (thetaDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

const arcPath = (cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string => {
  const a = polar(cx, cy, r, fromDeg)
  const b = polar(cx, cy, r, toDeg)
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${largeArc} 1 ${b.x} ${b.y}`
}

/**
 * Needle instrument. A 240° graduated dial with a thin colored fill arc and
 * a counterweighted needle that sweeps to the value on mount.
 *
 * `value` is clamped to [min, max]; the dial face shows `format(value)`.
 */
export const Gauge = ({
  value,
  min = 0,
  max = 100,
  format = (v: number) => `${v.toFixed(1)}%`,
  accent = 'rgb(var(--c-gold))',
  label,
  sublabel,
  size = 220,
}: {
  value: number
  min?: number
  max?: number
  format?: (v: number) => string
  accent?: string
  label?: string
  sublabel?: string
  size?: number
}) => {
  const CX = 50
  const CY = 50
  const R = 38
  const SWEEP = 240 // -120° … +120°, opening at the bottom
  const f = Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
  const needleDeg = -SWEEP / 2 + SWEEP * f

  // Mount flag - needle starts at min and sweeps; fill arc draws.
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

  const track = arcPath(CX, CY, R, -SWEEP / 2, SWEEP / 2)
  const trackLen = (SWEEP / 360) * 2 * Math.PI * R
  const fillLen = f * trackLen

  const TICKS = 25 // graduation count; every 4th is major
  return (
    // Outer wrapper reserves the readout's drop as bottom padding so the
    // component reports its true height (SVG + dropped readout) and any
    // container - e.g. the Analytics dial cells - grows to contain it instead
    // of letting the text spill past its border. The inner `relative` div is
    // the positioning context for the absolutely-placed readout, so its own
    // height stays the SVG height and the readout's `bottom-0` is unaffected.
    <div style={{ width: size, paddingBottom: READOUT_DROP }}>
      <div className="relative">
        <svg viewBox="0 0 100 86" width={size} height={size * 0.86} aria-hidden>
          {/* graduations */}
          {Array.from({ length: TICKS }).map((_, i) => {
            const deg = -SWEEP / 2 + (SWEEP * i) / (TICKS - 1)
            const major = i % 4 === 0
            const o = polar(CX, CY, R + 4.5, deg)
            const p = polar(CX, CY, R + (major ? 9 : 7), deg)
            return (
              <line
                key={i}
                x1={o.x}
                y1={o.y}
                x2={p.x}
                y2={p.y}
                stroke={major ? 'var(--line-strong)' : 'var(--line)'}
                strokeWidth={major ? 1 : 0.6}
              />
            )
          })}

          {/* track + fill */}
          <path d={track} fill="none" stroke="var(--line)" strokeWidth={2.5} />
          <path
            d={track}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeDasharray={trackLen}
            strokeDashoffset={drawn ? trackLen - fillLen : trackLen}
            style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />

          {/* needle - sweeps from rest with a slight mechanical overshoot */}
          <g
            style={{
              transform: `rotate(${drawn ? needleDeg : -SWEEP / 2}deg)`,
              transformOrigin: '50px 50px',
              transition: 'transform 1.3s cubic-bezier(0.34, 1.3, 0.45, 1)',
            }}
          >
            <line x1={CX} y1={CY} x2={CX} y2={CY - R + 6} stroke={accent} strokeWidth={1.4} />
            <line x1={CX} y1={CY} x2={CX} y2={CY + 7} stroke={accent} strokeWidth={1.4} />
          </g>
          <circle cx={CX} cy={CY} r={2.6} fill={accent} />
          <circle cx={CX} cy={CY} r={1} fill="rgb(var(--bg-surface))" />
        </svg>

        {/* readout - sits inside the dial opening, nudged down via negative
            bottom margin so it centres in the gap below the needle pivot rather
            than riding the arc. The outer wrapper's matching bottom padding
            reserves this drop so the box adapts. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 text-center"
          style={{ marginBottom: -READOUT_DROP }}
        >
          <div className="font-display display-num text-2xl font-medium leading-none text-ink-primary">
            {format(value)}
          </div>
          {label && <div className="etch mt-1.5">{label}</div>}
          {sublabel && <div className="mt-0.5 text-[10px] text-ink-tertiary">{sublabel}</div>}
        </div>
      </div>
    </div>
  )
}
