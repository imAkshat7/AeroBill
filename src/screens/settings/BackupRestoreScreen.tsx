import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { ScreenContainer } from '../../components/atoms/ScreenContainer';
import { SectionHeader } from '../../components/atoms/SectionHeader';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { BackupService } from '../../services/BackupService';

dayjs.extend(relativeTime);

export const BackupRestoreScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { showToast } = useToastStore();
  const { settings, loadSettings, updateSettings } = useSettingsStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await BackupService.exportBackup();
      const nowStr = new Date().toISOString();
      await updateSettings({ lastBackupAt: nowStr });
      showToast('Backup exported successfully!', 'success');
    } catch (err: any) {
      if (err.message === 'EXPORT_PERMISSION_DENIED' || err.message === 'DOWNLOAD_PERMISSION_DENIED') {
        showToast('Permission denied. Backup was not saved.', 'error');
      } else if (err.message === 'INSUFFICIENT_STORAGE') {
        showToast('Not enough storage. Free up space and try again.', 'error');
      } else {
        showToast('Backup export failed. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Pick any file type, contents will be strictly parsed
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      setIsRestoring(true);

      // 1. Read string contents of picked file
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });

      // 2. Try parsing contents
      let payload: any;
      try {
        payload = JSON.parse(content);
      } catch {
        showToast('This file cannot be read. It may be corrupted.', 'error');
        setIsRestoring(false);
        return;
      }

      // 3. Run validation checks
      if (!payload || typeof payload.schemaVersion !== 'number') {
        showToast('This file cannot be read. It may be corrupted.', 'error');
        setIsRestoring(false);
        return;
      }

      if (payload.schemaVersion !== 1) {
        showToast('Backup version mismatch or file is corrupted.', 'error');
        setIsRestoring(false);
        return;
      }

      if (!payload.business || !Array.isArray(payload.customers) || !Array.isArray(payload.products) || !Array.isArray(payload.invoices)) {
        showToast('This file cannot be read. It may be corrupted.', 'error');
        setIsRestoring(false);
        return;
      }

      const customerCount = payload.customers.length;
      const productCount = payload.products.length;
      const invoiceCount = payload.invoices.length;
      const backupDate = payload.exportedAt ? dayjs(payload.exportedAt).format('DD MMM YYYY, HH:mm') : 'Unknown';

      setIsRestoring(false);

      // Step 1: Summary Sheet Alert Dialog
      Alert.alert(
        'Backup File Found',
        `Exported: ${backupDate}\n\nContains:\n• ${customerCount} customers\n• ${productCount} products\n• ${invoiceCount} invoices\n\nWould you like to restore this backup?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: () => {
              // Step 2: Destructive overwrite warning
              Alert.alert(
                'Replace All Current Data',
                'This cannot be undone. Make sure you have a backup of your current data first. Current invoices, customers, and business info will be permanently deleted.\n\nContinue with restore?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'I understand, Restore',
                    style: 'destructive',
                    onPress: async () => {
                      setIsRestoring(true);
                      try {
                        const summary = await BackupService.importBackup(fileUri);
                        showToast(`Restore complete. ${summary.customerCount} customers, ${summary.invoiceCount} invoices loaded.`, 'success');
                        
                        // Reload business defaults globally
                        await loadSettings();
                      } catch (importErr: any) {
                        if (importErr.message === 'VERSION_MISMATCH') {
                          Alert.alert('Restore Failed', 'This backup was made with a different version of AeroBill.');
                        } else if (importErr.message === 'CORRUPT_BACKUP') {
                          Alert.alert('Restore Failed', 'This file cannot be read. It may be corrupted.');
                        } else {
                          Alert.alert('Restore Failed', 'Failed to restore backup tables. Existing data is untouched.');
                        }
                      } finally {
                        setIsRestoring(false);
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );

    } catch {
      setIsRestoring(false);
      showToast('Failed to open document picker.', 'error');
    }
  };

  const getBackupTimeAgo = () => {
    if (!settings?.lastBackupAt) return 'Last backup: Never';
    return `Last backup: ${dayjs(settings.lastBackupAt).fromNow()}`;
  };

  return (
    <View style={styles.outerWrapper}>
      <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
        <SectionHeader title="Backup & Restore" subtitle="Manage your offline data security and database migrations." />

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.accentLight,
              borderColor: colors.accent,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={24} color={colors.accent} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: colors.textPrimary, fontSize: typography.fontSizes.sm, flex: 1 }]}>
            Your data is 100% private and stored locally inside your device. Export backups regularly to prevent data loss if you uninstall or change your phone.
          </Text>
        </View>

        <View style={styles.actions}>
          {/* Export Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md }]}>
            <Ionicons name="cloud-upload" size={32} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, marginTop: spacing.sm }]}>
              Export Database Backup
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginVertical: spacing.sm }]}>
              Create a single .imbackup file containing all business details, customer directory, product list, and billing invoices history. Save to any folder on your device.
            </Text>
            <Button
              title="Export Backup"
              onPress={handleExport}
              variant="primary"
              style={styles.actionBtn}
              loading={isExporting}
              disabled={isRestoring}
            />
            <Text style={[styles.backupDateLabel, { color: colors.placeholder, fontSize: 11, marginTop: spacing.sm }]}>
              {getBackupTimeAgo()}
            </Text>
          </View>

          {/* Import Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.lg }]}>
            <Ionicons name="cloud-download" size={32} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, marginTop: spacing.sm }]}>
              Restore From Backup
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginVertical: spacing.sm }]}>
              Select a previously exported .imbackup file to import all records. WARNING: This action will replace your active database tables completely.
            </Text>
            <Button
              title="Import Backup"
              onPress={handleImport}
              variant="secondary"
              style={styles.actionBtn}
              loading={isRestoring}
              disabled={isExporting}
            />
          </View>
        </View>
      </ScreenContainer>

      {/* Global Activity Action Overlay */}
      {(isExporting || isRestoring) && (
        <View style={styles.actionOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.overlayText}>
            {isExporting ? 'Exporting local tables...' : 'Restoring backup data...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
  },
  container: {
    paddingBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {},
  actions: {},
  card: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {},
  cardDesc: {
    textAlign: 'center',
    lineHeight: 16,
  },
  actionBtn: {
    width: '100%',
    marginTop: 4,
  },
  backupDateLabel: {
    fontWeight: '500',
  },
  actionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
  },
});

export default BackupRestoreScreen;
