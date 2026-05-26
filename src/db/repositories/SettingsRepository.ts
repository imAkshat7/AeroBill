import db from '../DBClient';
import { BusinessSettings } from '../../types';
import { ThemeType } from '../../stores/themeStore';
import * as FileSystem from 'expo-file-system/legacy';

const getLatestLocalPath = (path: string | null, defaultFilename: string): string | null => {
  if (!path) return null;
  const parts = path.split('/');
  const filename = parts[parts.length - 1] || defaultFilename;
  return `${FileSystem.documentDirectory}${filename}`;
};

export const mapRowToSettings = (row: any): BusinessSettings => {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    gstin: row.gstin ?? '',
    logoPath: row.logo_path ? getLatestLocalPath(row.logo_path, 'business_logo.jpg') : null,
    signaturePath: row.signature_path ? getLatestLocalPath(row.signature_path, 'business_signature_drawn.png') : null,
    signatoryName: row.signatory_name ?? '',
    lastBackupAt: row.last_backup_at ?? null,
    downloadDirectoryUri: row.download_directory_uri ?? null,
    defaultTaxRate: row.default_tax_rate ?? 0,
    currencySymbol: row.currency_symbol ?? '₹',
    invoicePrefix: row.invoice_prefix ?? 'INV-',
    invoiceSequence: row.invoice_sequence ?? 0,
    thankYouMessage: row.thank_you_message ?? 'Thank you for your business!',
    theme: row.theme ?? 'dark',
    templateId: row.template_id ?? '1',
    updatedAt: row.updated_at,
  };
};

export const SettingsRepository = {
  get: async (): Promise<BusinessSettings> => {
    const row = await db.getFirstAsync<any>('SELECT * FROM businesses WHERE id = 1');
    if (!row) {
      // Re-seed if somehow deleted
      const now = new Date().toISOString();
      await db.runAsync(`
        INSERT INTO businesses (id, name, updated_at) 
        VALUES (1, '', ?)
      `, now);
      const newRow = await db.getFirstAsync<any>('SELECT * FROM businesses WHERE id = 1');
      return mapRowToSettings(newRow);
    }
    return mapRowToSettings(row);
  },

  // Update only provided fields, leaving others untouched
  update: async (data: Partial<BusinessSettings>): Promise<BusinessSettings> => {
    const current = await SettingsRepository.get();
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };

    // Build dynamic SET clause based on fields that are defined and exist in the schema
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(businesses)');
    const columns = tableInfo.map(c => c.name);
    const fields: string[] = [];
    const values: any[] = [];

    const addIf = (col: string, value: any) => {
      if (value !== undefined) {
        fields.push(`${col} = ?`);
        values.push(value);
      }
    };

    addIf('name', updated.name);
    addIf('address', updated.address);
    addIf('phone', updated.phone);
    addIf('email', updated.email);
    addIf('gstin', updated.gstin);
    addIf('logo_path', updated.logoPath);
    addIf('signature_path', updated.signaturePath);
    addIf('signatory_name', updated.signatoryName);
    // addIf('last_backup_at', updated.lastBackupAt); // optional column
    addIf('default_tax_rate', updated.defaultTaxRate);
    addIf('currency_symbol', updated.currencySymbol);
    addIf('invoice_prefix', updated.invoicePrefix);
    addIf('invoice_sequence', updated.invoiceSequence);
    addIf('thank_you_message', updated.thankYouMessage);
    addIf('theme', updated.theme);
    addIf('template_id', updated.templateId);
    addIf('download_directory_uri', updated.downloadDirectoryUri);

    // Always update the timestamp
    fields.push('updated_at = ?');
    values.push(updated.updatedAt);

    const setClause = fields.join(', ');
    await db.runAsync(`UPDATE businesses SET ${setClause} WHERE id = 1`, ...values);
    return updated;
  },

  // Convenience method to update only the theme column
  updateTheme: async (theme: ThemeType): Promise<BusinessSettings> => {
    // Directly update just the theme field to avoid touching other columns
    await db.runAsync('UPDATE businesses SET theme = ?, updated_at = ? WHERE id = 1', theme, new Date().toISOString());
    // Return the fresh settings object
    return SettingsRepository.get();
  },
};
