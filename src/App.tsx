import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
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

  // Needed so the drawer can dim the browser chrome (status bar / address bar)
  // to a tone that matches the active theme's darkened backdrop.
  const { theme } = useTheme()

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

  // Close the drawer when the viewport reaches md+ (e.g. phone rotated to
  // landscape), where the rail is permanent - otherwise the scroll lock below
  // would stay engaged on a layout that has no drawer to dismiss it.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => mq.matches && setDrawerOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Lock the page + blend the browser chrome while the mobile drawer is open.
  //
  // iOS Safari ignores `overflow: hidden` on <body> for touch scrolling, so the
  // page kept rubber-band scrolling behind the drawer and bled through the
  // top/bottom safe areas (status bar + address bar). Pinning the body with
  // `position: fixed` at the current offset freezes it AND - by resetting the
  // scroll to 0 - lets the fixed backdrop cover the whole screen solidly, safe
  // areas included (at a non-zero offset iOS leaves those edges transparent).
  // The side effect of that scroll reset (Framer animating the active-nav
  // highlight across the delta) is handled in Sidebar.tsx by dropping its
  // shared-layout animation.
  //
  // We also retint <meta theme-color> to a darkened tone so the status bar and
  // address bar match the dimmed backdrop instead of staying bright; restored
  // to the theme's base colour on close.
  useEffect(() => {
    if (!drawerOpen) return
    const { body } = document
    const scrollY = window.scrollY
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    const dim = theme === 'dark' ? '#050403' : '#605d58'
    const base = theme === 'dark' ? '#0d0b08' : '#efe9dc'
    const setChrome = (c: string) =>
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((m) => (m.content = c))
    setChrome(dim)

    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, scrollY)
      setChrome(base)
    }
  }, [drawerOpen, theme])

  // Scroll to top in the gap between exit and enter - invisible to the user.
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
      {/* Ledger margin rule - the vermillion line every ruled page carries.
          Pinned just inside the content gutter; desktop only. */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 top-0 z-0 hidden w-px bg-vermillion/25 md:block"
        style={{ left: 'calc(260px + 22px)' }}
      />

      {/* Hamburger toggle - shown only below md, AND only while the drawer
          is closed (the user closes it by tapping the backdrop or Escape). */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open index"
          aria-expanded={false}
          className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center border border-line-strong bg-bg-surface/95 text-ink-primary shadow-float backdrop-blur-sm md:hidden"
        >
          <span aria-hidden className="flex w-4 flex-col gap-[4px]">
            <span className="h-px w-full bg-current" />
            <span className="h-px w-3/4 bg-current" />
            <span className="h-px w-full bg-current" />
          </span>
        </button>
      )}

      {/* Quick toggles - mobile only. Currency sits to the left of theme.
          Desktop has the full switches inside the sidebar. */}
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
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar route={route} onNavigate={navigate} drawerOpen={drawerOpen} />

      {/* Main content. `ml-0` on mobile (drawer overlays); `ml-[260px]` on md+
          where the rail is permanently in flow. `pt-20` on mobile clears the
          floating hamburger; `pt-8` on md+. */}
      <main className="relative ml-0 min-w-0 max-w-full flex-1 overflow-x-clip md:ml-[260px]">
        <div className="overflow-x-clip px-4 pb-16 pt-20 md:px-10 md:pt-8">
          <AnimatePresence mode="wait" initial={false} onExitComplete={handleExitComplete}>
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
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
      className="grid h-10 w-10 place-items-center border border-line-strong bg-bg-surface/95 shadow-float backdrop-blur-sm"
    >
      {isDark ? (
        <Moon size={17} className="text-gold" />
      ) : (
        <Sun size={17} className="text-vermillion" />
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
      className="grid h-10 w-10 place-items-center border border-line-strong bg-bg-surface/95 text-[15px] font-semibold shadow-float backdrop-blur-sm"
    >
      <span className={isUSD ? 'text-cerulean' : 'text-sage'}>{isUSD ? '$' : '₹'}</span>
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
