import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { MASTER } from '../data/loanData'
import { fmtDate } from '../lib/dates'
import { clockString, zoneShortName } from '../lib/timezone'
import { useNow, useTodayIso } from '../state/today'
import { useTheme } from '../state/theme'
import { useCurrency } from '../state/currency'
import { Guilloche } from './ui/decor'

export type RouteKey = 'overview' | 'disbursements' | 'schedule' | 'rates' | 'live' | 'analytics'

const ITEMS: { key: RouteKey; label: string; hint: string }[] = [
  { key: 'overview', label: 'Overview', hint: 'master' },
  { key: 'disbursements', label: 'Disbursements', hint: `tranches` },
  { key: 'schedule', label: 'Schedule', hint: 'amortization' },
  { key: 'rates', label: 'Rate registry', hint: 'revisions' },
  { key: 'live', label: 'Live desk', hint: 'realtime' },
  { key: 'analytics', label: 'Analytics', hint: 'composition' },
]

// True at md+ where the rail is permanent. Used to pick the active-link
// animation: a shared-layout slide on desktop, a plain fade on mobile (where
// the drawer's body-pin scroll-lock would make a layout slide fly in from the
// bottom). Updates on resize so rotating a phone to landscape switches modes.
const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

// The active-nav highlight. On desktop it carries `layoutId` so it slides
// between items; on mobile it just fades in (no viewport-position projection,
// so the drawer's scroll-lock can't fling it across the screen).
const ActiveHighlight = ({ slide }: { slide: boolean }) => (
  <motion.div
    {...(slide
      ? { layoutId: 'navActive', transition: { type: 'spring', stiffness: 420, damping: 34 } }
      : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } })}
    className="absolute inset-0 border border-line bg-bg-elevated"
  >
    <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-vermillion" />
  </motion.div>
)

const Sidebar = ({
  route,
  onNavigate,
  drawerOpen = false,
}: {
  route: RouteKey
  onNavigate: (k: RouteKey) => void
  /** Drawer state for mobile (`< md`). Ignored on `md+` where the rail is permanent. */
  drawerOpen?: boolean
  /** Reserved - drawer is closed by route changes (handled in App.tsx) and by tapping the backdrop. */
  onCloseDrawer?: () => void
}) => {
  const isDesktop = useIsDesktop()
  return (
    <aside
      className={clsx(
        // `h-screen` (a fixed 100vh) keeps the rail height scroll-independent -
        // `100dvh` shifts as Safari's address bar hides/shows while scrolling,
        // which reflowed the nav and made the active-link highlight animate in
        // from offscreen when the drawer was opened mid-scroll. The page scroll
        // is frozen by the body lock in App.tsx, so the safe areas stay covered.
        'fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-line bg-bg-surface transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0',
        drawerOpen ? 'translate-x-0 shadow-drawer' : '-translate-x-full md:translate-x-0',
      )}
    >
      {/* Wordmark - top padding clears the status bar / dynamic island, while
          the rail's surface still extends to the very top edge behind it. */}
      <div className="relative overflow-hidden border-b border-line px-6 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 opacity-60"
        >
          <Guilloche size={120} petals={14} opacity={0.4} />
        </div>
        <div className="relative">
          <div className="font-display text-[28px] font-medium italic leading-none tracking-tight text-ink-primary">
            Vault<span className="text-vermillion">.</span>
          </div>
          <div className="etch mt-2">Private loan ledger</div>
        </div>
      </div>

      {/* Account plate */}
      <div className="border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center border border-line-strong font-display text-sm font-medium text-gold">
            {MASTER.applicantName
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold tracking-wide text-ink-primary">
              {MASTER.applicantName}
            </div>
            <div className="mt-0.5 truncate text-[10px] tracking-[0.08em] text-ink-tertiary">
              № {MASTER.applicationNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Index */}
      <nav className="mt-4 flex-1 px-3">
        <div className="etch px-3 pb-2">Index</div>
        {ITEMS.map((item, i) => {
          const active = route === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={clsx(
                'group relative my-px flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors',
                active ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {active && <ActiveHighlight slide={isDesktop} />}
              <span
                className={clsx(
                  'relative z-10 text-[10px] tabular tracking-[0.1em]',
                  active ? 'text-gold' : 'text-ink-muted group-hover:text-ink-tertiary',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="relative z-10 flex-1 font-medium tracking-wide">{item.label}</span>
              <span className="relative z-10 text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                {item.hint}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer - switches + chronometer.
          Extra bottom padding on mobile/tablet so the chronometer clears iOS
          Safari's collapsing bottom toolbar. Desktop (`lg+`) keeps 24px. */}
      <div className="space-y-3 px-4 pb-14 pt-4 lg:pb-6">
        {/* Theme + currency switches live in the mobile top bar (App.tsx)
            below md, so they're hidden here on mobile to avoid duplication. */}
        <div className="hidden space-y-2 md:block">
          <ThemeSwitch />
          <CurrencySwitch />
        </div>
        <Chronometer />
      </div>
    </aside>
  )
}

/** Two-position mechanical switch - the sliding block prints solid ink. */
const SlideSwitch = ({
  left,
  right,
  isRight,
  onToggle,
  ariaLabel,
}: {
  left: React.ReactNode
  right: React.ReactNode
  isRight: boolean
  onToggle: () => void
  ariaLabel: string
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={ariaLabel}
    className="relative flex w-full items-stretch border border-line bg-bg-base p-[3px]"
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 520, damping: 38 }}
      className={clsx(
        'absolute bottom-[3px] top-[3px] w-[calc(50%-3px)] bg-ink-primary',
        isRight ? 'right-[3px]' : 'left-[3px]',
      )}
    />
    <span
      className={clsx(
        'relative z-10 flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors',
        !isRight ? 'text-bg-base' : 'text-ink-tertiary',
      )}
    >
      {left}
    </span>
    <span
      className={clsx(
        'relative z-10 flex flex-1 items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors',
        isRight ? 'text-bg-base' : 'text-ink-tertiary',
      )}
    >
      {right}
    </span>
  </button>
)

const ThemeSwitch = () => {
  const { theme, toggle } = useTheme()
  return (
    <SlideSwitch
      ariaLabel={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      left={<><Sun size={13} />Day</>}
      right={<><Moon size={13} />Night</>}
      isRight={theme === 'dark'}
      onToggle={toggle}
    />
  )
}

const CurrencySwitch = () => {
  const { currency, toggle, rate } = useCurrency()
  return (
    <div>
      <SlideSwitch
        ariaLabel={`Display amounts in ${currency === 'USD' ? 'INR' : 'USD'}`}
        left={<>$ USD</>}
        right={<>₹ INR</>}
        isRight={currency === 'INR'}
        onToggle={toggle}
      />
      {/* Surface the live rate so the conversion is auditable. */}
      <div className="mt-1.5 text-center text-[9px] tracking-[0.12em] text-ink-tertiary">
        1 USD ≈ ₹{rate.toFixed(2)}
      </div>
    </div>
  )
}

const Chronometer = () => {
  const todayIso = useTodayIso()
  const now = useNow()
  const time = clockString(undefined, now)
  const [hh, mm, ss] = time.split(':')
  const tz = zoneShortName(undefined, now)

  return (
    <div className="border border-line bg-bg-base px-4 py-3.5">
      <div className="etch flex items-center gap-2">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sage" />
        Chronometer
      </div>
      <div className="mt-2 text-xs font-semibold tracking-wide text-ink-primary">
        {fmtDate(todayIso, 'EEE, d MMMM yyyy')}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[15px] font-medium tabular text-gold">
          {hh}
          <span className="blink">:</span>
          {mm}
          <span className="blink">:</span>
          {ss}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">{tz}</span>
      </div>
      <div className="mt-2.5 border-t border-line pt-2 text-[10px] leading-relaxed text-ink-tertiary">
        The ledger turns at midnight. No refresh needed.
      </div>
    </div>
  )
}

export default Sidebar
