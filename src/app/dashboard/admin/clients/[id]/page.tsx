'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientForm } from '@/components/clients/client-form';
import { useDocument } from '@/hooks/use-collection';
import type { Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, Edit, Building2, Mail, Phone, MapPin, DollarSign } from 'lucide-react';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const clientId = params.id as string;
  
  const { data: client, loading, error } = useDocument<Client>('clients', clientId);
  const [isEditing, setIsEditing] = React.useState(false);

  const canUpdate = hasPermission(ALL_PERMISSIONS.CLIENTS.UPDATE) || hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);
  const canRead = hasPermission(ALL_PERMISSIONS.CLIENTS.READ) || hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);

  const handleSuccess = () => {
    setIsEditing(false);
    router.refresh();
  };

  if (!canRead) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.CLIENTS.READ}>
        <div>You don't have permission to view clients.</div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Client Details" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <PageHeader title="Client Details" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || 'Client not found.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Client" description={`Editing ${client.name}`}>
          <BackButton href="/dashboard/admin/clients" />
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Update the client's contact details and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm client={client} onSuccess={handleSuccess} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const address = client.address;
  const hasAddress = address && (address.street || address.city || address.state || address.country || address.postalCode);

  return (
    <div className="space-y-6">
      <PageHeader title={client.name} description={client.companyName || 'Client Details'}>
        <div className="flex gap-2">
          <BackButton href="/dashboard/admin/clients" />
          {canUpdate && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-base">{client.name}</p>
            </div>
            {client.companyName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-base">{client.companyName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </p>
              <p className="text-base">{client.email}</p>
            </div>
            {client.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </p>
                <p className="text-base">{client.phone}</p>
              </div>
            )}
            {client.contactPerson && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                <p className="text-base">{client.contactPerson}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Default Currency</p>
              <p className="text-base font-semibold">{client.defaultCurrency}</p>
            </div>
            {client.taxId && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax ID / VAT</p>
                <p className="text-base">{client.taxId}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                {client.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {hasAddress && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {address.street && <p>{address.street}</p>}
                <p>
                  {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
                </p>
                {address.country && <p>{address.country}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {client.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {client.createdAt && (
              <p>Created: {format(client.createdAt.toDate(), 'PPP')}</p>
            )}
            {client.updatedAt && (
              <p>Last updated: {format(client.updatedAt.toDate(), 'PPP')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

