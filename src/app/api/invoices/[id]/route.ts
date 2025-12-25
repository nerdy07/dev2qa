import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import type { Invoice, Client } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Use Admin SDK to bypass security rules for public access
    const app = await initializeAdminApp();
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

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const serializedInvoice = {
      ...invoice,
      issueDate: invoice.issueDate && typeof invoice.issueDate === 'object' && 'toDate' in invoice.issueDate
        ? invoice.issueDate.toDate().toISOString()
        : null,
      dueDate: invoice.dueDate && typeof invoice.dueDate === 'object' && 'toDate' in invoice.dueDate
        ? invoice.dueDate.toDate().toISOString()
        : null,
      sentAt: invoice.sentAt && typeof invoice.sentAt === 'object' && 'toDate' in invoice.sentAt
        ? invoice.sentAt.toDate().toISOString()
        : null,
      paidAt: invoice.paidAt && typeof invoice.paidAt === 'object' && 'toDate' in invoice.paidAt
        ? invoice.paidAt.toDate().toISOString()
        : null,
      createdAt: invoice.createdAt && typeof invoice.createdAt === 'object' && 'toDate' in invoice.createdAt
        ? invoice.createdAt.toDate().toISOString()
        : null,
      updatedAt: invoice.updatedAt && typeof invoice.updatedAt === 'object' && 'toDate' in invoice.updatedAt
        ? invoice.updatedAt.toDate().toISOString()
        : null,
      payments: invoice.payments?.map(payment => ({
        ...payment,
        paymentDate: payment.paymentDate && typeof payment.paymentDate === 'object' && 'toDate' in payment.paymentDate
          ? payment.paymentDate.toDate().toISOString()
          : null,
      })) || [],
    };

    return NextResponse.json({
      invoice: serializedInvoice,
      client: client ? {
        ...client,
        createdAt: client.createdAt && typeof client.createdAt === 'object' && 'toDate' in client.createdAt
          ? client.createdAt.toDate().toISOString()
          : null,
        updatedAt: client.updatedAt && typeof client.updatedAt === 'object' && 'toDate' in client.updatedAt
          ? client.updatedAt.toDate().toISOString()
          : null,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch invoice' }, { status: 500 });
  }
}


