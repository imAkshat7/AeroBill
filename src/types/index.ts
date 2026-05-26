export type BusinessSettings = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  logoPath: string | null;
  signaturePath: string | null;
  signatoryName: string;
  defaultTaxRate: number;
  currencySymbol: string;
  invoicePrefix: string;
  invoiceSequence: number;
  thankYouMessage: string;
  theme: 'light' | 'dark' | 'system';
  templateId: string;
  downloadDirectoryUri: string | null;
  lastBackupAt: string | null;
  updatedAt: string;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  isArchived: boolean; // 0 or 1 in SQLite
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = Omit<Customer, 'id' | 'isArchived' | 'createdAt' | 'updatedAt'>;

export type Product = {
  id: number;
  name: string;
  sku: string;
  defaultPrice: number;
  unit: string;
  isArchived: boolean; // 0 or 1 in SQLite
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Omit<Product, 'id' | 'isArchived' | 'createdAt' | 'updatedAt'>;

export type InvoiceItem = {
  id?: number;
  invoiceId?: number;
  productId: number | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number; // quantity * unitPrice
  sortOrder: number;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerSnapshot: Customer | null; // stored as JSON string in DB, parsed in repository
  invoiceDate: string;
  dueDate: string | null;
  notes: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  currencySymbol: string;
  businessSnapshot: BusinessSettings; // stored as JSON string in DB, parsed in repository
  pdfPath: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
};

export type InvoiceDraft = {
  invoiceNumber: string;
  customerId: number | null;
  customerSnapshot: Customer | null;
  invoiceDate: string;
  dueDate: string | null;
  notes: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  currencySymbol: string;
  businessSnapshot?: BusinessSettings;
  items: InvoiceItem[];
};

export type BackupPayload = {
  schemaVersion: number;
  exportedAt: string;
  business: BusinessSettings;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
};

export type ImportSummary = {
  customerCount: number;
  productCount: number;
  invoiceCount: number;
};
