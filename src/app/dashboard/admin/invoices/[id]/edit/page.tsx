'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';
import { useDocument, useCollection } from '@/hooks/use-collection';
import type { Invoice, Client, Project, CompanySettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const invoiceId = params.id as string;
  const canEdit = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);
  
  const { data: invoice, loading: invoiceLoading } = useDocument<Invoice>('invoices', invoiceId);
  const { data: clients, loading: clientsLoading } = useCollection<Client>('clients');
  const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
  const { data: companySettings, loading: settingsLoading } = useDocument<CompanySettings>('companySettings', 'company');

  const handleSuccess = () => {
    router.push(`/dashboard/admin/invoices/${invoiceId}`);
  };

  if (!canEdit) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.INVOICES.MANAGE}>
        <div>You don't have permission to edit invoices.</div>
      </ProtectedRoute>
    );
  }

  if (invoiceLoading || clientsLoading || projectsLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Invoice" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Invoice" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Invoice not found</AlertTitle>
          <AlertDescription>
            The invoice you're trying to edit does not exist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (invoice.status !== 'draft') {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Invoice" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Cannot edit invoice</AlertTitle>
          <AlertDescription>
            Only draft invoices can be edited. This invoice has status: {invoice.status}.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit Invoice ${invoice.invoiceNumber}`} description="Update invoice details">
        <BackButton href={`/dashboard/admin/invoices/${invoiceId}`} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Update the invoice information and line items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceForm
            invoice={invoice}
            clients={clients || []}
            projects={projects || []}
            companySettings={companySettings}
            userId={user?.id}
            userName={user?.name}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
}

