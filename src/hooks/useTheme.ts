import { useColorScheme } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { themeTokens, spacing, borderRadius, typography, ThemeColors } from '../styles/theme';

export const useTheme = () => {
  const selectedTheme = useThemeStore((state) => state.theme);
  const systemColorScheme = useColorScheme();

  const resolvedTheme: 'light' | 'dark' =
    selectedTheme === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : selectedTheme;

  const colors: ThemeColors = themeTokens[resolvedTheme];

  return {
    colors,
    isDark: resolvedTheme === 'dark',
    theme: selectedTheme,
    spacing,
    borderRadius,
    typography,
  };
};
