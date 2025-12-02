'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientForm } from '@/components/clients/client-form';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';

export default function NewClientPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(ALL_PERMISSIONS.CLIENTS.CREATE) || hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);

  const handleSuccess = () => {
    router.push('/dashboard/admin/clients');
  };

  if (!canCreate) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.CLIENTS.CREATE}>
        <div>You don't have permission to create clients.</div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Client" description="Add a new client to your database">
        <BackButton href="/dashboard/admin/clients" />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Enter the client's contact details and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}

