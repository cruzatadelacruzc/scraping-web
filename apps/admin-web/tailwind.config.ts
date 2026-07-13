import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface tier ladder (MD3 dark theme — Obsidian Hearth)
        surface: '#051424',
        'surface-dim': '#051424',
        'surface-bright': '#2c3a4c',
        'surface-container-lowest': '#010f1f',
        'surface-container-low': '#0d1c2d',
        'surface-container': '#122131',
        'surface-container-high': '#1c2b3c',
        'surface-container-highest': '#273647',
        'surface-variant': '#273647',
        background: '#051424',
        'on-background': '#d4e4fa',

        // Borders & outlines
        'outline-variant': '#574048',
        outline: '#a68992',

        // Text
        'on-surface': '#d4e4fa',
        'on-surface-variant': '#debec8',
        'inverse-surface': '#d4e4fa',
        'inverse-on-surface': '#233143',

        // Primary: Pink (Obsidian Hearth)
        primary: '#ffb0cd',
        'on-primary': '#640039',
        'primary-container': '#f751a1',
        'on-primary-container': '#570032',
        'inverse-primary': '#b4136d',
        'surface-tint': '#ffb0cd',
        'primary-fixed': '#ffd9e4',
        'primary-fixed-dim': '#ffb0cd',
        'on-primary-fixed': '#3e0022',
        'on-primary-fixed-variant': '#8c0053',

        // Secondary
        secondary: '#c8c6c5',
        'on-secondary': '#303030',
        'secondary-container': '#474746',
        'on-secondary-container': '#b7b5b4',
        'secondary-fixed': '#e5e2e1',
        'secondary-fixed-dim': '#c8c6c5',
        'on-secondary-fixed': '#1b1b1c',
        'on-secondary-fixed-variant': '#474746',

        // Tertiary
        tertiary: '#bec6e0',
        'on-tertiary': '#283044',
        'tertiary-container': '#8990a8',
        'on-tertiary-container': '#22293d',
        'tertiary-fixed': '#dae2fd',
        'tertiary-fixed-dim': '#bec6e0',
        'on-tertiary-fixed': '#131b2e',
        'on-tertiary-fixed-variant': '#3f465c',

        // Semantic states
        success: '#10b981',
        'success-muted': 'rgba(16, 185, 129, 0.15)',
        danger: '#f43f5e',
        'danger-muted': 'rgba(244, 63, 94, 0.15)',
        warning: '#f59e0b',
        'warning-muted': 'rgba(245, 158, 11, 0.15)',
        info: '#3b82f6',
        'info-muted': 'rgba(59, 130, 246, 0.15)',

        // Error
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'label-xs': ['10px', { lineHeight: '14px', fontWeight: '500', letterSpacing: '0.05em' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.05em' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        xs: ['12px', { lineHeight: '16px' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        xl: ['24px', { lineHeight: '32px' }],
        'headline-lg': [
          '32px',
          { lineHeight: '40px', fontWeight: '600', letterSpacing: '-0.01em' },
        ],
        '2xl': ['30px', { lineHeight: '36px' }],
        'headline-xl': [
          '40px',
          { lineHeight: '48px', fontWeight: '700', letterSpacing: '-0.02em' },
        ],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        gutter: '16px',
        'margin-mobile': '16px',
        'margin-desktop': '32px',
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        full: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config;
