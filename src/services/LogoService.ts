import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

export const LogoService = {
  /**
   * Resizes a picked business logo to max 500x500px JPEG format,
   * stores it in the app's permanent document directory, and returns the local path.
   */
  resizeAndSave: async (sourceUri: string, filename: string = 'business_logo.jpg'): Promise<string> => {
    try {
      const destinationPath = `${FileSystem.documentDirectory}${filename}`;

      // If it's a data URI (e.g. signature drawing base64), write raw bytes directly as PNG
      if (sourceUri.startsWith('data:')) {
        const parts = sourceUri.split(',');
        const base64Data = parts[1] || parts[0];
        
        // Delete old file if it exists to avoid caching conflicts
        const fileInfo = await FileSystem.getInfoAsync(destinationPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(destinationPath, { idempotent: true });
        }
        
        await FileSystem.writeAsStringAsync(destinationPath, base64Data, {
          encoding: 'base64',
        });
        
        return destinationPath;
      }

      // 1. Get original image size using React Native's Image.getSize
      const { width: origWidth, height: origHeight } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(sourceUri, (w, h) => resolve({ width: w, height: h }), reject);
      });

      // 2. Compute proportional bounds to mimic 'contain' mode with maximum size of 500px
      let targetWidth = origWidth;
      let targetHeight = origHeight;

      if (origWidth > 500 || origHeight > 500) {
        if (origWidth > origHeight) {
          targetWidth = 500;
          targetHeight = Math.round((origHeight * 500) / origWidth);
        } else {
          targetHeight = 500;
          targetWidth = Math.round((origWidth * 500) / origHeight);
        }
      }

      // 3. Determine save format based on file extension
      const isPng = filename.toLowerCase().endsWith('.png');
      const saveFormat = isPng ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;

      // 4. Resize using Expo's cross-platform ImageManipulator
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        { compress: 0.9, format: saveFormat }
      );

      // 5. Move the file from temporary cache to permanent document folder
      // Delete old file if it exists to avoid caching conflicts
      const fileInfo = await FileSystem.getInfoAsync(destinationPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(destinationPath, { idempotent: true });
      }

      await FileSystem.copyAsync({
        from: result.uri,
        to: destinationPath,
      });

      return destinationPath;
    } catch (error) {
      console.error(`Error resizing and saving business image (${filename}):`, error);
      throw new Error(`Failed to process and save business image.`);
    }
  },

  /**
   * Deletes a file from the app permanent documents directory.
   */
  deleteFile: async (filename: string): Promise<void> => {
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (error) {
      console.error(`Error deleting file ${filename}:`, error);
    }
  },

  /**
   * Deletes the currently saved business logo from storage.
   */
  deleteLogo: async (): Promise<void> => {
    return LogoService.deleteFile('business_logo.jpg');
  },

  /**
   * Deletes the currently saved business signature from storage.
   */
  deleteSignature: async (): Promise<void> => {
    return LogoService.deleteFile('business_signature.jpg');
  }
};
