import db from '../DBClient';
import { BackupPayload, ImportSummary, Invoice } from '../../types';
import { SettingsRepository } from './SettingsRepository';
import { mapRowToCustomer } from './CustomerRepository';
import { mapRowToProduct } from './ProductRepository';
import { mapRowToInvoice } from './InvoiceRepository';

export const BackupRepository = {
  exportBackup: async (): Promise<BackupPayload> => {
    const business = await SettingsRepository.get();
    
    // Select all rows (including archived ones) to preserve historical data
    const customerRows = await db.getAllAsync<any>('SELECT * FROM customers');
    const customers = customerRows.map(mapRowToCustomer);

    const productRows = await db.getAllAsync<any>('SELECT * FROM products');
    const products = productRows.map(mapRowToProduct);

    // Select all invoices (including deleted ones to preserve exact database state)
    const invoiceRows = await db.getAllAsync<any>('SELECT * FROM invoices');
    const invoices: Invoice[] = [];

    for (const row of invoiceRows) {
      const items = await db.getAllAsync<any>(
        'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC',
        [row.id]
      );
      invoices.push(mapRowToInvoice(row, items));
    }

    return {
      schemaVersion: 1, // Current version constant
      exportedAt: new Date().toISOString(),
      business,
      customers,
      products,
      invoices,
    };
  },

  importBackup: async (payload: BackupPayload): Promise<ImportSummary> => {
    // Validate backup schema version
    if (!payload || payload.schemaVersion !== 1) {
      throw new Error('VERSION_MISMATCH');
    }

    // Basic structure validation
    if (!payload.business || !Array.isArray(payload.customers) || !Array.isArray(payload.products) || !Array.isArray(payload.invoices)) {
      throw new Error('CORRUPT_BACKUP');
    }

    let customerCount = 0;
    let productCount = 0;
    let invoiceCount = 0;

    await db.withTransactionAsync(async () => {
      // 1. Clear all existing data
      await db.execAsync('DELETE FROM invoice_items');
      await db.execAsync('DELETE FROM invoices');
      await db.execAsync('DELETE FROM customers');
      await db.execAsync('DELETE FROM products');
      await db.execAsync('DELETE FROM businesses');

      // 2. Import Business Settings
      const b = payload.business;
      await db.runAsync(`
        INSERT INTO businesses (
          id, name, address, phone, email, gstin, logo_path, signature_path, last_backup_at,
          default_tax_rate, currency_symbol, invoice_prefix, invoice_sequence, 
          thank_you_message, theme, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        b.name,
        b.address,
        b.phone,
        b.email,
        b.gstin,
        b.logoPath,
        (b as any).signaturePath ?? null,
        b.lastBackupAt ?? null,
        b.defaultTaxRate,
        b.currencySymbol,
        b.invoicePrefix,
        b.invoiceSequence,
        b.thankYouMessage,
        b.theme,
        b.updatedAt
      ]);

      // 3. Import Customers preserving their exact IDs
      for (const c of payload.customers) {
        await db.runAsync(`
          INSERT INTO customers (id, name, phone, email, address, is_archived, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address,
          c.isArchived ? 1 : 0,
          c.createdAt,
          c.updatedAt
        ]);
        customerCount++;
      }

      // 4. Import Products preserving their exact IDs
      for (const p of payload.products) {
        await db.runAsync(`
          INSERT INTO products (id, name, sku, default_price, unit, is_archived, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.id,
          p.name,
          p.sku,
          p.defaultPrice,
          p.unit,
          p.isArchived ? 1 : 0,
          p.createdAt,
          p.updatedAt
        ]);
        productCount++;
      }

      // 5. Import Invoices and Items preserving their exact IDs
      for (const inv of payload.invoices) {
        await db.runAsync(`
          INSERT INTO invoices (
            id, invoice_number, customer_id, customer_snapshot, invoice_date, due_date,
            notes, subtotal, tax_rate, tax_amount, grand_total,
            currency_symbol, business_snapshot, pdf_path, is_deleted, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          inv.id,
          inv.invoiceNumber,
          inv.customerId,
          JSON.stringify(inv.customerSnapshot),
          inv.invoiceDate,
          inv.dueDate,
          inv.notes,
          inv.subtotal,
          inv.taxRate,
          inv.taxAmount,
          inv.grandTotal,
          inv.currencySymbol,
          JSON.stringify(inv.businessSnapshot),
          inv.pdfPath,
          inv.isDeleted ? 1 : 0,
          inv.createdAt,
          inv.updatedAt
        ]);

        // Insert Invoice Items
        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            await db.runAsync(`
              INSERT INTO invoice_items (
                id, invoice_id, product_id, item_name, quantity, unit, unit_price, line_total, sort_order
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              item.id,
              inv.id,
              item.productId,
              item.itemName,
              item.quantity,
              item.unit,
              item.unitPrice,
              item.lineTotal,
              item.sortOrder
            ]);
          }
        }

        invoiceCount++;
      }
    });

    return {
      customerCount,
      productCount,
      invoiceCount,
    };
  }
};
