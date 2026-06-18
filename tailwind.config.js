/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Scope every `hover:*` utility to `@media (hover: hover)`. Touch devices
  // (where the OS reports no hover capability) skip hover styles entirely, so
  // tapping a card on a phone doesn't briefly trigger a hover flash.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      fontFamily: {
        // The entire instrument speaks mono; serif is reserved for titles and
        // ceremonial numerals. Both load in src/index.css.
        sans: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // Theme-aware surfaces & ink - values come from CSS variables defined
        // in src/index.css and flip on `[data-theme="light"]` / `[data-theme="dark"]`.
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
        },
        ink: {
          primary: 'rgb(var(--ink-primary) / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--ink-tertiary) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
        },
        // Hairlines. `line` is the default rule weight; `line-strong` for
        // emphasized frames (active states, table heads).
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        // Accent inks - theme-aware RGB triplets so tints (`bg-gold/10`) work.
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        cerulean: 'rgb(var(--c-cerulean) / <alpha-value>)',
        sage: 'rgb(var(--c-sage) / <alpha-value>)',
        plum: 'rgb(var(--c-plum) / <alpha-value>)',
        vermillion: 'rgb(var(--c-vermillion) / <alpha-value>)',
      },
      boxShadow: {
        // Paper sits flat; depth only for things that truly float.
        float: '0 16px 48px -12px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)',
        drawer: '12px 0 48px -12px rgba(0, 0, 0, 0.55)',
      },
      letterSpacing: {
        plate: '0.22em',
      },
    },
  },
  plugins: [],
}
