# Vault — Loan Intelligence Dashboard

A glassmorphic, animated dashboard for tracking a multi-tranche education
loan end-to-end: live outstanding, rate-revision history, full amortization
schedule, payment breakdowns, and analytics.

Built with **Vite + React 19 + TypeScript + Tailwind 3 + Framer Motion +
Recharts**.

## Features

- **6 pages** — Overview, Disbursements, Schedule, Rates, Live, Analytics
- **Light + dark mode** with persistent preference (light is default)
- **Daily rollover** anchored to America/New_York midnight (auto handles
  EDT ↔ EST)
- **Responsive** — slide-out drawer + scaled hero/ring on mobile, untouched
  desktop layout at ≥ 768px
- **Live computation** — outstanding, accrued interest, next-due totals,
  countdown timers all derived from the schedule against the current date
- **Animated entrances** — count-up numbers, draw-on-mount progress arcs,
  staggered list reveals
- **Indian numbering** with `₹` formatting (lakhs / crores)

## Stack

```
Vite 8         React 19         TypeScript 6
Tailwind 3     Framer Motion    Recharts 3
date-fns       lucide-react     clsx
```

## Local development

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

## Build & preview

```bash
npm run build    # type-check + bundle to ./dist
npm run preview  # serve the production build locally
```

## Project layout

```
src/
  App.tsx                  # router + theme/today providers + drawer
  main.tsx                 # Vite entry
  pages/                   # Overview, Disbursements, Schedule, Rates, Live, Analytics
  components/              # Sidebar, LiveOutstandingHero, charts/, ui/
  state/                   # ThemeProvider, TodayProvider (split into useTodayIso/useNow)
  lib/                     # calculations, dates, format, timezone, useChartTick
  data/
    loanData.generated.ts  # auto-generated payment schedule (487 rows)
    loanData.ts            # typed wrapper + display helpers
  index.css                # theme tokens, glass classes, recharts overrides

public/
  .nojekyll                # tells GitHub Pages to skip Jekyll processing
  favicon.svg
  icons.svg

scripts/
  parse-data.mjs           # regenerates loanData.generated.ts from loan_details.txt
```

## Deploying to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and publishes the site
on every push to `main`.

1. Push the repo to GitHub (private repo works on the Student / Pro plan).
2. **Settings → Pages → Source → GitHub Actions**.
3. Push to `main` (or click *Run workflow* in the Actions tab) — the site
   deploys automatically.

`vite.config.ts` sets `base: './'` so the build works at any sub-path
(`https://<user>.github.io/<repo>/`).

## Updating the loan data

The dashboard reads from `src/data/loanData.generated.ts`. To regenerate it
from a fresh `loan_details.txt`, place the source file alongside the
project root and run:

```bash
node scripts/parse-data.mjs
```

The script's `SRC` path is configured in
[`scripts/parse-data.mjs`](./scripts/parse-data.mjs) — adjust it if your
source file lives elsewhere.
