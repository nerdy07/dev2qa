'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Invoice, Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/invoice-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PublicInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        setLoading(true);
        const response = await fetch(`/api/invoices/${invoiceId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(new Error('Invoice not found'));
          } else if (response.status === 503) {
            setError(new Error('Invoice service is temporarily unavailable. Please contact support or try again later.'));
          } else {
            try {
              const errorData = await response.json();
              setError(new Error(errorData.error || 'Failed to fetch invoice'));
            } catch {
              setError(new Error('Failed to fetch invoice. Please try again later.'));
            }
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        
        // Convert ISO strings back to Date objects for display
        const invoiceData: Invoice = {
          ...data.invoice,
          issueDate: data.invoice.issueDate ? new Date(data.invoice.issueDate) : null,
          dueDate: data.invoice.dueDate ? new Date(data.invoice.dueDate) : null,
          sentAt: data.invoice.sentAt ? new Date(data.invoice.sentAt) : null,
          paidAt: data.invoice.paidAt ? new Date(data.invoice.paidAt) : null,
          createdAt: data.invoice.createdAt ? new Date(data.invoice.createdAt) : null,
          updatedAt: data.invoice.updatedAt ? new Date(data.invoice.updatedAt) : null,
          payments: data.invoice.payments?.map((p: any) => ({
            ...p,
            paymentDate: p.paymentDate ? new Date(p.paymentDate) : null,
          })) || [],
        };
        
        setInvoice(invoiceData);
        setClient(data.client ? {
          ...data.client,
          createdAt: data.client.createdAt ? new Date(data.client.createdAt) : null,
          updatedAt: data.client.updatedAt ? new Date(data.client.updatedAt) : null,
        } : null);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching invoice:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch invoice'));
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Invoice Not Found</AlertTitle>
            <AlertDescription>
              {error?.message || 'The invoice you are looking for does not exist or has been removed.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const issueDate = invoice.issueDate instanceof Date ? invoice.issueDate : new Date();
  const dueDate = invoice.dueDate instanceof Date ? invoice.dueDate : new Date();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Issue Date: {format(issueDate, 'PPP')} • Due Date: {format(dueDate, 'PPP')}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Information */}
            {client && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Bill To:</h3>
                <p className="font-medium">{client.name}</p>
                {client.companyName && <p className="text-sm text-muted-foreground">{client.companyName}</p>}
                {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                {client.address && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {client.address.street && <p>{client.address.street}</p>}
                    {(client.address.city || client.address.state || client.address.postalCode) && (
                      <p>
                        {[client.address.city, client.address.state, client.address.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {client.address.country && <p>{client.address.country}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Line Items */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.taxRate ? `${item.taxRate}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discount ? formatCurrency(item.discount, invoice.currency) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                </div>
                {invoice.paidAmount > 0 && (
                  <>
                    <div className="flex justify-between text-sm pt-2">
                      <span>Paid:</span>
                      <span>{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Outstanding:</span>
                      <span>{formatCurrency(invoice.outstandingAmount, invoice.currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Terms */}
            {invoice.terms && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Payment Terms</h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


