import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export const ShareService = {
  /**
   * Opens the native share sheet with the PDF so the user can send via
   * WhatsApp, email, Drive, or any installed app.
   * Note: Linking.canOpenURL('whatsapp://') requires QUERY_ALL_PACKAGES on
   * Android 11+ which is not available in Expo Go — so we skip the check
   * and let the native sheet handle app selection.
   */
  shareToWhatsApp: async (pdfPath: string, invoiceNumber: string): Promise<void> => {
    try {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        throw new Error('SHARE_FAILED');
      }

      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Failed to trigger sharing drawer:', error);
      throw new Error('SHARE_FAILED');
    }
  },

  /**
   * Requests directory permission once via Android SAF (or uses a previously
   * granted URI if passed in). Returns the granted directoryUri so the caller
   * can persist it for future silent downloads.
   *
   * @param pdfPath           Local cached PDF file path
   * @param invoiceNumber     Used as the saved filename
   * @param savedDirectoryUri Pre-granted SAF URI from settings (skips picker when set)
   * @returns                 The SAF directoryUri that was used (save this!)
   */
  downloadToDevice: async (
    pdfPath: string,
    invoiceNumber: string,
    savedDirectoryUri?: string | null,
  ): Promise<{ destUri: string; directoryUri: string }> => {
    try {
      if (Platform.OS === 'android') {
        let directoryUri = savedDirectoryUri ?? null;

        // Only show the picker if no saved directory exists
        if (!directoryUri) {
          const permissions =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

          if (!permissions.granted) {
            throw new Error('DOWNLOAD_PERMISSION_DENIED');
          }
          directoryUri = permissions.directoryUri;
        }

        // Create the target PDF file uri inside the picked directory
        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          `${invoiceNumber}.pdf`,
          'application/pdf',
        );

        // Read the local cached PDF as Base64 string
        const base64Content = await FileSystem.readAsStringAsync(pdfPath, {
          encoding: 'base64',
        });

        // Write content permanently into SAF document URI
        await FileSystem.StorageAccessFramework.writeAsStringAsync(destUri, base64Content, {
          encoding: 'base64',
        });

        console.log(`Saved PDF using Android SAF: ${destUri}`);
        return { destUri, directoryUri };
      } else {
        // Fallback copy for iOS inside persistent DocumentsDirectory
        const destinationPath = `${FileSystem.documentDirectory}${invoiceNumber}.pdf`;

        // Clear previous copies if present to prevent errors
        const fileInfo = await FileSystem.getInfoAsync(destinationPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(destinationPath, { idempotent: true });
        }

        await FileSystem.copyAsync({
          from: pdfPath,
          to: destinationPath,
        });

        console.log(`Saved PDF inside iOS Documents: ${destinationPath}`);
        return { destUri: destinationPath, directoryUri: '' };
      }
    } catch (error: any) {
      console.error('File download conversion failed:', error);

      if (error.message === 'DOWNLOAD_PERMISSION_DENIED') {
        throw error;
      }

      // Catch filesystem disk full errors (standard code: ENOSPC)
      if (error.code === 'ENOSPC' || error.message?.includes('ENOSPC')) {
        throw new Error('INSUFFICIENT_STORAGE');
      }

      throw new Error('DOWNLOAD_FAILED');
    }
  },
};

export default ShareService;
