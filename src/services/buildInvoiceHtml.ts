import { Invoice } from '../types';
import dayjs from 'dayjs';

/**
 * Extracts first letters from the business name to form a monogram (e.g. "Sanla Fabrication" -> "SF")
 */
const getBusinessInitials = (name: string): string => {
  if (!name || !name.trim()) return 'SF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const buildInvoiceHtml = (invoice: Invoice, logoBase64: string | null, signatureBase64: string | null = null): string => {
  const business = invoice.businessSnapshot;
  const customer = invoice.customerSnapshot;
  const currency = invoice.currencySymbol || '₹';
  
  const initials = getBusinessInitials(business?.name || 'AeroBill');
  const formattedInvoiceDate = dayjs(invoice.invoiceDate).format('DD-MM-YYYY');
  const formattedDueDate = invoice.dueDate ? dayjs(invoice.dueDate).format('DD-MM-YYYY') : null;
  const templateId = business?.templateId || '1';

  // Helper functions for shared HTML snippets
  const getLogoHtml = () => logoBase64 
    ? `<img class="logo-image" src="data:image/jpeg;base64,${logoBase64}" />` 
    : `<span class="logo-monogram">${initials}</span>`;

  const getBusinessDetailsHtml = () => `
    <h1 class="business-name">${business?.name || 'AeroBill'}</h1>
    ${business?.address ? `<p class="business-meta">${business.address}</p>` : ''}
    ${business?.phone || business?.email ? `
      <p class="business-meta">
        ${business.phone ? `${business.phone}` : ''}
        ${business.phone && business.email ? '<br/>' : ''}
        ${business.email ? `${business.email}` : ''}
      </p>
    ` : ''}
    ${business?.gstin ? `<p class="business-meta" style="margin-top: 4px;"><strong>Tax Id:</strong> ${business.gstin}</p>` : ''}
  `;

  const getCustomerDetailsHtml = () => customer ? `
    <h3 class="customer-name">${customer.name}</h3>
    ${customer.address ? `<p class="customer-meta">${customer.address}</p>` : ''}
    ${customer.phone ? `<p class="customer-meta">${customer.phone}</p>` : ''}
    ${customer.email ? `<p class="customer-meta">${customer.email}</p>` : ''}
  ` : `
    <h3 class="customer-name">Walk-in Customer</h3>
  `;

  const getTableRowsHtml = () => invoice.items.map((item, index) => `
    <tr>
      <td class="text-center bold-cell">${index + 1}</td>
      <td class="text-left">
        <div style="font-weight: bold; color: #111;">${item.itemName}</div>
        <div style="font-size: 9px; color: #666; margin-top: 2px;">${item.unit}</div>
      </td>
      <td class="text-right bold-cell">${item.quantity.toFixed(2)}</td>
      <td class="text-right">${item.unitPrice.toFixed(2)}</td>
      <td class="text-right bold-cell">${item.lineTotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const sigPath = business?.signaturePath?.toLowerCase() || '';
  const sigMime = sigPath.endsWith('.jpg') || sigPath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';

  const getSignatureHtml = (align: string = 'right') => `
    <div class="signature-outer-container" style="text-align: ${align}; margin-top: 30px; width: 100%;">
      <div class="signature-container" style="display: inline-block; text-align: center; width: 180px; page-break-inside: avoid; vertical-align: top;">
        ${signatureBase64 
          ? `<img style="max-width: 180px; max-height: 60px; margin-bottom: 6px; object-fit: contain; margin-left: auto; margin-right: auto; display: block;" src="data:${sigMime};base64,${signatureBase64}" />` 
          : `<div class="signature-line" style="width: 150px; border-bottom: 1.5px dashed #999; margin-bottom: 8px; margin-left: auto; margin-right: auto;"></div>`
        }
        <div class="signature-name" style="font-weight: 800; font-size: 13.5px; color: #1e293b; margin-top: 4px;">${business?.signatoryName || business?.name || 'Authorized Signatory'}</div>
        <div class="signature-label" style="font-weight: bold; font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.5px;">Authorized Signatory</div>
      </div>
    </div>
  `;

  // === TEMPLATE 1: Default / Classic (Blue header) ===
  const template1 = `
    <style>
      @page { margin: 0; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #333; }
      .invoice-container { max-width: 800px; margin: 0 auto; background-color: #fff; }
      .header-banner { background-color: #4a7eec; padding: 20px 24px; color: #fff; display: flex; align-items: center; }
      .logo-container { width: 65px; height: 65px; background-color: #fff; border-radius: 4px; margin-right: 18px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
      .logo-image { max-width: 100%; max-height: 100%; object-fit: contain; }
      .logo-monogram { color: #4a7eec; font-size: 28px; font-weight: 900; }
      .business-info { flex: 1; }
      .business-name { font-size: 22px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; }
      .business-meta { font-size: 11.5px; margin: 2px 0 0 0; color: #e2ecff; }
      .content-body { padding: 20px 24px; }
      .doc-title { text-align: center; font-size: 22px; color: #4a7eec; font-weight: bold; margin: 10px 0 25px 0; text-transform: uppercase; }
      .meta-section { display: flex; justify-content: space-between; margin-bottom: 24px; }
      .bill-to-block { flex: 0.6; }
      .section-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
      .customer-name { font-size: 15px; font-weight: bold; margin: 0 0 4px 0; }
      .customer-meta { font-size: 12px; color: #555; margin: 2px 0; }
      .invoice-meta-block { flex: 0.35; text-align: right; }
      .invoice-number-large { font-size: 20px; font-weight: bold; color: #4a7eec; margin: 0 0 6px 0; }
      .meta-date-label { font-size: 13px; color: #4a7eec; font-weight: bold; margin: 4px 0; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
      .items-table th { background-color: #4a7eec; color: #fff; font-size: 11.5px; padding: 8px 12px; text-align: left; }
      .items-table td { font-size: 12px; padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
      .text-center { text-align: center !important; } .text-right { text-align: right !important; } .text-left { text-align: left !important; }
      .footer-grid { display: flex; justify-content: space-between; margin-top: 15px; page-break-inside: avoid; }
      .note-column { flex: 0.55; }
      .note-box-title { font-size: 12px; font-weight: bold; border-bottom: 1.5px solid #4a7eec; margin-bottom: 6px; display: inline-block; }
      .note-box-content { font-size: 11px; color: #555; white-space: pre-wrap; }
      .totals-column { flex: 0.4; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; font-weight: bold; border-bottom: 1px solid #333; }
      .grand-total-banner { background-color: #4a7eec; color: #fff; display: flex; justify-content: space-between; padding: 8px 12px; font-size: 13.5px; font-weight: bold; border-radius: 3px; margin-top: 5px; }
      .signature-container { margin-top: 50px; display: flex; flex-direction: column; page-break-inside: avoid; }
      .signature-line { width: 150px; border-bottom: 1px dashed #aaa; margin-bottom: 6px; }
      .signature-name { font-size: 12px; font-weight: bold; }
      .signature-label { font-size: 10px; color: #777; text-transform: uppercase; }
    </style>
    <div class="invoice-container">
      <div class="header-banner">
        <div class="logo-container">${getLogoHtml()}</div>
        <div class="business-info">${getBusinessDetailsHtml()}</div>
      </div>
      <div class="content-body">
        <h2 class="doc-title">Invoice</h2>
        <div class="meta-section">
          <div class="bill-to-block">
            <div class="section-title">Bill To</div>
            ${getCustomerDetailsHtml()}
          </div>
          <div class="invoice-meta-block">
            <h3 class="invoice-number-large">${invoice.invoiceNumber}</h3>
            <div class="meta-date-label">Date: ${formattedInvoiceDate}</div>
            ${formattedDueDate ? `<div class="meta-date-label" style="color: #666; font-size: 11px;">Due Date: ${formattedDueDate}</div>` : ''}
          </div>
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">Sr</th>
              <th>Product</th>
              <th class="text-right" style="width: 60px;">Qty</th>
              <th class="text-right" style="width: 90px;">Rate</th>
              <th class="text-right" style="width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>${getTableRowsHtml()}</tbody>
        </table>
        <div class="footer-grid">
          <div class="note-column">
            ${invoice.notes ? `<div class="note-box-title">Please Note</div><div class="note-box-content">${invoice.notes}</div>` : ''}
          </div>
          <div class="totals-column">
            <div class="totals-row"><span>Total</span><span>${currency}${invoice.subtotal.toFixed(2)}</span></div>
            ${invoice.taxRate > 0 ? `<div class="totals-row" style="font-weight:normal;"><span>GST (${invoice.taxRate}%)</span><span>${currency}${invoice.taxAmount.toFixed(2)}</span></div>` : ''}
            <div class="grand-total-banner"><span>Grand Total</span><span>${currency}${invoice.grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
        ${getSignatureHtml('right')}
      </div>
    </div>
  `;

  // === TEMPLATE 2: Corporate (White header, bold INVOICE) ===
  const template2 = `
    <style>
      @page { margin: 0; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #333; }
      .invoice-container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 40px; }
      .header-section { display: flex; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
      .header-left { flex: 1; }
      .header-right { flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
      .doc-title { font-size: 36px; color: #111; font-weight: 300; margin: 0 0 10px 0; letter-spacing: 2px; }
      .inv-meta { font-size: 12px; color: #555; line-height: 1.6; }
      .logo-container { width: 80px; height: 80px; margin-bottom: 10px; }
      .logo-image { max-width: 100%; max-height: 100%; object-fit: contain; }
      .business-name { font-size: 16px; font-weight: bold; margin: 0 0 4px 0; }
      .business-meta { font-size: 11px; color: #666; margin: 0; line-height: 1.4; }
      .meta-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .bill-to-title { font-size: 12px; color: #3b82f6; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
      .customer-name { font-size: 14px; font-weight: bold; margin: 0 0 4px 0; }
      .customer-meta { font-size: 11px; color: #555; margin: 2px 0; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      .items-table th { background-color: #3b82f6; color: #fff; font-size: 11px; padding: 10px; text-transform: uppercase; text-align: left; }
      .items-table td { font-size: 12px; padding: 12px 10px; border-bottom: 1px solid #eee; }
      .text-center { text-align: center !important; } .text-right { text-align: right !important; } .text-left { text-align: left !important; }
      .footer-section { display: flex; justify-content: space-between; page-break-inside: avoid; }
      .notes-block { flex: 0.5; font-size: 11px; color: #666; }
      .totals-block { flex: 0.4; }
      .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
      .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #3b82f6; padding-top: 10px; margin-top: 4px; }
      .signature-container { margin-top: 40px; display: flex; flex-direction: column; page-break-inside: avoid; }
      .signature-line { width: 140px; border-bottom: 1px solid #000; margin-bottom: 4px; }
      .signature-name { font-size: 12px; font-weight: bold; }
      .signature-label { font-size: 10px; color: #888; }
    </style>
    <div class="invoice-container">
      <div class="header-section">
        <div class="header-left">
          <h1 class="doc-title">INVOICE</h1>
          <div class="inv-meta">
            <strong>${invoice.invoiceNumber}</strong><br/>
            Date: ${formattedInvoiceDate}
            ${formattedDueDate ? `<br/>Due: ${formattedDueDate}` : ''}
          </div>
        </div>
        <div class="header-right">
          <div class="logo-container">${getLogoHtml()}</div>
          ${getBusinessDetailsHtml()}
        </div>
      </div>
      <div class="meta-section">
        <div class="bill-to-block">
          <div class="bill-to-title">Bill To</div>
          ${getCustomerDetailsHtml()}
        </div>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 40px;">Sr</th>
            <th>Product</th>
            <th class="text-right" style="width: 60px;">Qty</th>
            <th class="text-right" style="width: 90px;">Rate</th>
            <th class="text-right" style="width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>${getTableRowsHtml()}</tbody>
      </table>
      <div class="footer-section">
        <div class="notes-block">
          ${invoice.notes ? `<strong>Notes:</strong><br/>${invoice.notes}` : ''}
          ${getSignatureHtml('left')}
        </div>
        <div class="totals-block">
          <div class="totals-row"><span>Subtotal</span><span>${currency}${invoice.subtotal.toFixed(2)}</span></div>
          ${invoice.taxRate > 0 ? `<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span>${currency}${invoice.taxAmount.toFixed(2)}</span></div>` : ''}
          <div class="totals-row grand-total"><span>Total</span><span>${currency}${invoice.grandTotal.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  `;

  // === TEMPLATE 3: Bold Header ===
  const template3 = `
    <style>
      @page { margin: 0; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #333; }
      .invoice-container { max-width: 800px; margin: 0 auto; background-color: #fff; }
      .header-top { display: flex; padding: 30px; justify-content: space-between; align-items: flex-start; }
      .logo-container { width: 70px; height: 70px; }
      .logo-image { max-width: 100%; max-height: 100%; object-fit: contain; }
      .business-name { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; color: #111; }
      .business-meta { font-size: 11px; color: #666; margin: 0; }
      .blue-banner { background-color: #2563eb; color: #fff; display: flex; justify-content: space-between; padding: 15px 30px; align-items: center; }
      .doc-title { font-size: 24px; font-weight: normal; margin: 0; letter-spacing: 1px; }
      .inv-meta-box { background-color: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 4px; text-align: right; font-size: 12px; }
      .content-body { padding: 30px; }
      .bill-to-title { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
      .customer-name { font-size: 15px; font-weight: bold; margin: 0 0 4px 0; }
      .customer-meta { font-size: 11px; color: #555; margin: 2px 0; }
      .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
      .items-table th { background-color: #f1f5f9; color: #333; font-size: 11px; padding: 12px; text-transform: uppercase; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
      .items-table td { font-size: 12px; padding: 12px; border-bottom: 1px solid #e2e8f0; }
      .text-center { text-align: center !important; } .text-right { text-align: right !important; } .text-left { text-align: left !important; }
      .footer-grid { display: flex; justify-content: space-between; page-break-inside: avoid; background-color: #f8fafc; padding: 20px; border-radius: 6px; }
      .totals-block { width: 300px; }
      .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #e2e8f0; }
      .grand-total { font-weight: bold; font-size: 16px; color: #0f172a; border-bottom: none; padding-top: 12px; }
      .signature-container { margin-top: 40px; display: flex; flex-direction: column; page-break-inside: avoid; }
      .signature-line { width: 150px; border-bottom: 1px solid #333; margin-bottom: 4px; }
      .signature-name { font-size: 12px; font-weight: bold; }
      .signature-label { font-size: 10px; color: #64748b; }
    </style>
    <div class="invoice-container">
      <div class="header-top">
        <div>
          <div class="logo-container">${getLogoHtml()}</div>
          ${getBusinessDetailsHtml()}
        </div>
      </div>
      <div class="blue-banner">
        <h1 class="doc-title">INVOICE</h1>
        <div class="inv-meta-box">
          <strong>${invoice.invoiceNumber}</strong><br/>
          Date: ${formattedInvoiceDate}
        </div>
      </div>
      <div class="content-body">
        <div class="bill-to-block">
          <div class="bill-to-title">Bill To</div>
          ${getCustomerDetailsHtml()}
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">Sr</th>
              <th>Product</th>
              <th class="text-right" style="width: 60px;">Qty</th>
              <th class="text-right" style="width: 90px;">Rate</th>
              <th class="text-right" style="width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>${getTableRowsHtml()}</tbody>
        </table>
        <div class="footer-grid">
          <div style="flex: 1; margin-right: 20px; font-size: 11px; color: #64748b;">
            ${invoice.notes ? `<strong>Notes:</strong><br/>${invoice.notes}` : ''}
          </div>
          <div class="totals-block">
            <div class="totals-row"><span>Subtotal</span><span>${currency}${invoice.subtotal.toFixed(2)}</span></div>
            ${invoice.taxRate > 0 ? `<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span>${currency}${invoice.taxAmount.toFixed(2)}</span></div>` : ''}
            <div class="totals-row grand-total"><span>Total</span><span>${currency}${invoice.grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
        ${getSignatureHtml('right')}
      </div>
    </div>
  `;

  // === TEMPLATE 4: Minimalist ===
  const template4 = `
    <style>
      @page { margin: 0; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #000; }
      .invoice-container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 40px; }
      .doc-title { text-align: center; font-size: 28px; letter-spacing: 4px; margin: 0 0 40px 0; font-weight: 300; border-bottom: 1px solid #000; padding-bottom: 20px; }
      .header-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
      .business-name { font-size: 14px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; }
      .business-meta, .customer-meta { font-size: 11px; margin: 0; line-height: 1.5; color: #444; }
      .customer-name { font-size: 14px; font-weight: bold; margin: 0 0 4px 0; }
      .inv-meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
      .inv-meta-value { font-size: 12px; font-weight: bold; margin-bottom: 10px; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      .items-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 12px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
      .items-table td { padding: 12px 8px; font-size: 12px; border-bottom: 1px solid #eee; }
      .text-center { text-align: center !important; } .text-right { text-align: right !important; } .text-left { text-align: left !important; }
      .footer-section { display: flex; justify-content: flex-end; page-break-inside: avoid; margin-bottom: 40px; }
      .totals-block { width: 250px; }
      .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; }
      .grand-total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; margin-top: 4px; }
      .signature-container { display: flex; flex-direction: column; align-items: flex-end; page-break-inside: avoid; }
      .signature-line { width: 150px; border-bottom: 1px solid #000; margin-bottom: 4px; }
      .signature-name { font-size: 12px; font-weight: bold; }
    </style>
    <div class="invoice-container">
      <h1 class="doc-title">INVOICE</h1>
      <div class="header-grid">
        <div>
          <div style="margin-bottom: 20px;">
            ${getBusinessDetailsHtml()}
          </div>
          <div>
            <div class="inv-meta-label">Bill To</div>
            ${getCustomerDetailsHtml()}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="inv-meta-label">Invoice No</div>
          <div class="inv-meta-value">${invoice.invoiceNumber}</div>
          <div class="inv-meta-label">Date</div>
          <div class="inv-meta-value">${formattedInvoiceDate}</div>
          ${formattedDueDate ? `<div class="inv-meta-label">Due Date</div><div class="inv-meta-value">${formattedDueDate}</div>` : ''}
        </div>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>
                <strong>${item.itemName}</strong><br/>
                <span style="font-size: 10px; color: #888;">${item.unit}</span>
              </td>
              <td class="text-right">${item.quantity.toFixed(2)}</td>
              <td class="text-right">${item.unitPrice.toFixed(2)}</td>
              <td class="text-right">${item.lineTotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer-section">
        <div class="totals-block">
          <div class="totals-row"><span>Subtotal</span><span>${currency}${invoice.subtotal.toFixed(2)}</span></div>
          ${invoice.taxRate > 0 ? `<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span>${currency}${invoice.taxAmount.toFixed(2)}</span></div>` : ''}
          <div class="totals-row grand-total"><span>Total Due</span><span>${currency}${invoice.grandTotal.toFixed(2)}</span></div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="flex: 1; font-size: 11px; color: #666; padding-right: 20px;">
          ${invoice.notes ? `<strong>Notes:</strong><br/>${invoice.notes}` : ''}
        </div>
        ${getSignatureHtml('right')}
      </div>
    </div>
  `;

  switch (templateId) {
    case '2': return template2;
    case '3': return template3;
    case '4': return template4;
    case '1':
    default: return template1;
  }
};
