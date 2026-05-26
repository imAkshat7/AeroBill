import db from '../DBClient';
import { Invoice, InvoiceDraft, InvoiceItem } from '../../types';
import { mapRowToSettings } from './SettingsRepository';
import * as FileSystem from 'expo-file-system/legacy';

const getLatestLocalPath = (path: string | null, defaultFilename: string): string | null => {
  if (!path) return null;
  const parts = path.split('/');
  const filename = parts[parts.length - 1] || defaultFilename;
  return `${FileSystem.documentDirectory}${filename}`;
};

const padZero = (num: number, size = 4): string => {
  let s = num.toString();
  while (s.length < size) s = '0' + s;
  return s;
};

export const mapRowToInvoice = (row: any, itemsRow: any[]): Invoice => {
  const businessSnapshot = JSON.parse(row.business_snapshot);
  if (businessSnapshot) {
    if (businessSnapshot.logoPath) {
      businessSnapshot.logoPath = getLatestLocalPath(businessSnapshot.logoPath, 'business_logo.jpg');
    }
    if (businessSnapshot.signaturePath) {
      businessSnapshot.signaturePath = getLatestLocalPath(businessSnapshot.signaturePath, 'business_signature_drawn.png');
    }
  }

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerSnapshot: JSON.parse(row.customer_snapshot),
    invoiceDate: row.invoice_date,
    dueDate: row.due_date ?? null,
    notes: row.notes ?? '',
    subtotal: row.subtotal,
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    grandTotal: row.grand_total,
    currencySymbol: row.currency_symbol,
    businessSnapshot: businessSnapshot,
    pdfPath: row.pdf_path ? getLatestLocalPath(row.pdf_path, 'invoice.pdf') : null,
    isDeleted: row.is_deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: itemsRow.map(item => ({
      id: item.id,
      invoiceId: item.invoice_id,
      productId: item.product_id,
      itemName: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      sortOrder: item.sort_order,
    })),
  };
};

export const InvoiceRepository = {
  getAll: async (options?: { 
    limit?: number; 
    offset?: number; 
    dateFrom?: string; 
    dateTo?: string; 
  }): Promise<Invoice[]> => {
    let sql = 'SELECT * FROM invoices WHERE is_deleted = 0';
    const params: any[] = [];

    if (options?.dateFrom) {
      sql += ' AND invoice_date >= ?';
      params.push(options.dateFrom);
    }
    if (options?.dateTo) {
      sql += ' AND invoice_date <= ?';
      params.push(options.dateTo);
    }

    sql += ' ORDER BY invoice_date DESC, id DESC';

    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options?.offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = await db.getAllAsync<any>(sql, params);
    const invoices: Invoice[] = [];

    for (const row of rows) {
      const items = await db.getAllAsync<any>(
        'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC',
        [row.id]
      );
      invoices.push(mapRowToInvoice(row, items));
    }

    return invoices;
  },

  getById: async (id: number): Promise<Invoice | null> => {
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM invoices WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (!row) return null;

    const items = await db.getAllAsync<any>(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC',
      [id]
    );

    return mapRowToInvoice(row, items);
  },

  checkNumberExists: async (invoiceNumber: string): Promise<boolean> => {
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM invoices WHERE invoice_number = ? AND is_deleted = 0',
      [invoiceNumber.trim()]
    );
    return (row?.count ?? 0) > 0;
  },

  getNextNumber: async (): Promise<string> => {
    const business = await db.getFirstAsync<any>('SELECT invoice_prefix, invoice_sequence FROM businesses WHERE id = 1');
    const prefix = business?.invoice_prefix ?? 'INV-';
    const lastSequence = business?.invoice_sequence ?? 0;

    // Scan existing invoice numbers in the database to find the maximum numeric suffix matching the prefix
    let maxSuffix = 0;
    try {
      const rows = await db.getAllAsync<{ invoice_number: string }>(
        'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? AND is_deleted = 0',
        [`${prefix}%`]
      );
      for (const r of rows) {
        const numStr = r.invoice_number;
        if (numStr.startsWith(prefix)) {
          const suffixStr = numStr.substring(prefix.length);
          const suffixNum = parseInt(suffixStr, 10);
          if (!isNaN(suffixNum) && suffixNum > maxSuffix) {
            maxSuffix = suffixNum;
          }
        }
      }
    } catch (err) {
      console.error('Error scanning existing invoices for max sequence:', err);
    }

    const baseSequence = Math.max(lastSequence, maxSuffix);
    const nextSequence = baseSequence + 1;
    return `${prefix}${padZero(nextSequence, 4)}`;
  },

  create: async (draft: InvoiceDraft): Promise<Invoice> => {
    const now = new Date().toISOString();

    // Fetch active business details for the snapshot
    const businessRow = await db.getFirstAsync<any>('SELECT * FROM businesses WHERE id = 1');
    if (!businessRow) {
      throw new Error('Business settings are not initialized.');
    }
    const businessSnapshot = mapRowToSettings(businessRow);

    // Override templateId if a custom template was chosen in the preview screen draft
    if (draft.businessSnapshot?.templateId) {
      businessSnapshot.templateId = draft.businessSnapshot.templateId;
    }

    let savedInvoice: Invoice | null = null;

    await db.withTransactionAsync(async () => {
      // 1. Insert into invoices table
      const result = await db.runAsync(`
        INSERT INTO invoices (
          invoice_number, customer_id, customer_snapshot, invoice_date, due_date,
          notes, subtotal, tax_rate, tax_amount, grand_total,
          currency_symbol, business_snapshot, pdf_path, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
      `, [
        draft.invoiceNumber.trim(),
        draft.customerId,
        JSON.stringify(draft.customerSnapshot),
        draft.invoiceDate,
        draft.dueDate,
        draft.notes.trim(),
        draft.subtotal,
        draft.taxRate,
        draft.taxAmount,
        draft.grandTotal,
        draft.currencySymbol,
        JSON.stringify(businessSnapshot),
        now,
        now
      ]);

      const invoiceId = result.lastInsertRowId;

      // 2. Insert items
      const savedItems: InvoiceItem[] = [];
      for (const item of draft.items) {
        const itemResult = await db.runAsync(`
          INSERT INTO invoice_items (
            invoice_id, product_id, item_name, quantity, unit, unit_price, line_total, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoiceId,
          item.productId,
          item.itemName.trim(),
          item.quantity,
          item.unit.trim(),
          item.unitPrice,
          item.lineTotal,
          item.sortOrder
        ]);

        savedItems.push({
          ...item,
          id: itemResult.lastInsertRowId,
          invoiceId,
        });
      }

      // 3. Update sequence counter based on the saved invoice number if it matches the prefix
      let nextSequenceValue = (businessRow.invoice_sequence ?? 0) + 1;
      const prefix = businessRow.invoice_prefix ?? 'INV-';
      if (draft.invoiceNumber.trim().startsWith(prefix)) {
        const suffixStr = draft.invoiceNumber.trim().substring(prefix.length);
        const suffixNum = parseInt(suffixStr, 10);
        if (!isNaN(suffixNum)) {
          nextSequenceValue = Math.max(nextSequenceValue, suffixNum);
        }
      }

      await db.runAsync(
        'UPDATE businesses SET invoice_sequence = ?, updated_at = ? WHERE id = 1',
        [nextSequenceValue, now]
      );

      savedInvoice = {
        id: invoiceId,
        invoiceNumber: draft.invoiceNumber.trim(),
        customerId: draft.customerId,
        customerSnapshot: draft.customerSnapshot!,
        invoiceDate: draft.invoiceDate,
        dueDate: draft.dueDate,
        notes: draft.notes.trim(),
        subtotal: draft.subtotal,
        taxRate: draft.taxRate,
        taxAmount: draft.taxAmount,
        grandTotal: draft.grandTotal,
        currencySymbol: draft.currencySymbol,
        businessSnapshot,
        pdfPath: null,
        createdAt: now,
        updatedAt: now,
        items: savedItems,
      };
    });

    if (!savedInvoice) {
      throw new Error('Failed to save the invoice transaction.');
    }

    return savedInvoice;
  },

  updatePdfPath: async (id: number, pdfPath: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE invoices SET pdf_path = ?, updated_at = ? WHERE id = ?',
      [pdfPath, now, id]
    );
  },

  softDelete: async (id: number): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE invoices SET is_deleted = 1, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }
};
