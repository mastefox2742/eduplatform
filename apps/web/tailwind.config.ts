import type { Config } from 'tailwindcss'

/**
 * Palette Projetto1 — alignée sur les maquettes.
 *
 * Deux familles cohabitent volontairement :
 *
 *  1. Les tokens sémantiques (`bg-card`, `text-muted-foreground`,
 *     `border-border`…) — c'est ce que les maquettes utilisent, et
 *     ce que le nouveau code doit employer.
 *
 *  2. Les échelles numériques (`primary-600`, `danger-500`…) que les
 *     ~12 000 lignes de JSX existantes utilisent déjà. Plutôt que de
 *     les réécrire, on les **remappe** sur la nouvelle identité :
 *     `primary-600` vaut désormais le bleu des maquettes. Tout le
 *     code hérité adopte le style sans être touché.
 *
 * Les échelles sont construites autour des couleurs de référence :
 *   primary   #145DA0   bleu institutionnel
 *   secondary #0F766E   teal (réussite, validé, recouvrement)
 *   accent    #F4A62A   ambre (attention, XP, en attente)
 *   destructive #C2413B rouge (impayé, sanction, urgent)
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Tokens sémantiques (maquettes) ──────────────────── */
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        },
        popover: 'rgb(var(--card-rgb) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--muted-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground-rgb) / <alpha-value>)',
          50:  '#FEF7E8',
          100: '#FDECC8',
          500: '#F4A62A',
          600: '#DB8F14',
          700: '#A96A0C',
        },
        destructive: 'rgb(var(--destructive-rgb) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        input: 'rgb(var(--input-rgb) / <alpha-value>)',
        ring: 'rgb(var(--ring-rgb) / <alpha-value>)',

        /* ── Échelles remappées sur l'identité ───────────────── */
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
          50:  '#EDF4FA',
          100: '#D3E4F2',
          200: '#A8C9E5',
          300: '#7CAED8',
          400: '#4F8FC4',
          500: '#2D8CBE',
          600: '#145DA0',   // couleur de référence
          700: '#114E86',
          800: '#0D3C68',
          900: '#0A2C4C',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground-rgb) / <alpha-value>)',
          50:  '#ECFAF7',
          100: '#CFF2EB',
          500: '#149184',
          600: '#0F766E',   // couleur de référence
          700: '#0B5C56',
        },
        /* `success` pointe sur le teal : dans les maquettes, ce qui
           est validé ou recouvré est teal, jamais vert vif. */
        success: {
          50:  '#ECFAF7',
          100: '#CFF2EB',
          500: '#149184',
          600: '#0F766E',
          700: '#0B5C56',
        },
        /* `warning` pointe sur l'ambre des maquettes. */
        warning: {
          50:  '#FEF7E8',
          100: '#FDECC8',
          500: '#F4A62A',
          600: '#DB8F14',
          700: '#A96A0C',
        },
        danger: {
          50:  '#FBEDEC',
          100: '#F5D5D3',
          500: '#D25B55',
          600: '#C2413B',   // couleur de référence
          700: '#9B3430',
        },
        purple: {
          50:  '#F3F0FE',
          100: '#E4DDFD',
          500: '#7C5CFC',
          600: '#6844E8',
          700: '#5333C4',
        },
        surface: {
          DEFAULT: 'rgb(var(--card-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--background-rgb) / <alpha-value>)',
          tertiary: 'rgb(var(--input-rgb) / <alpha-value>)',
        },
      },

      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        serif:   ['"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      borderRadius: {
        xl:  'var(--radius)',
        '2xl': 'calc(var(--radius) + 4px)',
        '3xl': 'calc(var(--radius) + 12px)',
      },

      boxShadow: {
        card: '0 1px 3px 0 rgb(20 33 61 / 0.06), 0 1px 2px -1px rgb(20 33 61 / 0.08)',
        'card-hover': '0 4px 12px -2px rgb(20 33 61 / 0.10)',
        modal: '0 20px 40px -8px rgb(20 33 61 / 0.18)',
      },

      animation: {
        'fade-in':  'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
