import { create } from 'zustand';
import { Customer, InvoiceDraft, InvoiceItem, BusinessSettings } from '../types';
import { InvoiceRepository } from '../db/repositories/InvoiceRepository';
import { SettingsRepository } from '../db/repositories/SettingsRepository';

type InvoiceDraftState = {
  draft: InvoiceDraft | null;
  initializeDraft: (settings: BusinessSettings) => Promise<void>;
  updateDraft: (fields: Partial<InvoiceDraft>) => void;
  setCustomer: (customer: Customer | null) => void;
  setInvoiceDetails: (details: Partial<Omit<InvoiceDraft, 'items'>>) => void;
  addItem: (product: any, itemName: string, unitPrice: number, unit: string) => void;
  updateItem: (index: number, item: Partial<InvoiceItem>) => void;
  removeItem: (index: number) => void;
  updateTaxRate: (rate: number) => void;
  resetDraft: () => Promise<void>;
};

const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const grandTotal = subtotal + taxAmount;
  return { subtotal, taxAmount, grandTotal };
};

export const useInvoiceDraftStore = create<InvoiceDraftState>((set, get) => ({
  draft: null,

  initializeDraft: async (settings: BusinessSettings) => {
    try {
      const nextNumber = await InvoiceRepository.getNextNumber();
      const newDraft: InvoiceDraft = {
        invoiceNumber: nextNumber,
        customerId: null,
        customerSnapshot: null,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: null,
        notes: '',
        subtotal: 0,
        taxRate: settings.defaultTaxRate,
        taxAmount: 0,
        grandTotal: 0,
        currencySymbol: settings.currencySymbol,
        businessSnapshot: settings,
        items: [],
      };
      set({ draft: newDraft });
    } catch {
      // Fallback draft initialization in case settings are missing or load fails
      const newDraft: InvoiceDraft = {
        invoiceNumber: 'INV-0001',
        customerId: null,
        customerSnapshot: null,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: null,
        notes: '',
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: 0,
        currencySymbol: '₹',
        items: [],
      };
      set({ draft: newDraft });
    }
  },

  updateDraft: (fields: Partial<InvoiceDraft>) => {
    const { draft } = get();
    if (!draft) return;
    set({ draft: { ...draft, ...fields } });
  },

  setCustomer: (customer: Customer | null) => {
    const { draft } = get();
    if (!draft) return;

    set({
      draft: {
        ...draft,
        customerId: (customer && customer.id > 0) ? customer.id : null,
        customerSnapshot: customer,
      },
    });
  },

  setInvoiceDetails: (details: Partial<Omit<InvoiceDraft, 'items'>>) => {
    const { draft } = get();
    if (!draft) return;

    set({
      draft: {
        ...draft,
        ...details,
      },
    });
  },

  addItem: (product: any, itemName: string, unitPrice: number, unit: string) => {
    const { draft } = get();
    if (!draft) return;

    const newItem: InvoiceItem = {
      productId: product ? product.id : null,
      itemName: itemName,
      quantity: 1,
      unit: unit,
      unitPrice: unitPrice,
      lineTotal: unitPrice, // 1 * unitPrice
      sortOrder: draft.items.length,
    };

    const newItems = [...draft.items, newItem];
    const totals = calculateTotals(newItems, draft.taxRate);

    set({
      draft: {
        ...draft,
        items: newItems,
        ...totals,
      },
    });
  },

  updateItem: (index: number, updatedFields: Partial<InvoiceItem>) => {
    const { draft } = get();
    if (!draft) return;

    const newItems = draft.items.map((item, idx) => {
      if (idx !== index) return item;
      const merged = { ...item, ...updatedFields };
      merged.lineTotal = merged.quantity * merged.unitPrice;
      return merged;
    });

    const totals = calculateTotals(newItems, draft.taxRate);

    set({
      draft: {
        ...draft,
        items: newItems,
        ...totals,
      },
    });
  },

  removeItem: (index: number) => {
    const { draft } = get();
    if (!draft) return;

    const newItems = draft.items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, sortOrder: idx })); // Resort items

    const totals = calculateTotals(newItems, draft.taxRate);

    set({
      draft: {
        ...draft,
        items: newItems,
        ...totals,
      },
    });
  },

  updateTaxRate: (rate: number) => {
    const { draft } = get();
    if (!draft) return;

    const totals = calculateTotals(draft.items, rate);

    set({
      draft: {
        ...draft,
        taxRate: rate,
        ...totals,
      },
    });
  },

  resetDraft: async () => {
    try {
      const settings = await SettingsRepository.get();
      await get().initializeDraft(settings);
    } catch {
      // Fallback draft initialization in case settings are missing or load fails
      const fallbackSettings: BusinessSettings = {
        id: 1,
        name: '',
        address: '',
        phone: '',
        email: '',
        gstin: '',
        logoPath: null,
        signaturePath: null,
        defaultTaxRate: 0,
        currencySymbol: '₹',
        invoicePrefix: 'INV-',
        invoiceSequence: 0,
        thankYouMessage: 'Thank you for your business!',
        theme: 'system',
        updatedAt: new Date().toISOString(),
      };
      await get().initializeDraft(fallbackSettings);
    }
  },
}));
