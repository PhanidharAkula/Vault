# Vault — Loan Intelligence Dashboard

A glassmorphic, animated dashboard for tracking a multi-tranche education loan
end-to-end: live outstanding, rate-revision history, full amortization
schedule, and analytics. Built with **Vite + React + TypeScript + Tailwind +
Framer Motion + Recharts**.

## Local development

```bash
npm install
npm run dev    # http://127.0.0.1:5173
```

## Build

```bash
npm run build  # outputs to ./dist
npm run preview
```

## Deploying to GitHub Pages

This repo ships with a GitHub Actions workflow at
`.github/workflows/deploy.yml`. Once the repo is pushed to GitHub:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or click *Run workflow* in the Actions tab) — the site
   builds and deploys automatically.

The Vite config uses `base: './'` so the build works under any path
(`https://<user>.github.io/<repo>/`).

## Updating the loan data

The dashboard reads from `src/data/loanData.generated.ts`, which is built
from `../loan_details.txt` by `scripts/parse-data.mjs`:

```bash
node scripts/parse-data.mjs
```
