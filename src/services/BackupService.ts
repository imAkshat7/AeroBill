import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { BackupRepository } from '../db/repositories/BackupRepository';
import { BackupPayload, ImportSummary } from '../types';

export const BackupService = {
  /**
   * Serializes the entire SQLite database into a JSON string backup,
   * caches/saves the .imbackup file, using SAF on Android to choose directories natively
   * and sharing drawer on iOS.
   */
  exportBackup: async (): Promise<string> => {
    try {
      const payload = await BackupRepository.exportBackup();
      const payloadStr = JSON.stringify(payload, null, 2);
      const filename = `invoicemate_backup_${new Date().toISOString().split('T')[0]}.imbackup`;
      
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          throw new Error('EXPORT_PERMISSION_DENIED');
        }

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          'application/json'
        );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(destUri, payloadStr, {
          encoding: 'utf8',
        });

        console.log(`Saved backup using Android SAF: ${destUri}`);
        return destUri;
      } else {
        // iOS or fallback sharing sheet
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, payloadStr, {
          encoding: 'utf8',
        });

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Save Backup File',
            UTI: 'public.json',
          });
        } else {
          throw new Error('SHARING_UNAVAILABLE');
        }

        return fileUri;
      }
    } catch (error: any) {
      console.error('Backup export failed:', error);
      if (error.message === 'EXPORT_PERMISSION_DENIED') {
        throw error;
      }
      if (error.code === 'ENOSPC' || error.message?.includes('ENOSPC')) {
        throw new Error('INSUFFICIENT_STORAGE');
      }
      throw new Error('EXPORT_FAILED');
    }
  },

  /**
   * Reads a shared .imbackup file from on-disk URI, validates structure
   * and schema compatibility, and executes transaction imports.
   */
  importBackup: async (fileUri: string): Promise<ImportSummary> => {
    try {
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8',
      });
      
      let payload: BackupPayload;
      try {
        payload = JSON.parse(content);
      } catch {
        throw new Error('CORRUPT_BACKUP');
      }

      if (!payload || typeof payload.schemaVersion !== 'number') {
        throw new Error('CORRUPT_BACKUP');
      }

      if (payload.schemaVersion !== 1) {
        throw new Error('VERSION_MISMATCH');
      }

      if (!payload.business || !Array.isArray(payload.customers) || !Array.isArray(payload.products) || !Array.isArray(payload.invoices)) {
        throw new Error('CORRUPT_BACKUP');
      }

      return await BackupRepository.importBackup(payload);
    } catch (error: any) {
      console.error('Backup import failed:', error);
      if (error.message === 'CORRUPT_BACKUP' || error.message === 'VERSION_MISMATCH') {
        throw error;
      }
      throw new Error('IMPORT_FAILED');
    }
  }
};

export default BackupService;
