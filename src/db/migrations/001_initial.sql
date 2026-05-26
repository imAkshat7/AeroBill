-- Migration 001: Initial Schema

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  logo_path TEXT,
  default_tax_rate REAL DEFAULT 0,
  currency_symbol TEXT DEFAULT '₹',
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_sequence INTEGER DEFAULT 0,
  thank_you_message TEXT DEFAULT 'Thank you for your business!',
  theme TEXT DEFAULT 'system',
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
  'system', 
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
