'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';
import { useCollection, useDocument } from '@/hooks/use-collection';
import type { Client, Project, CompanySettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/providers/auth-provider';

export default function NewInvoicePage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canCreate = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);
  
  const { data: clients, loading: clientsLoading } = useCollection<Client>('clients');
  const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
  const { data: companySettings, loading: settingsLoading } = useDocument<CompanySettings>('companySettings', 'company');

  const handleSuccess = () => {
    router.push('/dashboard/admin/invoices');
  };

  if (!canCreate) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.INVOICES.MANAGE}>
        <div>You don't have permission to create invoices.</div>
      </ProtectedRoute>
    );
  }

  if (clientsLoading || projectsLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Invoice" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" description="Create a new invoice for a client">
        <BackButton href="/dashboard/admin/invoices" />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>
            Fill in the invoice information and line items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceForm
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

