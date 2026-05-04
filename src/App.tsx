import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Sidebar, { type RouteKey } from './components/Sidebar'
import OverviewPage from './pages/Overview'
import DisbursementsPage from './pages/Disbursements'
import SchedulePage from './pages/Schedule'
import RatesPage from './pages/Rates'
import LivePage from './pages/Live'
import AnalyticsPage from './pages/Analytics'
import { TodayProvider } from './state/today'
import { ThemeProvider } from './state/theme'

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

  // Mobile sidebar drawer state — only matters below `md` (768px). On `md+`
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

  // Scroll to top in the gap between exit and enter — invisible to the user.
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
      {/* Hamburger toggle — shown only below md.  Tucked into the corner
          where the page heading begins; sits above the sidebar/backdrop in
          the stack so it's always reachable. */}
      <button
        type="button"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={drawerOpen}
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-bg-elevated/80 text-ink-primary shadow-lg backdrop-blur-md md:hidden"
      >
        {drawerOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop — only on mobile when drawer is open. */}
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
        <div className="overflow-x-clip px-4 pb-16 pt-16 md:px-8 md:pt-8">
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

export default function App() {
  return (
    <ThemeProvider>
      <TodayProvider>
        <PageRouter />
      </TodayProvider>
    </ThemeProvider>
  )
}
