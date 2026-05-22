import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'light' | 'dark'

type ThemeCtx = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)
const STORAGE_KEY = 'vault.theme'

const readInitial = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  // The bootstrap script in index.html has already written `data-theme` based on
  // (a) the `?theme=…` URL param or (b) localStorage, so reading the DOM picks
  // up whichever wins. Falling back to the storage check for SSR/edge cases.
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'dark' || fromDom === 'light') return fromDom
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* localStorage unavailable */
  }
  return 'light'
}

// Page-background hex per theme - kept in sync with the `--bg-base` token in
// `src/index.css`. Updating the `theme-color` meta makes iOS Safari's URL bar
// and the bottom toolbar paint with this colour instead of leaving a
// translucent overlay across the safe-area edges.
const THEME_COLOR: Record<Theme, string> = {
  light: '#f7f8fb',
  dark: '#07080d',
}

const apply = (theme: Theme) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  // Replace any existing static `<meta name="theme-color">` tags with one
  // unmedia-queried entry so the in-app toggle (not just the OS-level
  // prefers-color-scheme) drives Safari's chrome colour.
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.parentNode?.removeChild(el))
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = THEME_COLOR[theme]
  document.head.appendChild(meta)
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(readInitial)

  // Apply on mount and whenever theme changes.
  useEffect(() => {
    apply(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = (): ThemeCtx => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTheme outside ThemeProvider')
  return v
}
