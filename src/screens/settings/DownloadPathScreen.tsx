import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToastStore } from '../../stores/toastStore';

export const DownloadPathScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const { showToast } = useToastStore();

  const [isSaving, setIsSaving] = useState(false);

  const savedUri = settings?.downloadDirectoryUri ?? null;

  const handleSelectFolder = async () => {
    if (Platform.OS !== 'android') {
      showToast('Folder selection is only available on Android.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        showToast('Folder permission denied.', 'error');
        return;
      }

      await updateSettings({ downloadDirectoryUri: permissions.directoryUri });
      showToast('Download folder saved ✓', 'success');
    } catch (err) {
      console.error('Failed to save download directory:', err);
      showToast('Could not save folder selection.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFolder = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ downloadDirectoryUri: null });
      showToast('Folder preference cleared.', 'success');
    } catch (err) {
      showToast('Could not clear folder preference.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Derive a human-readable folder name from the raw SAF URI
  const getFolderDisplayName = (uri: string): string => {
    try {
      const decoded = decodeURIComponent(uri);
      // SAF URIs end with something like "primary:Download" or "primary:Documents/Invoices"
      const match = decoded.match(/([^:]+)$/);
      if (match) {
        return match[1].replace(/\//g, ' › ');
      }
      return 'Custom folder';
    } catch {
      return 'Selected folder';
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={[styles.container, { padding: spacing.md }]}>
      {/* Header Info Card */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: colors.accentLight,
            borderColor: colors.accent,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.lg,
          },
        ]}
      >
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={22} color={colors.accent} />
          <Text
            style={[
              styles.infoTitle,
              {
                color: colors.textPrimary,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
                marginLeft: spacing.xs,
              },
            ]}
          >
            One-Time Folder Setup
          </Text>
        </View>
        <Text
          style={[
            styles.infoBody,
            {
              color: colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.xs,
              lineHeight: 20,
            },
          ]}
        >
          Select your preferred download folder once. All future invoices will
          be saved there automatically — no prompts, no path selection dialogs.
        </Text>
      </View>

      {/* Current Folder Status */}
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: colors.surface,
            borderColor: savedUri ? colors.accent : colors.border,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
            ...colors.cardShadow,
          },
        ]}
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: savedUri ? colors.accent + '20' : colors.border + '50',
                borderRadius: borderRadius.full ?? 999,
              },
            ]}
          >
            <Ionicons
              name={savedUri ? 'folder-open' : 'folder-outline'}
              size={28}
              color={savedUri ? colors.accent : colors.placeholder}
            />
          </View>
          <View style={styles.statusText}>
            <Text
              style={[
                styles.statusLabel,
                {
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                },
              ]}
            >
              {savedUri ? 'Download Folder' : 'No Folder Selected'}
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: savedUri ? colors.textPrimary : colors.placeholder,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                  marginTop: 2,
                },
              ]}
              numberOfLines={2}
            >
              {savedUri ? getFolderDisplayName(savedUri) : 'Tap below to choose a folder'}
            </Text>
          </View>
          {savedUri && (
            <View
              style={[
                styles.savedBadge,
                { backgroundColor: colors.success + '20', borderRadius: borderRadius.sm },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text
                style={[
                  styles.savedBadgeText,
                  { color: colors.success, fontSize: typography.fontSizes.xs, marginLeft: 4 },
                ]}
              >
                Active
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          {
            backgroundColor: colors.accent,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
            opacity: isSaving ? 0.6 : 1,
          },
        ]}
        onPress={handleSelectFolder}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="folder-open-outline" size={20} color="#FFFFFF" />
            <Text
              style={[
                styles.actionBtnText,
                {
                  color: '#FFFFFF',
                  fontSize: typography.fontSizes.md,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              {savedUri ? 'Change Folder' : 'Select Download Folder'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {savedUri && (
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.clearBtn,
            {
              borderColor: colors.danger,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              opacity: isSaving ? 0.5 : 1,
            },
          ]}
          onPress={handleClearFolder}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text
            style={[
              styles.actionBtnText,
              {
                color: colors.danger,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.semibold,
                marginLeft: spacing.sm,
              },
            ]}
          >
            Clear Saved Folder
          </Text>
        </TouchableOpacity>
      )}

      {/* How it works */}
      <View style={[styles.howItWorks, { marginTop: spacing.lg }]}>
        <Text
          style={[
            styles.howTitle,
            {
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: spacing.sm,
            },
          ]}
        >
          How It Works
        </Text>
        {[
          { icon: 'folder-open-outline', text: 'Tap "Select Folder" and pick any folder on your device (Downloads, Documents, etc.)' },
          { icon: 'shield-checkmark-outline', text: 'Android grants permanent access to that folder — no storage permission needed' },
          { icon: 'download-outline', text: 'Every invoice download goes straight to the selected folder — no dialogs, no prompts' },
          { icon: 'settings-outline', text: 'Change or clear the folder anytime from this screen' },
        ].map((step, i) => (
          <View key={i} style={[styles.howStep, { marginBottom: spacing.sm }]}>
            <View
              style={[
                styles.howIconBg,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.sm,
                  padding: spacing.xs,
                  marginRight: spacing.sm,
                },
              ]}
            >
              <Ionicons name={step.icon as any} size={18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.howText,
                {
                  color: colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  flex: 1,
                  lineHeight: 17,
                },
              ]}
            >
              {step.text}
            </Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  infoCard: {
    borderWidth: 1.5,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTitle: {},
  infoBody: {},
  statusCard: {
    borderWidth: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {},
  statusValue: {},
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savedBadgeText: {
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  clearBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionBtnText: {},
  howItWorks: {},
  howTitle: {},
  howStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  howIconBg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  howText: {},
});

export default DownloadPathScreen;
