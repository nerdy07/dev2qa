/**
 * Utility functions for invoice reminders
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Invoice } from '@/lib/types';
import { sendInvoiceEmail } from '@/app/requests/actions';

/**
 * Send reminders for overdue invoices
 * This should be called by a cron job daily
 */
export async function sendOverdueInvoiceReminders(): Promise<{
  success: boolean;
  sent: number;
  errors: string[];
}> {
  if (!db) {
    return { success: false, sent: 0, errors: ['Database not initialized'] };
  }

  const errors: string[] = [];
  let sent = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Find all invoices that are overdue and haven't been fully paid
    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('status', 'in', ['sent', 'partially_paid'])
    );

    const snapshot = await getDocs(q);
    const overdueInvoices: Invoice[] = [];
    
    snapshot.forEach((docSnap) => {
      const invoice = { id: docSnap.id, ...docSnap.data() } as Invoice;
      const dueDate = invoice.dueDate?.toDate?.();
      
      // Check if invoice is overdue (due date is in the past and not fully paid)
      if (dueDate && dueDate < today && invoice.outstandingAmount > 0) {
        // Check if reminder was sent recently (within last 7 days)
        const lastReminder = invoice.lastReminderSentAt?.toDate?.();
        const daysSinceReminder = lastReminder
          ? Math.floor((today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        
        // Send reminder if never sent or last sent more than 7 days ago
        if (!lastReminder || daysSinceReminder >= 7) {
          overdueInvoices.push(invoice);
        }
      }
    });

    // Send reminder emails for each overdue invoice
    for (const invoice of overdueInvoices) {
      try {
        // Get client email (we need to fetch client data)
        const clientRef = doc(db, 'clients', invoice.clientId);
        const clientSnap = await (await import('firebase/firestore')).getDoc(clientRef);
        
        if (!clientSnap.exists()) {
          errors.push(`Client not found for invoice ${invoice.invoiceNumber}`);
          continue;
        }

        const client = clientSnap.data();
        const clientEmail = client.email;
        
        if (!clientEmail) {
          errors.push(`No email address for client of invoice ${invoice.invoiceNumber}`);
          continue;
        }

        // Send reminder email
        const { getAbsoluteUrl } = await import('@/lib/email-template');
        const invoiceUrl = getAbsoluteUrl(`/dashboard/admin/invoices/${invoice.id}`);
        const dueDate = invoice.dueDate?.toDate?.() || new Date();

        const emailResult = await sendInvoiceReminderEmail({
          recipientEmail: clientEmail,
          clientName: invoice.clientName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice.id,
          totalAmount: invoice.totalAmount,
          outstandingAmount: invoice.outstandingAmount,
          currency: invoice.currency,
          dueDate: dueDate.toISOString(),
          invoiceUrl,
        });

        if (emailResult.success) {
          // Update invoice with reminder timestamp
          const invoiceRef = doc(db, 'invoices', invoice.id);
          await updateDoc(invoiceRef, {
            lastReminderSentAt: serverTimestamp(),
            status: 'overdue', // Update status to overdue if not already
            updatedAt: serverTimestamp(),
          });

          sent++;
        } else {
          errors.push(`Failed to send reminder for invoice ${invoice.invoiceNumber}: ${emailResult.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        const errorMsg = `Error sending reminder for invoice ${invoice.invoiceNumber}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      success: errors.length === 0,
      sent,
      errors,
    };
  } catch (error: any) {
    console.error('Error sending invoice reminders:', error);
    return {
      success: false,
      sent,
      errors: [...errors, error.message || 'Unknown error'],
    };
  }
}

/**
 * Send reminder email for overdue invoice
 */
async function sendInvoiceReminderEmail(data: {
  recipientEmail: string;
  clientName: string;
  invoiceNumber: string;
  invoiceId: string;
  totalAmount: number;
  outstandingAmount: number;
  currency: string;
  dueDate: string;
  invoiceUrl: string;
}) {
  try {
    const { getAbsoluteUrl, wrapEmailContent, emailButton } = await import('@/lib/email-template');
    const { format } = await import('date-fns');
    const pdfUrl = getAbsoluteUrl(`/api/invoices/${data.invoiceId}/pdf`);
    
    const content = `
      <h1 style="color: #dc2626; margin-top: 0; font-size: 24px;">Payment Reminder: Invoice ${data.invoiceNumber}</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hello ${data.clientName},
      </p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        This is a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> is now overdue.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0; color: #dc2626;"><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
        <p style="margin: 5px 0; color: #dc2626;"><strong>Total Amount:</strong> ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: data.currency,
        }).format(data.totalAmount)}</p>
        <p style="margin: 5px 0; color: #dc2626;"><strong>Outstanding Amount:</strong> ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: data.currency,
        }).format(data.outstandingAmount)}</p>
        <p style="margin: 5px 0; color: #dc2626;"><strong>Due Date:</strong> ${format(new Date(data.dueDate), 'PPP')}</p>
      </div>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Please arrange payment at your earliest convenience. If you have already made payment, please disregard this reminder.
      </p>
      <div style="margin: 20px 0;">
        ${emailButton(data.invoiceUrl, 'View Invoice Online')}
      </div>
      <p style="font-size: 14px; margin-top: 20px; color: #6b7280;">
        <a href="${pdfUrl}" style="color: #2563eb; text-decoration: none;">Download PDF Invoice</a>
      </p>
      <p style="font-size: 14px; margin-top: 20px; color: #6b7280;">
        If you have any questions about this invoice, please don't hesitate to contact us.
      </p>
    `;
    
    await (await import('@/lib/email')).sendEmail({
      to: data.recipientEmail,
      subject: `Payment Reminder: Invoice ${data.invoiceNumber} - Overdue`,
      html: wrapEmailContent(content, 'Payment Reminder')
    });
    return { success: true };
  } catch (error: any) {
    console.warn(`Invoice reminder email failed to send to ${data.recipientEmail}.`, error);
    return { success: false, error: 'Failed to send invoice reminder email.' };
  }
}

