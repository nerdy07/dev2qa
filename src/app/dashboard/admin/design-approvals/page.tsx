
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/hooks/use-collection';
import type { DesignRequest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function DesignApprovalsPage() {
  const { data: designRequests, loading, error } = useCollection<DesignRequest>('designRequests');
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/designs/${id}`);
  };

  const statusVariant = (status: DesignRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5}>
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Design Requests</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {designRequests?.map((request) => (
          <TableRow key={request.id} onClick={() => handleRowClick(request.id)} className="cursor-pointer">
            <TableCell className="font-medium">{request.designTitle}</TableCell>
            <TableCell>{request.designerName}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(request.status)} className="capitalize">{request.status}</Badge>
            </TableCell>
            <TableCell>{request.createdAt ? format(request.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRowClick(request.id)}>
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
        {designRequests?.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">No design requests found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    );
  };

  return (
    <>
      <PageHeader
        title="Design Approvals"
        description="Review and approve or reject designs submitted by the product team."
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Design Title</TableHead>
              <TableHead>Designer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {renderContent()}
        </Table>
      </Card>
    </>
  );
}
