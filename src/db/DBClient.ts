import * as SQLite from 'expo-sqlite';

let internalDb: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!internalDb) {
    try {
      internalDb = SQLite.openDatabaseSync('invoicemate.db');
    } catch (error) {
      console.error('Failed to open SQLite database synchronously:', error);
      throw error;
    }
  }
  return internalDb;
};

// Create a safe delegating object that forwards calls to the dynamically-opened instance,
// avoiding JSI HostObject Proxy wrapping issues which crash Hermes on startup.
export const db = {
  getFirstAsync<T>(query: string, ...params: any[]): Promise<T | null> {
    return getDb().getFirstAsync<T>(query, ...params);
  },
  getAllAsync<T>(query: string, ...params: any[]): Promise<T[]> {
    return getDb().getAllAsync<T>(query, ...params);
  },
  runAsync(query: string, ...params: any[]): Promise<SQLite.SQLiteRunResult> {
    return getDb().runAsync(query, ...params);
  },
  execAsync(query: string): Promise<void> {
    return getDb().execAsync(query);
  },
  withTransactionAsync<T>(action: () => Promise<T>): Promise<T> {
    return getDb().withTransactionAsync(action);
  },
  withTransactionSync<T>(action: () => T): T {
    return getDb().withTransactionSync(action);
  },
  closeAsync(): Promise<void> {
    return getDb().closeAsync();
  },
  closeSync(): void {
    return getDb().closeSync();
  }
} as unknown as SQLite.SQLiteDatabase;

export const runMigrations = async (): Promise<void> => {
  // Unconditional failsafe migration check for businesses columns
  try {
    const tableCheck = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='businesses'"
    );
    if (tableCheck) {
      const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(businesses)');
      const columns = tableInfo.map(c => c.name);

      const addColumnSafe = async (col: string, query: string) => {
        if (columns.includes(col)) {
          return;
        }
        try {
          await db.runAsync(query);
          console.log(`Successfully added ${col} column!`);
        } catch (error) {
          console.error(`Failed to add column ${col}:`, error);
        }
      };

      await addColumnSafe('signature_path', 'ALTER TABLE businesses ADD COLUMN signature_path TEXT;');
      await addColumnSafe('last_backup_at', 'ALTER TABLE businesses ADD COLUMN last_backup_at TEXT;');
      await addColumnSafe('theme', "ALTER TABLE businesses ADD COLUMN theme TEXT DEFAULT 'dark';");
      await addColumnSafe('signatory_name', "ALTER TABLE businesses ADD COLUMN signatory_name TEXT DEFAULT '';");
      await addColumnSafe('download_directory_uri', 'ALTER TABLE businesses ADD COLUMN download_directory_uri TEXT;');
      await addColumnSafe('template_id', "ALTER TABLE businesses ADD COLUMN template_id TEXT DEFAULT '1';");
      
      // Auto-migrate active database config from 'system' theme to 'dark' black theme
      await db.runAsync("UPDATE businesses SET theme = 'dark' WHERE theme = 'system' OR theme IS NULL");
    }
  } catch (err) {
    console.error('Error running unconditional column checks:', err);
  }

  const CURRENT_SCHEMA_VERSION = 2;
  
  // Get current database version using PRAGMA user_version
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  // Wrap migration inside a transaction for complete rollback on failure
  await db.withTransactionAsync(async () => {
    if (currentDbVersion === 0) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS businesses (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          address TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          email TEXT DEFAULT '',
          gstin TEXT DEFAULT '',
          logo_path TEXT,
          signature_path TEXT,
          signatory_name TEXT DEFAULT '',
          last_backup_at TEXT,
          default_tax_rate REAL DEFAULT 0,
          currency_symbol TEXT DEFAULT '₹',
          invoice_prefix TEXT DEFAULT 'INV-',
          invoice_sequence INTEGER DEFAULT 0,
          thank_you_message TEXT DEFAULT 'Thank you for your business!',
          theme TEXT DEFAULT 'dark',
          updated_at TEXT NOT NULL
        );

        INSERT OR IGNORE INTO businesses (
          id, 
          name, 
          address, 
          phone, 
          email, 
          gstin, 
          logo_path, 
          default_tax_rate, 
          currency_symbol, 
          invoice_prefix, 
          invoice_sequence, 
          thank_you_message, 
          theme, 
          updated_at
        ) VALUES (
          1, 
          '', 
          '', 
          '', 
          '', 
          '', 
          NULL, 
          0.0, 
          '₹', 
          'INV-', 
          0, 
          'Thank you for your business!', 
          'dark', 
          datetime('now')
        );

        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT DEFAULT '',
          email TEXT DEFAULT '',
          address TEXT DEFAULT '',
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sku TEXT DEFAULT '',
          default_price REAL NOT NULL DEFAULT 0,
          unit TEXT DEFAULT 'pcs',
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          customer_id INTEGER REFERENCES customers(id),
          customer_snapshot TEXT NOT NULL,
          invoice_date TEXT NOT NULL,
          due_date TEXT,
          notes TEXT DEFAULT '',
          subtotal REAL NOT NULL,
          tax_rate REAL NOT NULL DEFAULT 0,
          tax_amount REAL NOT NULL DEFAULT 0,
          grand_total REAL NOT NULL,
          currency_symbol TEXT NOT NULL,
          business_snapshot TEXT NOT NULL,
          pdf_path TEXT,
          is_deleted INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id),
          item_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          unit_price REAL NOT NULL,
          line_total REAL NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);

        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL
        );

        INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
      `);
      currentDbVersion = 1;
    }

    // Set updated user_version
      await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
  });

  // Migration v2 — run outside the first transaction if needed
  const result2 = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion2 = result2?.user_version ?? 0;

  if (currentVersion2 < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`PRAGMA user_version = 2;`);
    });
  }

  // Unconditional column checks are now run at the beginning of the function
};

export default db;
