import { useMemo } from 'react'
import clsx from 'clsx'
import { DISBURSEMENTS, MASTER, TRANCHE_VAR } from '../../data/loanData'
import { fmtDate } from '../../lib/dates'

const DAY = 86400000

/**
 * The measuring tape - the entire life of the loan as one graduated strip.
 * Monthly graduations, yearly figures, a diamond per disbursement, rate
 * revisions as ticks under the line, a pennant where the EMI begins, and a
 * vermillion needle planted on today.
 */
export const TapeTimeline = ({ todayIso }: { todayIso: string }) => {
  const model = useMemo(() => {
    const t0 = Date.parse(MASTER.firstDisbursedDate) - 75 * DAY
    const t1 = Date.parse(MASTER.finalMaturity) + 75 * DAY
    const span = t1 - t0
    const pct = (iso: string) => ((Date.parse(iso) - t0) / span) * 100

    // monthly graduations + yearly figures
    const months: { pct: number; major: boolean; year?: number }[] = []
    const d = new Date(t0)
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() + 1)
    while (d.getTime() < t1) {
      const major = d.getUTCMonth() === 0
      months.push({
        pct: ((d.getTime() - t0) / span) * 100,
        major,
        year: major ? d.getUTCFullYear() : undefined,
      })
      d.setUTCMonth(d.getUTCMonth() + 1)
    }

    const emiStarts = DISBURSEMENTS.map((x) => x.emiStartDate).filter(Boolean) as string[]
    const emiStart = emiStarts.sort()[0] ?? null

    return {
      pct,
      months,
      emiStart,
      disbursements: DISBURSEMENTS.map((x) => ({
        pct: pct(x.disbursedDate),
        color: TRANCHE_VAR[x.color],
        name: x.shortName,
        date: x.disbursedDate,
      })),
      rateChanges: DISBURSEMENTS.flatMap((x) =>
        x.rateChanges.map((rc) => ({
          pct: pct(rc.date),
          color: TRANCHE_VAR[x.color],
          up: rc.to > rc.from,
          title: `${x.shortName} · ${fmtDate(rc.date)} · ${rc.from.toFixed(2)}% → ${rc.to.toFixed(2)}%`,
        })),
      ),
    }
  }, [])

  const todayPct = model.pct(todayIso)
  const yearIndexes = model.months.filter((m) => m.major)

  return (
    <div>
      {/* Two label lanes up top, clear of each other: the today date chip lives
          on the very top line, the gold "emi" flag label sits a lane below it,
          so they never collide even when today's needle reaches the EMI date
          (which used to overlap on the narrower mobile tape). The today needle
          is taller to span from its top chip down past the baseline. */}
      <div className="relative h-[126px] select-none overflow-hidden">
        {/* baseline - elapsed portion prints heavier */}
        <div className="absolute left-0 right-0 top-[78px] h-px bg-line" />
        <div
          className="absolute top-[78px] h-px bg-line-strong"
          style={{ left: 0, width: `${todayPct}%` }}
        />

        {/* monthly graduations */}
        {model.months.map((m, i) => (
          <span
            key={i}
            aria-hidden
            className={clsx('absolute w-px', m.major ? 'bg-line-strong' : 'bg-line')}
            style={{
              left: `${m.pct}%`,
              top: m.major ? '70px' : '74px',
              height: m.major ? '17px' : '9px',
            }}
          />
        ))}

        {/* yearly figures - every other one hidden on narrow screens */}
        {yearIndexes.map((m, i) => (
          <span
            key={m.year}
            className={clsx(
              'absolute top-[92px] -translate-x-1/2 text-[9px] tracking-[0.14em] text-ink-tertiary',
              i % 2 === 1 && 'hidden md:block',
            )}
            style={{ left: `${m.pct}%` }}
          >
            {String(m.year).slice(2)}
          </span>
        ))}

        {/* disbursement diamonds */}
        {model.disbursements.map((dd) => (
          <span key={dd.name} title={`${dd.name} · disbursed ${fmtDate(dd.date)}`}>
            <span
              aria-hidden
              className="absolute w-px"
              style={{ left: `${dd.pct}%`, top: '56px', height: '22px', background: dd.color }}
            />
            <span
              aria-hidden
              className="absolute h-[7px] w-[7px] -translate-x-1/2 rotate-45"
              style={{ left: `${dd.pct}%`, top: '49px', background: dd.color }}
            />
          </span>
        ))}

        {/* rate revision ticks - under the line */}
        {model.rateChanges.map((rc, i) => (
          <span
            key={i}
            title={rc.title}
            aria-hidden
            className="absolute w-px"
            style={{
              left: `${rc.pct}%`,
              top: '80px',
              height: '7px',
              background: rc.up ? 'rgb(var(--c-vermillion))' : 'rgb(var(--c-sage))',
            }}
          />
        ))}

        {/* EMI pennant - label sits in the lower of the two top lanes */}
        {model.emiStart && (
          <span title={`Full EMI begins ${fmtDate(model.emiStart)}`}>
            <span
              aria-hidden
              className="absolute w-px bg-gold"
              style={{ left: `${model.pct(model.emiStart)}%`, top: '42px', height: '36px' }}
            />
            <span
              aria-hidden
              className="absolute"
              style={{
                left: `${model.pct(model.emiStart)}%`,
                top: '42px',
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '9px solid rgb(var(--c-gold))',
              }}
            />
            <span
              className="etch absolute -translate-x-1/2 whitespace-nowrap !text-gold"
              style={{ left: `${model.pct(model.emiStart)}%`, top: '28px' }}
            >
              emi
            </span>
          </span>
        )}

        {/* today needle - taller, running from the top date chip past the baseline */}
        <span
          aria-hidden
          className="absolute w-px bg-vermillion"
          style={{ left: `${todayPct}%`, top: '16px', height: '94px' }}
        />
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap border border-vermillion/50 bg-bg-surface px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.18em] text-vermillion"
          style={{ left: `${todayPct}%`, top: '0px' }}
        >
          {fmtDate(todayIso, 'd MMM yy')}
        </span>
        <span
          aria-hidden
          className="absolute h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-vermillion"
          style={{ left: `${todayPct}%`, top: '107px' }}
        />
      </div>

      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[9px] uppercase tracking-[0.18em] text-ink-tertiary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-[6px] w-[6px] rotate-45 bg-ink-tertiary" /> disbursement
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-[7px] w-px bg-vermillion" />
          <span aria-hidden className="-ml-1 inline-block h-[7px] w-px bg-sage" /> rate revision
        </span>
        <span className="flex items-center gap-1.5 text-gold">⚑ emi begins</span>
        <span className="flex items-center gap-1.5 text-vermillion">│ today</span>
      </div>
    </div>
  )
}
