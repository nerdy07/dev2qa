/**
 * Utility functions for managing recurring invoices
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Invoice } from '@/lib/types';
import { generateInvoiceNumber, getNextInvoiceDate } from './invoice-utils';

/**
 * Generate recurring invoices that are due
 * This should be called by a cron job daily
 */
export async function generateRecurringInvoices(): Promise<{
  success: boolean;
  generated: number;
  errors: string[];
}> {
  if (!db) {
    return { success: false, generated: 0, errors: ['Database not initialized'] };
  }

  const errors: string[] = [];
  let generated = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Find all recurring invoices where nextInvoiceDate <= today
    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('isRecurring', '==', true),
      where('status', 'in', ['sent', 'paid', 'partially_paid'])
    );

    const snapshot = await getDocs(q);
    const invoices: Invoice[] = [];
    
    snapshot.forEach((docSnap) => {
      const invoice = { id: docSnap.id, ...docSnap.data() } as Invoice;
      const nextDate = invoice.nextInvoiceDate?.toDate?.();
      
      // Check if next invoice date is today or in the past
      if (nextDate && nextDate <= today) {
        invoices.push(invoice);
      }
    });

    // Generate new invoices for each recurring invoice
    for (const parentInvoice of invoices) {
      try {
        const nextDate = parentInvoice.nextInvoiceDate?.toDate?.() || new Date();
        
        // Generate new invoice number
        const invoiceNumber = await generateInvoiceNumber(nextDate.getFullYear());

        // Create new invoice based on parent
        const newInvoiceData: Partial<Invoice> = {
          invoiceNumber,
          clientId: parentInvoice.clientId,
          clientName: parentInvoice.clientName,
          projectId: parentInvoice.projectId,
          projectName: parentInvoice.projectName,
          lineItems: parentInvoice.lineItems.map(item => ({ ...item })),
          subtotal: parentInvoice.subtotal,
          taxAmount: parentInvoice.taxAmount,
          discountAmount: parentInvoice.discountAmount,
          totalAmount: parentInvoice.totalAmount,
          currency: parentInvoice.currency,
          exchangeRate: parentInvoice.exchangeRate,
          issueDate: serverTimestamp(),
          dueDate: serverTimestamp(), // Calculate based on payment terms
          notes: parentInvoice.notes,
          terms: parentInvoice.terms,
          isRecurring: false, // Child invoices are not recurring
          status: 'draft',
          paidAmount: 0,
          outstandingAmount: parentInvoice.totalAmount,
          payments: [],
          createdById: parentInvoice.createdById,
          createdByName: parentInvoice.createdByName,
          parentInvoiceId: parentInvoice.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Calculate due date (same as parent's payment terms)
        if (parentInvoice.issueDate && parentInvoice.dueDate) {
          const parentIssueDate = parentInvoice.issueDate.toDate();
          const parentDueDate = parentInvoice.dueDate.toDate();
          const daysDifference = Math.ceil(
            (parentDueDate.getTime() - parentIssueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          const newDueDate = new Date(nextDate);
          newDueDate.setDate(newDueDate.getDate() + daysDifference);
          newInvoiceData.dueDate = Timestamp.fromDate(newDueDate);
        }

        // Create the new invoice
        await addDoc(collection(db, 'invoices'), newInvoiceData);

        // Update parent invoice's nextInvoiceDate
        if (parentInvoice.recurringFrequency && parentInvoice.recurringInterval) {
          const nextInvoiceDate = getNextInvoiceDate(
            nextDate,
            parentInvoice.recurringFrequency,
            parentInvoice.recurringInterval
          );

          await updateDoc(doc(db, 'invoices', parentInvoice.id), {
            nextInvoiceDate: Timestamp.fromDate(nextInvoiceDate),
            updatedAt: serverTimestamp(),
          });
        }

        generated++;
      } catch (error: any) {
        const errorMsg = `Failed to generate invoice for ${parentInvoice.invoiceNumber}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      success: errors.length === 0,
      generated,
      errors,
    };
  } catch (error: any) {
    console.error('Error generating recurring invoices:', error);
    return {
      success: false,
      generated,
      errors: [...errors, error.message || 'Unknown error'],
    };
  }
}

