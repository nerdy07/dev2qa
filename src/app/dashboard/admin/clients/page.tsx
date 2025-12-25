'use client';

import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Search, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { Client } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';
import { ProtectedRoute } from '@/components/common/protected-route';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ClientsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { data: clients, loading, error } = useCollection<Client>('clients');
  const [searchTerm, setSearchTerm] = useState('');

  const canCreate = hasPermission(ALL_PERMISSIONS.CLIENTS.CREATE) || hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);
  const canRead = hasPermission(ALL_PERMISSIONS.CLIENTS.READ) || hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.email.toLowerCase().includes(term) ||
      client.companyName?.toLowerCase().includes(term) ||
      client.defaultCurrency.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  if (!canRead) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.CLIENTS.READ}>
        <div>You don't have permission to view clients.</div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client database and contact information"
      >
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/admin/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email, company, or currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading clients: {error.message}
            </div>
          )}

          {!loading && !error && (
            <>
              {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No clients found matching your search.' : 'No clients yet. Create your first client to get started.'}
                  </p>
                  {canCreate && !searchTerm && (
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/admin/clients/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Client
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.companyName || '-'}</TableCell>
                          <TableCell>{client.defaultCurrency}</TableCell>
                          <TableCell>
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                              {client.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/admin/clients/${client.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

