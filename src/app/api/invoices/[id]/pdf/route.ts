import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import type { Invoice, Client, CompanySettings } from '@/lib/types';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/invoice-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Use Admin SDK to bypass security rules
    let app;
    try {
      app = await initializeAdminApp();
    } catch (initError: any) {
      console.error('[INVOICE PDF API] Failed to initialize Firebase Admin:', {
        message: initError.message,
        name: initError.name,
        // Log if key exists but might be malformed
        hasKey: !!(process.env.SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
        keyLength: (process.env.SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').length,
      });
      // Return a user-friendly error without exposing internal config details
      if (initError.message?.includes('service account key') || initError.message?.includes('not set')) {
        return NextResponse.json(
          { error: 'Invoice download service is temporarily unavailable. Please contact support.' },
          { status: 503 }
        );
      }
      throw initError;
    }
    const db = getFirestore(app);

    const invoiceDoc = await db.collection('invoices').doc(id).get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
    
    // Get client data
    let client: Client | null = null;
    if (invoice.clientId) {
      const clientDoc = await db.collection('clients').doc(invoice.clientId).get();
      if (clientDoc.exists) {
        client = { id: clientDoc.id, ...clientDoc.data() } as Client;
      }
    }

    // Get company settings
    let companySettings: CompanySettings | null = null;
    const settingsDoc = await db.collection('companySettings').doc('company').get();
    if (settingsDoc.exists) {
      companySettings = { id: settingsDoc.id, ...settingsDoc.data() } as CompanySettings;
    }

    // Handle Firestore Timestamp conversion (Admin SDK Timestamps have toDate method)
    const issueDate = invoice.issueDate && typeof invoice.issueDate === 'object' && 'toDate' in invoice.issueDate
      ? invoice.issueDate.toDate()
      : new Date();
    const dueDate = invoice.dueDate && typeof invoice.dueDate === 'object' && 'toDate' in invoice.dueDate
      ? invoice.dueDate.toDate()
      : new Date();

    // Generate HTML invoice
    const html = generateInvoiceHTML(invoice, client, companySettings, issueDate, dueDate);

    // Return HTML that can be printed or converted to PDF
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    // If it's a service account error, return user-friendly HTML error page
    if (error.message?.includes('service account key')) {
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Service Unavailable</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .error { color: #dc2626; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Service Temporarily Unavailable</h1>
  <p class="error">Invoice download service is temporarily unavailable. Please contact support or try again later.</p>
</body>
</html>`;
      return new NextResponse(errorHtml, {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return NextResponse.json({ error: error.message || 'Failed to generate invoice' }, { status: 500 });
  }
}

function generateInvoiceHTML(
  invoice: Invoice,
  client: Client | null,
  companySettings: CompanySettings | null,
  issueDate: Date,
  dueDate: Date
): string {
  // Company information from settings
  const companyName = companySettings?.companyName || 'Dev2QA';
  const companyEmail = companySettings?.email || 'info@dev2qa.com';
  const companyPhone = companySettings?.phone || '';
  const companyLogo = companySettings?.logoUrl || '';
  const companyAddress = companySettings?.address
    ? [
        companySettings.address.street,
        companySettings.address.city,
        companySettings.address.state,
        companySettings.address.postalCode,
        companySettings.address.country,
      ].filter(Boolean).join(', ')
    : 'Your Company Address';
  
  // Get bank account details
  const bankAccount = invoice.bankAccountId && companySettings?.bankAccounts
    ? companySettings.bankAccounts.find(acc => acc.id === invoice.bankAccountId)
    : companySettings?.bankAccounts?.find(acc => acc.isDefault);

  // Gold and green gradient color scheme
  const primaryColor = '#10b981'; // Green
  const primaryColorDark = '#059669'; // Darker green
  const primaryColorLight = '#d1fae5'; // Light green
  const accentColor = '#f59e0b'; // Gold/Amber
  const accentColorDark = '#d97706'; // Darker gold
  const accentColorLight = '#fef3c7'; // Light gold
  // Gradient colors for headers
  const gradientStart = '#f59e0b'; // Gold
  const gradientEnd = '#10b981'; // Green

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 4px solid;
      border-image: linear-gradient(to right, ${gradientStart}, ${gradientEnd}) 1;
    }
    .company-section {
      flex: 1;
      max-width: 50%;
    }
    .company-logo {
      max-width: 180px;
      max-height: 70px;
      margin-bottom: 16px;
      object-fit: contain;
      display: block;
    }
    .company-info h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 12px;
      background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }
    .company-info p {
      color: #4b5563;
      margin: 3px 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .company-info .company-name-only {
      margin-top: 0;
      margin-bottom: 8px;
    }
    .invoice-section {
      text-align: right;
      flex: 1;
      max-width: 50%;
      padding-left: 20px;
    }
    .invoice-section h2 {
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .invoice-detail-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
      align-items: baseline;
    }
    .invoice-detail-label {
      font-weight: 600;
      color: #6b7280;
      margin-right: 8px;
      font-size: 13px;
      min-width: 100px;
      text-align: right;
    }
    .invoice-detail-value {
      color: #1f2937;
      font-size: 13px;
      text-align: right;
    }
    .invoice-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-status.sent {
      background: linear-gradient(135deg, ${accentColorLight}, ${primaryColorLight});
      color: ${primaryColorDark};
    }
    .invoice-status.draft {
      background-color: #f3f4f6;
      color: #6b7280;
    }
    .invoice-status.paid {
      background: linear-gradient(135deg, ${primaryColorLight}, #d1fae5);
      color: #065f46;
    }
    .invoice-status.overdue {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .bill-to, .invoice-details {
      flex: 1;
    }
    .bill-to h3, .invoice-details h3 {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${primaryColorDark};
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .bill-to p, .invoice-details p {
      margin: 4px 0;
      color: #374151;
    }
    .bill-to strong {
      font-size: 16px;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: linear-gradient(135deg, ${accentColorLight}, ${primaryColorLight});
    }
    th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${primaryColorDark};
      border-bottom: 2px solid ${primaryColor};
    }
    th.text-right {
      text-align: right;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #374151;
    }
    td.text-right {
      text-align: right;
    }
    tfoot {
      background: linear-gradient(135deg, ${accentColorLight}, ${primaryColorLight});
    }
    tfoot td {
      font-weight: 600;
      border-bottom: none;
      padding: 12px;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table tr:last-child td {
      font-size: 18px;
      font-weight: bold;
      background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      border-top: 3px solid;
      border-image: linear-gradient(to right, ${gradientStart}, ${gradientEnd}) 1;
      padding-top: 16px;
    }
    .notes {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .notes h3 {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .notes p {
      color: #374151;
      white-space: pre-wrap;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-section">
        <div class="company-info">
          ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="company-logo" />` : ''}
          <h1 class="${companyLogo ? 'company-name-only' : ''}">${companyName}</h1>
          ${companyAddress ? `<p>${companyAddress}</p>` : ''}
          ${companyEmail ? `<p>${companyEmail}</p>` : ''}
          ${companyPhone ? `<p>${companyPhone}</p>` : ''}
        </div>
      </div>
      <div class="invoice-section">
        <h2>INVOICE</h2>
        <div class="invoice-detail-row">
          <span class="invoice-detail-label">Invoice #:</span>
          <span class="invoice-detail-value">${invoice.invoiceNumber}</span>
        </div>
        <div class="invoice-detail-row">
          <span class="invoice-detail-label">Issue Date:</span>
          <span class="invoice-detail-value">${format(issueDate, 'MMM d, yyyy')}</span>
        </div>
        <div class="invoice-detail-row">
          <span class="invoice-detail-label">Due Date:</span>
          <span class="invoice-detail-value">${format(dueDate, 'MMM d, yyyy')}</span>
        </div>
        <div class="invoice-detail-row" style="margin-top: 12px;">
          <span class="invoice-detail-label">Status:</span>
          <span class="invoice-status ${invoice.status.toLowerCase()}">${invoice.status.toUpperCase().replace('_', ' ')}</span>
        </div>
      </div>
    </div>

    <div class="billing-section">
      <div class="bill-to">
        <h3>Bill To</h3>
        <p><strong>${invoice.clientName}</strong></p>
        ${client?.companyName ? `<p>${client.companyName}</p>` : ''}
        ${client?.address?.street ? `<p>${client.address.street}</p>` : ''}
        ${client?.address?.city && client?.address?.state ? `<p>${client.address.city}, ${client.address.state} ${client.address.postalCode || ''}</p>` : ''}
        ${client?.address?.country ? `<p>${client.address.country}</p>` : ''}
        ${client?.email ? `<p>${client.email}</p>` : ''}
        ${client?.phone ? `<p>${client.phone}</p>` : ''}
      </div>
      <div class="invoice-details">
        <h3>Invoice Details</h3>
        ${invoice.projectName ? `<p><strong>Project:</strong> ${invoice.projectName}</p>` : ''}
        <p><strong>Currency:</strong> ${invoice.currency}</p>
        ${invoice.exchangeRate ? `<p><strong>Exchange Rate:</strong> ${invoice.exchangeRate}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Tax</th>
          <th class="text-right">Discount</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice, invoice.currency)}</td>
            <td class="text-right">${item.taxRate ? `${item.taxRate}%` : '-'}</td>
            <td class="text-right">${item.discount ? formatCurrency(item.discount, invoice.currency) : '-'}</td>
            <td class="text-right">${formatCurrency(item.total, invoice.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${formatCurrency(invoice.subtotal, invoice.currency)}</td>
        </tr>
        ${invoice.discountAmount > 0 ? `
        <tr>
          <td>Discount:</td>
          <td class="text-right">-${formatCurrency(invoice.discountAmount, invoice.currency)}</td>
        </tr>
        ` : ''}
        ${invoice.taxAmount > 0 ? `
        <tr>
          <td>Tax:</td>
          <td class="text-right">${formatCurrency(invoice.taxAmount, invoice.currency)}</td>
        </tr>
        ` : ''}
        <tr>
          <td>Total:</td>
          <td class="text-right">${formatCurrency(invoice.totalAmount, invoice.currency)}</td>
        </tr>
        ${invoice.paidAmount > 0 ? `
        <tr>
          <td>Paid:</td>
          <td class="text-right">${formatCurrency(invoice.paidAmount, invoice.currency)}</td>
        </tr>
        <tr>
          <td>Outstanding:</td>
          <td class="text-right">${formatCurrency(invoice.outstandingAmount, invoice.currency)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

        ${bankAccount ? `
    <div class="notes" style="background: linear-gradient(135deg, ${accentColorLight}, ${primaryColorLight}); padding: 20px; border-radius: 6px; margin-top: 30px; border-left: 4px solid ${primaryColor};">
      <h3 style="margin-bottom: 12px; color: ${primaryColorDark}; font-weight: 600;">Payment Information</h3>
      <p style="margin: 4px 0;"><strong>Bank:</strong> ${bankAccount.bankName}</p>
      <p style="margin: 4px 0;"><strong>Account Name:</strong> ${bankAccount.accountName}</p>
      <p style="margin: 4px 0;"><strong>Account Number:</strong> ${bankAccount.accountNumber}</p>
      ${bankAccount.routingNumber ? `<p style="margin: 4px 0;"><strong>Routing Number:</strong> ${bankAccount.routingNumber}</p>` : ''}
      ${bankAccount.swiftCode ? `<p style="margin: 4px 0;"><strong>SWIFT Code:</strong> ${bankAccount.swiftCode}</p>` : ''}
      ${bankAccount.iban ? `<p style="margin: 4px 0;"><strong>IBAN:</strong> ${bankAccount.iban}</p>` : ''}
      <p style="margin: 4px 0;"><strong>Currency:</strong> ${bankAccount.currency}</p>
    </div>
    ` : ''}

        ${invoice.notes || invoice.terms ? `
    <div class="notes" style="background: linear-gradient(135deg, ${accentColorLight}, ${primaryColorLight}); padding: 20px; border-radius: 6px; margin-top: 30px; border-left: 4px solid ${primaryColor};">
      ${invoice.notes ? `
      <h3 style="margin-bottom: 12px; color: ${primaryColorDark}; font-weight: 600;">Notes</h3>
      <p style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${invoice.notes}</p>
      ` : ''}
      ${invoice.terms ? `
      <h3 style="margin-top: 20px; margin-bottom: 12px; color: ${primaryColorDark}; font-weight: 600;">Payment Terms</h3>
      <p style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${invoice.terms}</p>
      ` : ''}
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

