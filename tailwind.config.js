/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Theme-aware surfaces & ink — values come from CSS variables defined
        // in src/index.css and flip on `[data-theme="light"]` / `[data-theme="dark"]`.
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          border: 'rgb(var(--bg-border) / <alpha-value>)',
        },
        ink: {
          primary: 'rgb(var(--ink-primary) / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--ink-tertiary) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
        },
        // Brand & accent palettes are stable across themes.
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          violet: '#a78bfa',
          cyan: '#22d3ee',
          emerald: '#34d399',
          amber: '#fbbf24',
          rose: '#fb7185',
          pink: '#f472b6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-1':
          'radial-gradient(at 20% 0%, rgba(99,102,241,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(168,85,247,0.14) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(34,211,238,0.10) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(244,114,182,0.10) 0px, transparent 50%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px -8px rgba(99,102,241,0.35)',
        'glow-violet': '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px -8px rgba(167,139,250,0.45)',
        'glow-cyan': '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px -8px rgba(34,211,238,0.45)',
        'glow-emerald': '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px -8px rgba(52,211,153,0.45)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(99,102,241,0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 6s linear infinite',
        floatY: 'floatY 4s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
