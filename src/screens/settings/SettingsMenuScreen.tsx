import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { Divider } from '../../components/atoms/Divider';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';

export const SettingsMenuScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const settings = useSettingsStore((state) => state.settings);

  const isBusinessConfigured = settings && settings.name.trim().length > 0;

  const renderRow = (
    title: string,
    subtitle: string,
    iconName: keyof typeof Ionicons.preset,
    routeName: string
  ) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate(routeName)}
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
            ...colors.cardShadow,
          },
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: colors.accentLight, borderRadius: borderRadius.sm, padding: spacing.xs }]}>
          <Ionicons name={iconName as any} size={22} color={colors.accent} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold }]}>
            {title}
          </Text>
          <Text style={[styles.rowSubtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Onboarding / Setup Nudge Banner */}
      {!isBusinessConfigured ? (
        <View
          style={[
            styles.nudgeBanner,
            {
              backgroundColor: colors.accentLight,
              borderColor: colors.accent,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
        >
          <View style={styles.nudgeHeader}>
            <Ionicons name="information-circle" size={24} color={colors.accent} style={styles.nudgeIcon} />
            <Text style={[styles.nudgeTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold }]}>
              Complete Your Setup
            </Text>
          </View>
          <Text style={[styles.nudgeBody, { color: colors.textSecondary, fontSize: typography.fontSizes.sm, marginTop: spacing.xs, marginBottom: spacing.md }]}>
            Set up your business name, contact details, and tax rate to start generating professional invoices.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BusinessSettings')}
            style={[styles.nudgeButton, { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.sm }]}
          >
            <Text style={[styles.nudgeButtonText, { color: '#FFFFFF', fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold }]}>
              Set Up Business Details
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.menuList}>
        {renderRow(
          'Business Details',
          'Configure your business name, address, phone, and logo',
          'business',
          'BusinessSettings'
        )}
        {renderRow(
          'Invoice Defaults',
          'Set prefix, next sequence, tax rates, and currency',
          'receipt',
          'InvoiceDefaults'
        )}
        {renderRow(
          'Appearance',
          'Toggle between light theme, dark theme, or system settings',
          'color-palette',
          'Appearance'
        )}
        {renderRow(
          'Backup & Restore',
          'Export your data as a JSON file or restore from a file',
          'cloud-download',
          'BackupRestore'
        )}

        {/* Download Folder Row — with configured badge */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('DownloadPath')}
          style={[
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              ...colors.cardShadow,
            },
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: colors.accentLight, borderRadius: borderRadius.sm, padding: spacing.xs }]}>
            <Ionicons name="download-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold }]}>
              Download Folder
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary, fontSize: typography.fontSizes.xs }]}>
              {settings?.downloadDirectoryUri
                ? 'Folder configured — invoices save silently'
                : 'Pick a folder once, download invoices silently'}
            </Text>
          </View>
          {settings?.downloadDirectoryUri ? (
            <View style={[styles.configuredBadge, { backgroundColor: colors.success + '20', borderRadius: borderRadius.sm }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          )}
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.placeholder, fontSize: typography.fontSizes.xs }]}>
          AeroBill v1.0.0 (MVP)
        </Text>
        <Text style={[styles.footerSubtext, { color: colors.placeholder, fontSize: typography.fontSizes.xs - 2, marginTop: 2 }]}>
          100% Offline · Secure Sandboxed Data
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconWrapper: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {},
  rowSubtitle: {
    marginTop: 2,
  },
  nudgeBanner: {
    borderWidth: 1.5,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nudgeIcon: {
    marginRight: 8,
  },
  nudgeTitle: {},
  nudgeBody: {},
  nudgeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nudgeButtonText: {},
  menuList: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 24,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontWeight: '500',
  },
  footerSubtext: {},
  configuredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
export default SettingsMenuScreen;
