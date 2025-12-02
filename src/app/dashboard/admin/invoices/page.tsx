'use client';

import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Search, Receipt } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { Invoice } from '@/lib/types';
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
import { formatCurrency } from '@/lib/invoice-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusColors: Record<Invoice['status'], string> = {
  draft: 'secondary',
  sent: 'default',
  partially_paid: 'default',
  paid: 'default',
  overdue: 'destructive',
  cancelled: 'secondary',
  refunded: 'secondary',
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { data: invoices, loading, error } = useCollection<Invoice>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const canCreate = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);
  const canRead = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let filtered = invoices;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.clientName.toLowerCase().includes(term) ||
        invoice.projectName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [invoices, searchTerm, statusFilter]);

  if (!canRead) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.INVOICES.MANAGE}>
        <div>You don't have permission to view invoices.</div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage and track all invoices"
      >
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/admin/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, client, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
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
              Error loading invoices: {error.message}
            </div>
          )}

          {!loading && !error && (
            <>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' ? 'No invoices found matching your filters.' : 'No invoices yet. Create your first invoice to get started.'}
                  </p>
                  {canCreate && !searchTerm && statusFilter === 'all' && (
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/admin/invoices/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Invoice
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => {
                        const dueDate = invoice.dueDate?.toDate?.();
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{invoice.clientName}</TableCell>
                            <TableCell>{invoice.projectName || '-'}</TableCell>
                            <TableCell>{formatCurrency(invoice.totalAmount, invoice.currency)}</TableCell>
                            <TableCell>
                              <Badge variant={statusColors[invoice.status] as any}>
                                {invoice.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {dueDate ? format(dueDate, 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dashboard/admin/invoices/${invoice.id}`}>
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

