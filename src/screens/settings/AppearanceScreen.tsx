import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { SectionHeader } from '../../components/atoms/SectionHeader';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore, ThemeType } from '../../stores/themeStore';
import { useToastStore } from '../../stores/toastStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface AppearanceCardProps {
  value: ThemeType;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.preset;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
  typography: any;
  spacing: any;
  borderRadius: any;
}

const AppearanceCard: React.FC<AppearanceCardProps> = ({
  title,
  description,
  iconName,
  isSelected,
  onSelect,
  colors,
  typography,
  spacing,
  borderRadius,
}) => {
  // Local native-driven animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const radioScaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    if (isSelected) {
      // Elastic spring effect on select
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(radioScaleAnim, {
          toValue: 1,
          tension: 140,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Immediate reset on deselect
      Animated.parallel([
        Animated.timing(radioScaleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onSelect}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.accent : colors.border,
            borderWidth: isSelected ? 2 : 1.5,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
            ...colors.cardShadow,
          },
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: isSelected ? colors.accent + '12' : colors.background, borderRadius: borderRadius.sm, padding: spacing.xs }]}>
          <Ionicons name={iconName as any} size={24} color={isSelected ? colors.accent : colors.placeholder} />
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold }]}>
            {title}
          </Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 }]}>
            {description}
          </Text>
        </View>

        <View
          style={[
            styles.radioOuter,
            {
              borderColor: isSelected ? colors.accent : colors.placeholder,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.radioInner,
              {
                backgroundColor: colors.accent,
                transform: [{ scale: radioScaleAnim }],
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const AppearanceScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { theme, setTheme } = useThemeStore();
  const { updateSettings } = useSettingsStore();
  const { showToast } = useToastStore();

  const handleSelectTheme = async (newTheme: ThemeType) => {
    try {
      await setTheme(newTheme);
      await updateSettings({ theme: newTheme });
      showToast(`Appearance updated to ${newTheme === 'system' ? 'System Default' : newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}!`, 'success');
    } catch {
      showToast('Failed to save theme preference.', 'error');
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <SectionHeader title="Appearance" subtitle="Customize how AeroBill looks on your device." />

      <View style={styles.list}>
        <AppearanceCard
          value="light"
          title="Light Mode"
          description="Clean white backgrounds with optimal outdoor readability"
          iconName="sunny"
          isSelected={theme === 'light'}
          onSelect={() => handleSelectTheme('light')}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <AppearanceCard
          value="dark"
          title="Dark Mode"
          description="Sleek deep navy design which is gentle on your eyes"
          iconName="moon"
          isSelected={theme === 'dark'}
          onSelect={() => handleSelectTheme('dark')}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
        <AppearanceCard
          value="system"
          title="Follow System"
          description="Syncs theme automatically with your Android system settings"
          iconName="logo-android"
          isSelected={theme === 'system'}
          onSelect={() => handleSelectTheme('system')}
          colors={colors}
          typography={typography}
          spacing={spacing}
          borderRadius={borderRadius}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  list: {
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {},
  cardDescription: {},
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default AppearanceScreen;

