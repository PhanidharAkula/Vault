import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Moon, Sun } from 'lucide-react'
import Sidebar, { type RouteKey } from './components/Sidebar'
import OverviewPage from './pages/Overview'
import DisbursementsPage from './pages/Disbursements'
import SchedulePage from './pages/Schedule'
import RatesPage from './pages/Rates'
import LivePage from './pages/Live'
import AnalyticsPage from './pages/Analytics'
import { TodayProvider } from './state/today'
import { ThemeProvider, useTheme } from './state/theme'
import { CurrencyProvider, useCurrency } from './state/currency'

const VALID_ROUTES: RouteKey[] = ['overview', 'disbursements', 'schedule', 'rates', 'live', 'analytics']

const initialRoute = (): RouteKey => {
  if (typeof window === 'undefined') return 'overview'
  const h = window.location.hash.replace('#', '')
  return VALID_ROUTES.includes(h as RouteKey) ? (h as RouteKey) : 'overview'
}

const PageRouter = () => {
  const [route, setRoute] = useState<RouteKey>(initialRoute)

  // Allow opening a specific disbursement detail
  const [selectedDisbursement, setSelectedDisbursement] = useState<number | null>(null)

  // Mobile sidebar drawer state - only matters below `md` (768px). On `md+`
  // the sidebar is permanently visible and this flag is ignored.
  const [drawerOpen, setDrawerOpen] = useState(false)

  // bind hash for shareable routes
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace('#', '')
      if (VALID_ROUTES.includes(h as RouteKey)) {
        setRoute(h as RouteKey)
      }
    }
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  const navigate = (next: RouteKey) => {
    if (next === route) {
      setDrawerOpen(false)
      return
    }
    setDrawerOpen(false) // close mobile drawer on navigation
    setRoute(next)
    window.location.hash = next
  }

  // Close drawer on `Escape` for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [drawerOpen])

  // Scroll to top in the gap between exit and enter - invisible to the user.
  // Doing it before setRoute makes the current page visibly jump to the top
  // before fading out; doing it after the new page mounts feels late.
  // `onExitComplete` fires when the old motion.div has finished exiting, but
  // before the new one starts entering.
  const handleExitComplete = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  const page = useMemo(() => {
    switch (route) {
      case 'overview':
        return (
          <OverviewPage
            onOpenDisbursement={(idx) => {
              setSelectedDisbursement(idx)
              navigate('disbursements')
            }}
          />
        )
      case 'disbursements':
        return (
          <DisbursementsPage
            initialIndex={selectedDisbursement}
            onConsumeInitial={() => setSelectedDisbursement(null)}
          />
        )
      case 'schedule':
        return <SchedulePage />
      case 'rates':
        return <RatesPage />
      case 'live':
        return <LivePage />
      case 'analytics':
        return <AnalyticsPage />
    }
  }, [route, selectedDisbursement])

  return (
    <div className="relative flex min-h-screen">
      {/* background mesh */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-mesh-1 opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-[0.35]"
        aria-hidden
      />
      {/* Hamburger toggle - shown only below md, AND only while the drawer
          is closed. When the drawer is open the user closes it by tapping
          the backdrop or pressing Escape, so an explicit close button would
          just overlap the sidebar's own logo. */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={false}
          className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-bg-elevated/80 text-ink-primary shadow-lg backdrop-blur-md md:hidden"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Quick toggles - mobile only. Mirrors the hamburger on the right so
          the top bar feels balanced. Currency sits to the left of theme.
          Desktop has the full pills inside the sidebar. */}
      {!drawerOpen && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 md:hidden">
          <MobileCurrencyButton />
          <MobileThemeButton />
        </div>
      )}

      {/* Backdrop - only on mobile when drawer is open. */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar route={route} onNavigate={navigate} drawerOpen={drawerOpen} />

      {/* Main content. `ml-0` on mobile (drawer overlays); `ml-[260px]` on md+
          where the sidebar is permanently in flow. `pt-16` on mobile to clear
          the floating hamburger; `pt-8` on md+ where there's no hamburger. */}
      <main className="ml-0 min-w-0 max-w-full flex-1 overflow-x-clip md:ml-[260px]">
        <div className="overflow-x-clip px-4 pb-16 pt-20 md:px-8 md:pt-8">
          <AnimatePresence mode="wait" initial={false} onExitComplete={handleExitComplete}>
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {page}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

const MobileThemeButton = () => {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-bg-elevated/80 shadow-lg backdrop-blur-md transition-colors"
    >
      {isDark ? (
        <Moon size={18} className="text-brand-300" />
      ) : (
        <Sun size={18} className="text-accent-amber" />
      )}
    </button>
  )
}

const MobileCurrencyButton = () => {
  const { currency, toggle } = useCurrency()
  const isUSD = currency === 'USD'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Display amounts in ${isUSD ? 'INR' : 'USD'}`}
      className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-bg-elevated/80 font-mono text-[15px] font-semibold shadow-lg backdrop-blur-md transition-colors"
    >
      <span className={isUSD ? 'text-brand-300' : 'text-accent-emerald'}>
        {isUSD ? '$' : '₹'}
      </span>
    </button>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <TodayProvider>
          <PageRouter />
        </TodayProvider>
      </CurrencyProvider>
    </ThemeProvider>
  )
}
