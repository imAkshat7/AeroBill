import db from '../DBClient';
import { Customer, CustomerInput } from '../../types';

export const mapRowToCustomer = (row: any): Customer => {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const CustomerRepository = {
  getAll: async (): Promise<Customer[]> => {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM customers WHERE is_archived = 0 ORDER BY name ASC'
    );
    return rows.map(mapRowToCustomer);
  },

  search: async (query: string): Promise<Customer[]> => {
    const cleanQuery = `%${query.trim()}%`;
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM customers 
       WHERE is_archived = 0 AND (name LIKE ? OR phone LIKE ?) 
       ORDER BY name ASC LIMIT 20`,
      [cleanQuery, cleanQuery]
    );
    return rows.map(mapRowToCustomer);
  },

  getById: async (id: number): Promise<Customer | null> => {
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );
    return row ? mapRowToCustomer(row) : null;
  },

  create: async (data: CustomerInput): Promise<Customer> => {
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO customers (name, phone, email, address, is_archived, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [data.name.trim(), (data.phone ?? '').trim(), (data.email ?? '').trim(), (data.address ?? '').trim(), now, now]
    );
    
    return {
      id: result.lastInsertRowId,
      name: data.name.trim(),
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: number, data: Partial<CustomerInput>): Promise<Customer> => {
    const current = await CustomerRepository.getById(id);
    if (!current) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    const updated = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      phone: data.phone !== undefined ? (data.phone ?? '').trim() : current.phone,
      email: data.email !== undefined ? (data.email ?? '').trim() : current.email,
      address: data.address !== undefined ? (data.address ?? '').trim() : current.address,
      updatedAt: new Date().toISOString(),
    };

    await db.runAsync(
      `UPDATE customers SET 
        name = ?, 
        phone = ?, 
        email = ?, 
        address = ?, 
        updated_at = ? 
       WHERE id = ?`,
      [updated.name, updated.phone, updated.email, updated.address, updated.updatedAt, id]
    );

    return updated;
  },

  softDelete: async (id: number): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE customers SET is_archived = 1, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }
};
