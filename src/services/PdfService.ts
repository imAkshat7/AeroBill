import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Invoice } from '../types';
import { InvoiceRepository } from '../db/repositories/InvoiceRepository';
import { buildInvoiceHtml } from './buildInvoiceHtml';

const promiseTimeout = <T>(promise: Promise<T>, ms: number, errorMsg = 'Operation timed out'): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export const PdfService = {
  /**
   * Generates a PDF file from an Invoice object on-device.
   * Uses base64 encoding to bypass Expo Go cache sandbox restrictions.
   */
  generateInvoicePdf: async (invoice: Invoice): Promise<string> => {
    try {
      const logoPath = invoice.businessSnapshot.logoPath;
      let logoBase64: string | null = null;

      // 1. Read business logo to base64 if it exists on-disk
      if (logoPath) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(logoPath);
          if (fileInfo.exists) {
            logoBase64 = await FileSystem.readAsStringAsync(logoPath, {
              encoding: 'base64',
            });
          }
        } catch (err) {
          console.warn('Logo read skipped (non-critical):', (err as Error).message);
          logoBase64 = null;
        }
      }

      const signaturePath = invoice.businessSnapshot.signaturePath;
      let signatureBase64: string | null = null;

      // 1.5. Read business signature to base64 if it exists on-disk
      if (signaturePath) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(signaturePath);
          if (fileInfo.exists) {
            signatureBase64 = await FileSystem.readAsStringAsync(signaturePath, {
              encoding: 'base64',
            });
          }
        } catch (err) {
          console.warn('Signature read skipped (non-critical):', (err as Error).message);
          signatureBase64 = null;
        }
      }

      // 2. Build the self-contained HTML
      const htmlContent = buildInvoiceHtml(invoice, logoBase64, signatureBase64);

      // 3. Generate PDF and get base64 content directly (bypasses cache read issues)
      const result = await promiseTimeout(
        Print.printToFileAsync({
          html: htmlContent,
          base64: true,
        }),
        30000,
        'PDF_COMPILATION_TIMEOUT'
      );

      if (!result.base64) {
        throw new Error('PDF generation did not return base64 content.');
      }

      // 4. Write the base64 PDF to documentDirectory (readable & shareable)
      const fileName = `invoice-${invoice.id}-${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(destUri, result.base64, {
        encoding: 'base64',
      });

      // 5. Verify the file was written
      const info = await FileSystem.getInfoAsync(destUri);
      if (!info.exists) {
        throw new Error('PDF file was not written to disk.');
      }

      // 6. Update the path reference in SQLite
      await InvoiceRepository.updatePdfPath(invoice.id, destUri);
      console.log(`✅ PDF saved to: ${destUri} (${info.size} bytes)`);
      return destUri;
    } catch (error) {
      console.error('On-device PDF conversion failed:', error);
      throw new Error('PDF_GENERATION_FAILED');
    }
  },

  /**
   * Retrieves the cached PDF file path for the invoice.
   * If it does not exist or hasn't been generated, it compiles it fresh.
   */
  getOrGeneratePdf: async (invoiceId: number): Promise<string> => {
    const invoice = await InvoiceRepository.getById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found in database.`);
    }

    // Check if a previously generated PDF still exists on-disk
    if (invoice.pdfPath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(invoice.pdfPath);
        if (fileInfo.exists) {
          console.log(`📄 Serving cached PDF: ${invoice.pdfPath}`);
          return invoice.pdfPath;
        }
      } catch (err) {
        console.warn('Cached PDF check failed, regenerating:', (err as Error).message);
      }
    }

    return await PdfService.generateInvoicePdf(invoice);
  }
};

export default PdfService;
