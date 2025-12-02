/**
 * Utility functions for invoice management
 * Invoice number format: INV-YYYY-### (e.g., INV-2025-001)
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

/**
 * Generates a unique invoice number for the given year
 * Format: INV-YYYY-### (e.g., INV-2025-001)
 * Uses Firestore transactions to ensure uniqueness
 */
export async function generateInvoiceNumber(year?: number): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const targetYear = year || new Date().getFullYear();
  const counterDocRef = doc(db, 'invoiceCounters', targetYear.toString());

  try {
    const invoiceNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);
      
      let currentCount = 1;
      
      if (counterDoc.exists()) {
        const data = counterDoc.data();
        currentCount = (data.count || 0) + 1;
      }
      
      // Update the counter
      transaction.set(counterDocRef, {
        count: currentCount,
        year: targetYear,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
      
      // Format: INV-YYYY-###
      const paddedNumber = currentCount.toString().padStart(3, '0');
      return `INV-${targetYear}-${paddedNumber}`;
    });
    
    return invoiceNumber;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback to timestamp-based number if transaction fails
    const timestamp = Date.now();
    const fallbackNumber = timestamp.toString().slice(-6).padStart(6, '0');
    return `INV-${targetYear}-${fallbackNumber}`;
  }
}

/**
 * Calculates invoice totals from line items
 */
export function calculateInvoiceTotals(lineItems: Array<{
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}>) {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  lineItems.forEach((item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount || 0;
    const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount;
    const itemTax = item.taxRate ? (itemSubtotalAfterDiscount * item.taxRate) / 100 : 0;
    
    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    totalTax += itemTax;
  });

  const totalAmount = subtotal - totalDiscount + totalTax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(totalDiscount * 100) / 100,
    taxAmount: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Calculates payment totals from payments array
 */
export function calculatePaymentTotals(payments: Array<{ amount: number }> = []) {
  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    paidAmount: Math.round(paidAmount * 100) / 100,
  };
}

/**
 * Determines invoice status based on payment and due date
 */
export function determineInvoiceStatus(
  currentStatus: string,
  totalAmount: number,
  paidAmount: number,
  dueDate: Date | null
): 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded' {
  // Don't change status if cancelled or refunded
  if (currentStatus === 'cancelled' || currentStatus === 'refunded') {
    return currentStatus as 'cancelled' | 'refunded';
  }

  // If draft, keep as draft
  if (currentStatus === 'draft') {
    return 'draft';
  }

  const outstandingAmount = totalAmount - paidAmount;
  const isOverdue = dueDate && new Date() > dueDate;

  if (paidAmount >= totalAmount) {
    return 'paid';
  } else if (paidAmount > 0) {
    return 'partially_paid';
  } else if (isOverdue && currentStatus !== 'draft') {
    return 'overdue';
  } else if (currentStatus === 'sent' || currentStatus === 'overdue') {
    return currentStatus as 'sent' | 'overdue';
  }

  return 'sent';
}

/**
 * Formats currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Gets the next invoice date for recurring invoices
 */
export function getNextInvoiceDate(
  currentDate: Date,
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'custom',
  interval: number = 1
): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + (14 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + (3 * interval));
      break;
    case 'semi-annually':
      nextDate.setMonth(nextDate.getMonth() + (6 * interval));
      break;
    case 'annually':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    case 'custom':
      // For custom, interval is in days
      nextDate.setDate(nextDate.getDate() + interval);
      break;
  }

  return nextDate;
}

