# Vault

A private loan ledger styled as an engraved banking instrument: part bond
certificate, part terminal, part Swiss measuring instrument. It tracks a
multi-tranche education loan end to end: live outstanding, rate-revision
history, a full amortization schedule, payment breakdowns, and analytics.

Built with React, TypeScript, Tailwind, Framer Motion, and Recharts.

## The design language

Two registers of the same instrument:

- **Night desk** (dark, default): bone-black desk, brass, vermillion, lamplight ink
- **Day ledger** (light): aged paper, iron-gall ink, the ruled margin line

Signature pieces:

- **The odometer**: outstanding balance as mechanical rolling digit wheels,
  ticking every second with real intra-day accrual (the paise wheels never stop)
- **The tape**: the entire term as one graduated measuring strip with
  disbursement diamonds, rate-revision ticks, the EMI pennant, and today's needle
- **Needle gauges**: 240° graduated dials with counterweighted needles
- **Split-flap countdown**: rolling wheels with a flap hinge, to the next due date
- **The escapement**: a 60-graduation seconds dial; interest never sleeps
- **Rubber stamps**: months print SETTLED or CURRENT as they pass
- **Plates and registration ticks**: every module sits on a flat engraved panel
  with corner marks, figure headers, and hairline measurement rules
- **Guilloche rosettes**: banknote ornaments, one revolution every 90 seconds

Typography pairs **Fraunces** (a serif, for ceremonial numerals and titles)
with **Spline Sans Mono** (the voice of the machine). Tranche inks are gold,
cerulean, sage, and plum, with vermillion for debits and sage for credits, all
theme-aware.

## Features

- **Six plates**: Overview, Disbursements, Schedule, Rate registry, Live desk, and Analytics
- **Night and day themes** with a persistent preference (night is the default)
- **INR / USD toggle** backed by a live FX rate, while every calculation stays in INR
- **Daily rollover** anchored to local midnight, so the ledger turns itself
- **Live computation**: outstanding balance, accrued interest, next-due totals,
  per-second accrual, and countdown timers, all derived from the schedule
- **Real-time view**: a per-second meter, per-tranche accrual engines, and a
  combined countdown to the next payment
- **Responsive**: a slide-out index drawer on mobile, a permanent rail on desktop
- **Indian numbering** with rupee formatting in lakhs and crores
