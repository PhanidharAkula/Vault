// Generates public/og.png, the social-preview card, with today's live
// outstanding baked in. Run by `npm run og` - locally to refresh, and in CI
// (see .github/workflows/deploy.yml) on a daily cron so the deployed card
// tracks the loan's daily rollover.
//
// The figure is computed with the app's OWN logic (`computeAggregate`), so the
// card can never drift from what the dashboard shows. Rendering is done with
// the real fonts via headless Chrome (puppeteer-core driving the system/CI
// Chrome - no bundled Chromium download).

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import { computeAggregate } from '../src/lib/calculations'
import { todayInZone } from '../src/lib/timezone'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/og.png')

// Locate Chrome. CI sets CHROME_PATH; otherwise probe the usual spots.
const chromePath = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].find((p): p is string => !!p && existsSync(p))

if (!chromePath) {
  throw new Error('No Chrome/Chromium found. Set CHROME_PATH to its executable.')
}

// Today is resolved in the runtime's zone (CI sets TZ); the figure is the same
// "today's outstanding" the dashboard renders.
const today = todayInZone()
const inrOutstanding = computeAggregate(today).totalCurrentOutstanding

// Convert to USD using the same live FX source the app uses, falling back to
// the app's static rate (FALLBACK_INR_PER_USD) when the network is unavailable.
const fetchInrPerUsd = async (): Promise<number> => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = (await res.json()) as { rates?: { INR?: number } }
      const inr = data?.rates?.INR
      if (typeof inr === 'number' && inr > 0) return inr
    }
  } catch {
    /* offline - fall through to the static rate */
  }
  return 96
}
const inrPerUsd = await fetchInrPerUsd()
const figure =
  '$' +
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    inrOutstanding / inrPerUsd,
  )

const html = /* html */ `<!doctype html>
<html><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Spline+Sans+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden; background: #0d0b08;
    font-family: 'Spline Sans Mono', monospace; color: #eae2ce;
    background-image: repeating-linear-gradient(180deg, transparent 0, transparent 41px, rgba(234,226,206,0.028) 41px, rgba(234,226,206,0.028) 42px);
  }
  .wash { position: absolute; inset: 0; background:
      radial-gradient(120% 80% at 78% 18%, rgba(210,168,75,0.10), transparent 55%),
      radial-gradient(140% 120% at 50% 130%, rgba(0,0,0,0.55), transparent 55%); }
  .frame { position: absolute; inset: 30px; border: 1px solid rgba(210,168,75,0.45); }
  .tick { position: absolute; width: 14px; height: 14px; border: 0 solid rgba(210,168,75,0.85); }
  .tl { top: 24px; left: 24px; border-top-width: 2px; border-left-width: 2px; }
  .tr { top: 24px; right: 24px; border-top-width: 2px; border-right-width: 2px; }
  .bl { bottom: 24px; left: 24px; border-bottom-width: 2px; border-left-width: 2px; }
  .br { bottom: 24px; right: 24px; border-bottom-width: 2px; border-right-width: 2px; }
  .rosette { position: absolute; right: -150px; top: 50%; transform: translateY(-50%); opacity: 0.85; }
  .content { position: absolute; left: 84px; top: 0; height: 100%; width: 720px; display: flex; flex-direction: column; justify-content: center; }
  .tag { font-size: 16px; font-weight: 600; letter-spacing: 0.34em; text-transform: uppercase; color: #d2a84b; }
  .word { font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: 188px; line-height: 0.9; letter-spacing: -0.02em; color: #eae2ce; margin-top: 18px; }
  .word .dot { color: #e25c3a; }
  .rule { position: relative; height: 1px; width: 360px; background: rgba(234,226,206,0.18); margin: 30px 0 26px; }
  .rule::before, .rule::after { content:''; position:absolute; top:-3px; width:1px; height:7px; background: rgba(234,226,206,0.5); }
  .rule::before { left: 0; } .rule::after { right: 0; }
  .tagline { font-family: 'Fraunces', serif; font-style: italic; font-weight: 400; font-size: 40px; color: #a89e86; letter-spacing: 0.01em; }
  .feats { margin-top: 22px; font-size: 15px; letter-spacing: 0.13em; text-transform: uppercase; color: #756d58; white-space: nowrap; }
  .feats b { color: #a89e86; font-weight: 500; }
  .meter { margin-top: 40px; display: flex; align-items: center; gap: 14px; }
  .meter .lbl { font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #756d58; line-height: 1; }
  .meter .val { font-size: 34px; font-weight: 600; color: #d2a84b; letter-spacing: 0.01em; line-height: 1; }
  .meter .live { width: 9px; height: 9px; border-radius: 50%; background: #e25c3a; flex: none; }
</style></head>
<body>
  <div class="wash"></div>
  <svg class="rosette" width="620" height="620" viewBox="0 0 100 100" aria-hidden="true">
    <g id="p"></g>
    <circle cx="50" cy="50" r="47" fill="none" stroke="#d2a84b" stroke-width="0.32" opacity="0.5"/>
    <circle cx="50" cy="50" r="44.5" fill="none" stroke="#d2a84b" stroke-width="0.22" opacity="0.35"/>
    <circle cx="50" cy="50" r="9" fill="none" stroke="#d2a84b" stroke-width="0.32" opacity="0.5"/>
  </svg>
  <div class="frame"></div>
  <span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>
  <div class="content">
    <div class="tag">Private loan ledger</div>
    <div class="word">Vault<span class="dot">.</span></div>
    <div class="rule"></div>
    <div class="tagline">An engraved banking instrument</div>
    <div class="feats"><b>Outstanding</b> &#183; amortization &#183; rates &#183; <b>live desk</b> &#183; analytics</div>
    <div class="meter">
      <span class="live"></span>
      <span class="lbl">Live outstanding</span>
      <span class="val">${figure}</span>
    </div>
  </div>
  <script>
    var p = document.getElementById('p'), N = 22, ns = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < N; i++) {
      var e = document.createElementNS(ns, 'ellipse');
      e.setAttribute('cx','50'); e.setAttribute('cy','50');
      e.setAttribute('rx','40'); e.setAttribute('ry','13.5');
      e.setAttribute('fill','none'); e.setAttribute('stroke','#d2a84b');
      e.setAttribute('stroke-width','0.28'); e.setAttribute('opacity','0.5');
      e.setAttribute('transform','rotate(' + (180 / N * i) + ' 50 50)');
      p.appendChild(e);
    }
  </script>
</body></html>`

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
  // Wait for the web fonts to load and apply before snapping (preconnect-style
  // networkidle never settles, so gate on document.fonts instead).
  await page.evaluate(async () => {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready
  })
  await new Promise((r) => setTimeout(r, 250))
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } })
  console.log(`og.png written: ${figure} (as of ${today})`)
} finally {
  await browser.close()
}
