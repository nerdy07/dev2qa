'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDocument, useCollection } from '@/hooks/use-collection';
import type { Invoice, Client, Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, Edit, Receipt, Calendar, DollarSign, Building2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/invoice-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { PaymentForm } from '@/components/invoices/payment-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreditCard, Plus, Download, Send } from 'lucide-react';
import { sendInvoiceEmail } from '@/app/requests/actions';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const statusColors: Record<Invoice['status'], string> = {
  draft: 'secondary',
  sent: 'default',
  partially_paid: 'default',
  paid: 'default',
  overdue: 'destructive',
  cancelled: 'secondary',
  refunded: 'secondary',
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const invoiceId = params.id as string;
  
  const { data: invoice, loading, error } = useDocument<Invoice>('invoices', invoiceId);
  const { data: clients } = useCollection<Client>('clients');
  const { data: projects } = useCollection<Project>('projects');
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const canUpdate = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);
  const canRead = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);

  const handleSuccess = () => {
    setIsEditing(false);
    router.refresh();
  };

  const handleSendInvoice = async () => {
    if (!invoice || !client || !db) return;

    setIsSending(true);
    try {
      const { getAbsoluteUrl } = await import('@/lib/email-template');
      const invoiceUrl = getAbsoluteUrl(`/invoices/${invoice.id}`);
      const dueDate = invoice.dueDate?.toDate?.() || new Date();

      const emailResult = await sendInvoiceEmail({
        recipientEmail: client.email,
        clientName: invoice.clientName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        dueDate: dueDate.toISOString(),
        invoiceUrl,
      });

      if (emailResult.success) {
        // Update invoice status and sentAt
        const invoiceRef = doc(db, 'invoices', invoice.id);
        await updateDoc(invoiceRef, {
          status: invoice.status === 'draft' ? 'sent' : invoice.status,
          sentAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Invoice sent',
          description: `Invoice ${invoice.invoiceNumber} has been sent to ${client.email}`,
        });
        router.refresh();
      } else {
        throw new Error(emailResult.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!canRead) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.INVOICES.MANAGE}>
        <div>You don't have permission to view invoices.</div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice Details" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice Details" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || 'Invoice not found.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const client = clients?.find(c => c.id === invoice.clientId);
  const project = invoice.projectId ? projects?.find(p => p.id === invoice.projectId) : null;
  const issueDate = invoice.issueDate?.toDate?.();
  const dueDate = invoice.dueDate?.toDate?.();
  const canEdit = canUpdate && invoice.status === 'draft';

  if (isEditing) {
    router.push(`/dashboard/admin/invoices/${invoice.id}/edit`);
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Invoice ${invoice.invoiceNumber}`}
        description={client?.companyName || client?.name || 'Invoice Details'}
      >
        <div className="flex gap-2">
          <BackButton href="/dashboard/admin/invoices" />
          {canUpdate && (
            <>
              {invoice.status !== 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
              {client && invoice.status !== 'cancelled' && invoice.status !== 'refunded' && (
                <Button
                  variant="default"
                  onClick={handleSendInvoice}
                  disabled={isSending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? 'Sending...' : 'Send Invoice'}
                </Button>
              )}
            </>
          )}
          {canEdit && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                <p className="text-base font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={statusColors[invoice.status] as any}>
                  {invoice.status.replace('_', ' ')}
                </Badge>
              </div>
              {issueDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Issue Date
                  </p>
                  <p className="text-base">{format(issueDate, 'PPP')}</p>
                </div>
              )}
              {dueDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </p>
                  <p className="text-base">{format(dueDate, 'PPP')}</p>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Client</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <div>
                  <p className="font-medium">{invoice.clientName}</p>
                  {client && (
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  )}
                </div>
              </div>
            </div>

            {project && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Project</p>
                <Link href={`/dashboard/admin/projects/${project.id}`} className="text-primary hover:underline">
                  {invoice.projectName}
                </Link>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-4">Line Items</p>
              <div className="rounded-md border">
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
                    {invoice.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice, invoice.currency)}</TableCell>
                        <TableCell className="text-right">
                          {item.taxRate ? `${item.taxRate}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discount ? formatCurrency(item.discount, invoice.currency) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </>
            )}

            {invoice.terms && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Payment Terms</p>
                  <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
              <p className="text-lg font-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</p>
            </div>
            {invoice.discountAmount > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Discount</p>
                <p className="text-lg font-semibold text-green-600">
                  -{formatCurrency(invoice.discountAmount, invoice.currency)}
                </p>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax</p>
                <p className="text-lg font-semibold">{formatCurrency(invoice.taxAmount, invoice.currency)}</p>
              </div>
            )}
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(invoice.totalAmount, invoice.currency)}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(invoice.paidAmount, invoice.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(invoice.outstandingAmount, invoice.currency)}
              </p>
            </div>
            {invoice.isRecurring && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recurring</p>
                  <p className="text-sm">
                    {invoice.recurringFrequency?.replace('_', ' ')} 
                    {invoice.recurringInterval && invoice.recurringInterval > 1 && ` (every ${invoice.recurringInterval})`}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Tracking Section */}
      {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments
                        .sort((a, b) => {
                          const dateA = a.paymentDate?.toDate?.() || new Date(0);
                          const dateB = b.paymentDate?.toDate?.() || new Date(0);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((payment) => {
                          const paymentDate = payment.paymentDate?.toDate?.();
                          return (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {paymentDate ? format(paymentDate, 'MMM d, yyyy') : '-'}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(payment.amount, invoice.currency)}
                              </TableCell>
                              <TableCell>{payment.referenceNumber || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {payment.notes || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payments recorded yet.
                </p>
              )}
            </CardContent>
          </Card>

          {canUpdate && invoice.outstandingAmount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Record Payment
                </CardTitle>
                <CardDescription>
                  Add a new payment to this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentForm
                  invoiceId={invoice.id}
                  currentTotal={invoice.totalAmount}
                  currentPaid={invoice.paidAmount}
                  currentPayments={invoice.payments || []}
                  currentStatus={invoice.status}
                  dueDate={dueDate}
                  currency={invoice.currency}
                  onSuccess={handleSuccess}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

