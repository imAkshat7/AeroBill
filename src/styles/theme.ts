export const themeTokens = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    border: '#E2E8F0',
    accent: '#1565C0', // Locked accent color
    accentLight: '#E6F4FE',
    success: '#10B981',
    successLight: '#ECFDF5',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    placeholder: '#94A3B8',
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  dark: {
    background: '#0B0F19',
    surface: '#151D30',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#1E293B',
    accent: '#1565C0', // Locked accent color
    accentLight: '#1B2C4E',
    success: '#34D399',
    successLight: '#064E3B',
    danger: '#F87171',
    dangerLight: '#7F1D1D',
    warning: '#FBBF24',
    warningLight: '#78350F',
    placeholder: '#475569',
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

export type ThemeColors = typeof themeTokens.light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    h1: 32,
  },
  fontWeights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  } as const,
};
