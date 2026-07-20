/**
 * Matchday design tokens — dark "pitch green" theme.
 * Single source of truth for colors, spacing, radii and typography.
 */

export const colors = {
  /** Deep pitch-green app background */
  background: '#0d1f16',
  /** Slightly raised surface (cards, sheets) */
  surface: '#14291e',
  /** Higher-elevation surface (modals, popovers) */
  surfaceRaised: '#1b3427',
  /** Hairline borders and dividers */
  border: '#264334',

  /** Teal accent — primary actions, links, highlights */
  accent: '#2dd4bf',
  /** Pressed/darkened accent */
  accentPressed: '#14b8a6',
  /** Subtle accent tint for selected states */
  accentMuted: '#134e48',

  /** Amber — alerts, warnings, live indicators */
  alert: '#f5a623',
  /** Subtle amber tint for alert backgrounds */
  alertMuted: '#4a3512',

  /** Primary text on dark backgrounds */
  text: '#e8f2ec',
  /** Secondary / supporting text */
  textSecondary: '#9db8aa',
  /** Disabled / placeholder text */
  textDisabled: '#5d7568',
  /** Text on accent-colored fills */
  textOnAccent: '#04231f',

  /** Semantic states */
  success: '#34d399',
  danger: '#f87171',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;

export const theme = { colors, spacing, radii, typography } as const;

export type Theme = typeof theme;

export default theme;
