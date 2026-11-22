// Design system: dark premium theme, electric purple / vibrant blue accents.
export const colors = {
  bg: '#0B0B10',
  bgElevated: '#14141D',
  bgCard: '#191924',
  bgCardAlt: '#1F1B2E',
  border: '#2A2A3A',
  borderSoft: '#23232F',
  text: '#F4F3FA',
  textSecondary: '#A7A5BD',
  textMuted: '#6E6C85',
  primary: '#8B5CF6', // electric purple
  primaryDark: '#6D28D9',
  accent: '#3B82F6', // vibrant blue
  accentDark: '#1D4ED8',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  cardA: ['#6D28D9', '#8B5CF6'] as const, // option A gradient
  cardB: ['#1D4ED8', '#3B82F6'] as const, // option B gradient
  cardAIdle: '#241C3A',
  cardBIdle: '#16233F',
  overlay: 'rgba(5,5,10,0.72)',
};

export const gradients: Record<string, [string, string]> = {
  background: ['#0B0B10', '#12101F'],
  primary: ['#8B5CF6', '#3B82F6'],
  cardA: ['#7C3AED', '#5B21B6'],
  cardB: ['#2563EB', '#1E40AF'],
  gold: ['#F59E0B', '#D97706'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const typography = {
  // System fonts keep Arabic shaping correct on both platforms.
  h1: { fontSize: 34, fontWeight: '800' as const, letterSpacing: 0.2 },
  h2: { fontSize: 26, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  bodyBold: { fontSize: 17, fontWeight: '600' as const, lineHeight: 26 },
  question: { fontSize: 22, fontWeight: '700' as const, lineHeight: 34 },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

export const shadows = {
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
};
