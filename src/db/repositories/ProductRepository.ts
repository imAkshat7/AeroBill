import db from '../DBClient';
import { Product, ProductInput } from '../../types';

export const mapRowToProduct = (row: any): Product => {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? '',
    defaultPrice: row.default_price ?? 0,
    unit: row.unit ?? 'pcs',
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const ProductRepository = {
  getAll: async (): Promise<Product[]> => {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM products WHERE is_archived = 0 ORDER BY name ASC'
    );
    return rows.map(mapRowToProduct);
  },

  search: async (query: string): Promise<Product[]> => {
    const cleanQuery = `%${query.trim()}%`;
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM products 
       WHERE is_archived = 0 AND (name LIKE ? OR sku LIKE ?) 
       ORDER BY name ASC LIMIT 20`,
      [cleanQuery, cleanQuery]
    );
    return rows.map(mapRowToProduct);
  },

  getById: async (id: number): Promise<Product | null> => {
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    return row ? mapRowToProduct(row) : null;
  },

  create: async (data: ProductInput): Promise<Product> => {
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO products (name, sku, default_price, unit, is_archived, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [data.name.trim(), (data.sku ?? '').trim(), data.defaultPrice, (data.unit ?? 'pcs').trim(), now, now]
    );

    return {
      id: result.lastInsertRowId,
      name: data.name.trim(),
      sku: data.sku ?? '',
      defaultPrice: data.defaultPrice,
      unit: data.unit ?? 'pcs',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: number, data: Partial<ProductInput>): Promise<Product> => {
    const current = await ProductRepository.getById(id);
    if (!current) {
      throw new Error(`Product with ID ${id} not found.`);
    }

    const updated = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      sku: data.sku !== undefined ? (data.sku ?? '').trim() : current.sku,
      defaultPrice: data.defaultPrice !== undefined ? data.defaultPrice : current.defaultPrice,
      unit: data.unit !== undefined ? (data.unit ?? 'pcs').trim() : current.unit,
      updatedAt: new Date().toISOString(),
    };

    await db.runAsync(
      `UPDATE products SET 
        name = ?, 
        sku = ?, 
        default_price = ?, 
        unit = ?, 
        updated_at = ? 
       WHERE id = ?`,
      [updated.name, updated.sku, updated.defaultPrice, updated.unit, updated.updatedAt, id]
    );

    return updated;
  },

  delete: async (id: number): Promise<void> => {
    // Check if referenced by any invoice items
    const ref = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?',
      [id]
    );
    
    const count = ref?.count ?? 0;
    const now = new Date().toISOString();
    
    if (count > 0) {
      // Soft delete if referenced
      await db.runAsync(
        'UPDATE products SET is_archived = 1, updated_at = ? WHERE id = ?',
        [now, id]
      );
    } else {
      // Hard delete if not referenced
      await db.runAsync(
        'DELETE FROM products WHERE id = ?',
        [id]
      );
    }
  }
};
