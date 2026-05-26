import { buildInvoiceHtml } from '../buildInvoiceHtml';
import { Invoice, InvoiceItem, Customer, BusinessSettings } from '../../types';

// Standard Mock Data Elements
const mockBusiness: BusinessSettings = {
  id: 1,
  name: 'Sanla Fabrication',
  address: '106 Khan Baodi Gaushala Road Ratlam 457001',
  phone: '9039711172',
  email: 'sanla@gmail.com',
  gstin: '23AAAAA0000A1Z1',
  logoPath: '/dummy/path/logo.jpg',
  defaultTaxRate: 18,
  currencySymbol: '₹',
  invoicePrefix: 'INV-',
  invoiceSequence: 4,
  thankYouMessage: 'Thank you for your business!',
  theme: 'light',
  updatedAt: '2026-05-24T12:00:00Z',
};

const mockCustomer: Customer = {
  id: 1,
  name: 'Akshat industries',
  phone: '7000516992',
  email: 'akshat@gmail.com',
  address: 'Ratlam',
  isArchived: false,
  createdAt: '2026-05-24T12:00:00Z',
  updatedAt: '2026-05-24T12:00:00Z',
};

const mockItems: InvoiceItem[] = [
  {
    id: 1,
    invoiceId: 2,
    productId: 1,
    itemName: 'Seeddrill Box',
    quantity: 5,
    unit: 'pcs',
    unitPrice: 2000,
    lineTotal: 10000,
    sortOrder: 0,
  },
];

const mockInvoice: Invoice = {
  id: 2,
  invoiceNumber: 'INV2',
  customerId: 1,
  customerSnapshot: mockCustomer,
  invoiceDate: '2025-09-25',
  dueDate: '2025-10-25',
  notes: 'Quality over quantity',
  subtotal: 10000,
  taxRate: 18,
  taxAmount: 1800,
  grandTotal: 11800,
  currencySymbol: '₹',
  businessSnapshot: mockBusiness,
  pdfPath: null,
  isDeleted: false,
  createdAt: '2026-05-24T12:00:00Z',
  updatedAt: '2026-05-24T12:00:00Z',
  items: mockItems,
};

describe('buildInvoiceHtml Template Suite', () => {
  
  test('replicates business and invoice metadata values correctly', () => {
    const html = buildInvoiceHtml(mockInvoice, null);
    
    // Assert structural values are in HTML
    expect(html).toContain('SANLA FABRICATION');
    expect(html).toContain('106 Khan Baodi Gaushala Road Ratlam 457001');
    expect(html).toContain('9039711172');
    expect(html).toContain('23AAAAA0000A1Z1');
    
    // Assert customer values are present
    expect(html).toContain('Akshat industries');
    expect(html).toContain('Ratlam');
    expect(html).toContain('7000516992');
    
    // Assert sequence labels
    expect(html).toContain('INV2');
    expect(html).toContain('25-09-2025'); // invoice date
    expect(html).toContain('25-10-2025'); // due date
    
    // Assert centered title
    expect(html).toContain('class="doc-title"');
  });

  test('embeds base64 logo correctly if provided', () => {
    const base64Dummy = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = buildInvoiceHtml(mockInvoice, base64Dummy);
    
    expect(html).toContain('src="data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="');
  });

  test('falls back to initials monogram if no base64 logo', () => {
    const html = buildInvoiceHtml(mockInvoice, null);
    
    // Sanla Fabrication initials should be "SF"
    expect(html).toContain('<span class="logo-monogram">SF</span>');
  });

  test('omits due date line completely if not provided', () => {
    const invoiceWithoutDueDate = { ...mockInvoice, dueDate: null };
    const html = buildInvoiceHtml(invoiceWithoutDueDate, null);
    
    expect(html).not.toContain('Due Date:');
  });

  test('omits tax rows and adjustments if tax rate is 0', () => {
    const taxFreeInvoice = { ...mockInvoice, taxRate: 0, taxAmount: 0 };
    const html = buildInvoiceHtml(taxFreeInvoice, null);
    
    expect(html).not.toContain('GST (0%)');
  });

  test('omits notes section entirely ifnotes are empty', () => {
    const noteFreeInvoice = { ...mockInvoice, notes: '' };
    const html = buildInvoiceHtml(noteFreeInvoice, null);
    
    expect(html).not.toContain('Please Note');
  });

  test('scales to 20 line items correctly without layout breaks', () => {
    const largeItemList: InvoiceItem[] = [];
    for (let i = 0; i < 20; i++) {
      largeItemList.push({
        id: i,
        productId: i,
        itemName: `Product Item #${i + 1}`,
        quantity: 1,
        unit: 'pcs',
        unitPrice: 100,
        lineTotal: 100,
        sortOrder: i,
      });
    }
    
    const largeInvoice = { ...mockInvoice, items: largeItemList };
    const html = buildInvoiceHtml(largeInvoice, null);
    
    // Confirm 20 items are rendered in 20 distinct tr blocks
    for (let i = 0; i < 20; i++) {
      expect(html).toContain(`Product Item #${i + 1}`);
    }
    
    // Count occurrences of unit: pcs inside items table
    const matches = html.match(/Unit: pcs/g);
    expect(matches?.length).toBe(20);
  });

});
