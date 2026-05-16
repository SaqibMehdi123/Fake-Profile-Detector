import { MD3LightTheme } from 'react-native-paper';

// Notion/Linear-inspired light palette: crisp, calm, indigo accent.
export const colors = {
  bg: '#FAFAFA',
  bgSurface: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgSubtle: '#F4F4F5',          // for icon backgrounds, subtle fills
  bgHover: '#F4F4F5',

  primary: '#2563EB',            // blue-600
  primaryDeep: '#1D4ED8',
  primarySubtle: '#EFF6FF',      // blue-50

  text: '#18181B',               // zinc-900
  textSecondary: '#3F3F46',      // zinc-700
  textMuted: '#71717A',          // zinc-500
  textDim: '#A1A1AA',            // zinc-400

  border: '#E4E4E7',             // zinc-200
  borderStrong: '#D4D4D8',       // zinc-300
  divider: '#F4F4F5',

  // Risk colors (kept consistent across themes)
  safe: '#16A34A',               // green-600
  safeBg: '#F0FDF4',             // green-50
  suspicious: '#D97706',         // amber-600
  suspiciousBg: '#FFFBEB',
  fake: '#DC2626',               // red-600
  fakeBg: '#FEF2F2',

  // Platform brand colors (used sparingly, only on platform picker)
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  facebook: '#1877F2',

  // Legacy gradient slots (no longer used; kept so older imports don't break)
  accent: '#4F46E5',
  accentPink: '#DB2777',
  gradientHero: ['#4F46E5', '#4F46E5'] as const,
  gradientSafe: ['#16A34A', '#16A34A'] as const,
  gradientWarn: ['#DC2626', '#DC2626'] as const,
  gradientCardA: ['#4F46E5', '#4F46E5'] as const,
  gradientCardB: ['#4F46E5', '#4F46E5'] as const,
  gradientCardC: ['#4F46E5', '#4F46E5'] as const,
  gradientCardD: ['#4F46E5', '#4F46E5'] as const,
};

export const radii = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
export const spacing = (n: number) => n * 4;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};

export const theme = {
  ...MD3LightTheme,
  roundness: 8,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.primarySubtle,
    secondary: colors.primary,
    background: colors.bg,
    surface: colors.bgSurface,
    surfaceVariant: colors.bgSubtle,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
    outline: colors.border,
    error: colors.fake,
  },
};

export const riskColor = (level: 'safe' | 'suspicious' | 'likely_fake') => {
  switch (level) {
    case 'safe': return colors.safe;
    case 'suspicious': return colors.suspicious;
    case 'likely_fake': return colors.fake;
  }
};

export const riskBg = (level: 'safe' | 'suspicious' | 'likely_fake') => {
  switch (level) {
    case 'safe': return colors.safeBg;
    case 'suspicious': return colors.suspiciousBg;
    case 'likely_fake': return colors.fakeBg;
  }
};

export const riskLabel = (level: 'safe' | 'suspicious' | 'likely_fake') => {
  switch (level) {
    case 'safe': return 'Looks Genuine';
    case 'suspicious': return 'Suspicious';
    case 'likely_fake': return 'Likely Fake';
  }
};

// Kept for any old code that still imports it; returns a flat solid pair
export const riskGradient = (level: 'safe' | 'suspicious' | 'likely_fake') => {
  const c = riskColor(level);
  return [c, c] as const;
};
