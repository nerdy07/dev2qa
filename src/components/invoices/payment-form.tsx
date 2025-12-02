'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { InvoicePayment } from '@/lib/types';
import React from 'react';
import { format } from 'date-fns';
import { calculatePaymentTotals, determineInvoiceStatus } from '@/lib/invoice-utils';

const formSchema = z.object({
  paymentDate: z.date(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

interface PaymentFormProps {
  invoiceId: string;
  currentTotal: number;
  currentPaid: number;
  currentPayments: InvoicePayment[];
  currentStatus: string;
  dueDate: Date | null;
  currency: string;
  onSuccess: () => void;
}

export function PaymentForm({
  invoiceId,
  currentTotal,
  currentPaid,
  currentPayments,
  currentStatus,
  dueDate,
  currency,
  onSuccess,
}: PaymentFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: 0,
      referenceNumber: '',
      notes: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { doc, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      const invoiceRef = doc(db, 'invoices', invoiceId);
      
      // Create new payment
      const newPayment: InvoicePayment = {
        id: `payment_${Date.now()}`,
        paymentDate: Timestamp.fromDate(values.paymentDate),
        amount: values.amount,
        referenceNumber: values.referenceNumber,
        notes: values.notes,
      };

      // Add to existing payments
      const updatedPayments = [...(currentPayments || []), newPayment];
      
      // Calculate new totals
      const paymentTotals = calculatePaymentTotals(updatedPayments);
      const newPaidAmount = paymentTotals.paidAmount;
      const newOutstandingAmount = currentTotal - newPaidAmount;
      
      // Determine new status
      const newStatus = determineInvoiceStatus(
        currentStatus,
        currentTotal,
        newPaidAmount,
        dueDate
      );

      // Build update object, only including paidAt if invoice is fully paid
      const updateData: any = {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      // Only set paidAt if invoice is fully paid
      if (newPaidAmount >= currentTotal) {
        updateData.paidAt = serverTimestamp();
      }

      // Update invoice
      await updateDoc(invoiceRef, updateData);

      toast({
        title: 'Payment recorded',
        description: `Payment of ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD',
        }).format(values.amount)} has been recorded successfully.`,
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    }
  }

  const outstandingAmount = currentTotal - currentPaid;
  const maxPayment = outstandingAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Date *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : new Date();
                      date.setHours(12, 0, 0, 0);
                      field.onChange(date);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxPayment}
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                {maxPayment > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Outstanding: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: currency || 'USD',
                    }).format(maxPayment)}
                  </p>
                )}
                {maxPayment <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    Invoice is fully paid
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="referenceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Number</FormLabel>
              <FormControl>
                <Input placeholder="Payment reference or transaction ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about this payment..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

