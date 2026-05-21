import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  Percent,
  Activity,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react'
import clsx from 'clsx'
import { DISBURSEMENTS, MASTER } from '../data/loanData'
import { fmtDateLong } from '../lib/dates'
import { clockString, zoneShortName } from '../lib/timezone'
import { useNow, useTodayIso } from '../state/today'
import { useTheme } from '../state/theme'

export type RouteKey = 'overview' | 'disbursements' | 'schedule' | 'rates' | 'live' | 'analytics'

const ITEMS: { key: RouteKey; label: string; icon: React.ComponentType<{ className?: string; size?: number }>; hint: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Snapshot' },
  { key: 'disbursements', label: 'Disbursements', icon: Wallet, hint: `${DISBURSEMENTS.length} tranches` },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays, hint: 'Amortization' },
  { key: 'rates', label: 'Rate History', icon: Percent, hint: 'Interest moves' },
  { key: 'live', label: 'Live View', icon: Activity, hint: 'Real-time' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, hint: 'Insights' },
]

const Sidebar = ({
  route,
  onNavigate,
  drawerOpen = false,
}: {
  route: RouteKey
  onNavigate: (k: RouteKey) => void
  /** Drawer state for mobile (`< md`). Ignored on `md+` where the sidebar is permanent. */
  drawerOpen?: boolean
  /** Reserved — drawer is closed by route changes (handled in App.tsx) and by tapping the backdrop. */
  onCloseDrawer?: () => void
}) => {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-white/[0.05] bg-bg-surface/95 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:bg-bg-surface/60 md:translate-x-0',
        drawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-6">
        <div className="relative h-9 w-9 overflow-hidden rounded-xl ring-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400 via-accent-violet to-accent-cyan" />
          <div className="absolute inset-0 grid place-items-center text-bg-base">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M4 16l5-7 5 4 6-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="4" r="1.6" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div>
          <div className="font-display text-lg font-semibold tracking-tight">Vault</div>
          <div className="-mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-tertiary">
            Loan Intelligence
          </div>
        </div>
      </div>

      {/* Account chip */}
      <div className="mx-4 mt-6 rounded-2xl border border-white/[0.06] bg-bg-elevated/50 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500/30 to-accent-violet/30 text-sm font-semibold ring-1 ring-white/10">
            {MASTER.applicantName
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{MASTER.applicantName}</div>
            <div className="truncate font-mono text-[10px] text-ink-tertiary">
              {MASTER.applicationNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-6 flex-1 px-3">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = route === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={clsx(
                'group relative my-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                active ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary',
              )}
            >
              {active && (
                <motion.div
                  layoutId="navActive"
                  className="absolute inset-0 -z-0 rounded-xl bg-white/[0.04] ring-1 ring-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                size={17}
                className={clsx(
                  'relative z-10 transition-colors',
                  active ? 'text-brand-300' : 'text-ink-tertiary group-hover:text-ink-secondary',
                )}
              />
              <span className="relative z-10 flex-1 font-medium">{item.label}</span>
              <span className="relative z-10 text-[10px] font-medium tracking-wide text-ink-muted">
                {item.hint}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer · theme toggle + live system clock.
          Extra bottom padding on mobile/tablet so the LiveSystem card clears
          iOS Safari's collapsing bottom toolbar (which eats viewport height
          even on iPad). Full desktop (`lg+`) keeps the original 24px. */}
      <div className="space-y-3 px-4 pb-14 pt-4 lg:pb-6">
        <ThemeToggle />
        <LiveSystemCard />
      </div>
    </aside>
  )
}

const ThemeToggle = () => {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="group relative flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-bg-elevated/40 p-1.5 text-sm transition hover:border-white/[0.12]"
    >
      {/* Sliding pill */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 480, damping: 32 }}
        className={clsx(
          'absolute top-1.5 bottom-1.5 w-[calc(50%-0.5rem)] rounded-xl',
          isDark
            ? 'right-1.5 bg-gradient-to-br from-brand-500/30 to-accent-violet/30 ring-1 ring-white/10'
            : 'left-1.5 bg-gradient-to-br from-amber-200/60 to-amber-100/60 ring-1 ring-amber-300/40',
        )}
      />
      <div
        className={clsx(
          'relative z-10 flex flex-1 items-center justify-center gap-2 py-1.5 transition',
          isDark ? 'text-ink-tertiary' : 'text-amber-700 dark:text-amber-200',
        )}
      >
        <Sun size={14} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Light</span>
      </div>
      <div
        className={clsx(
          'relative z-10 flex flex-1 items-center justify-center gap-2 py-1.5 transition',
          isDark ? 'text-ink-primary' : 'text-ink-tertiary',
        )}
      >
        <Moon size={14} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Dark</span>
      </div>
    </button>
  )
}

const LiveSystemCard = () => {
  const todayIso = useTodayIso()
  const now = useNow()
  const time = clockString(undefined, now)
  const tz = zoneShortName(undefined, now)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-bg-elevated/40 p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-emerald" />
        Live system
      </div>
      <div className="mt-2.5 text-sm font-semibold text-ink-primary">
        {fmtDateLong(todayIso)}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[13px] text-ink-secondary tabular">{time}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
          {tz}
        </span>
      </div>
      <div className="mt-2.5 border-t border-white/[0.05] pt-2.5 text-[11px] leading-relaxed text-ink-tertiary">
        Outstanding rolls forward at midnight {tz}. No refresh needed.
      </div>
    </div>
  )
}

export default Sidebar
