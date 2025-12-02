'use client';

import React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CertificateRequest } from '@/lib/types';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '../ui/skeleton';

interface CertificateRequestsTableProps {
  requests: CertificateRequest[];
  isLoading?: boolean;
}

export const CertificateRequestsTable = React.memo(function CertificateRequestsTable({ requests, isLoading = false }: CertificateRequestsTableProps) {
  const { hasRole } = useAuth();

  const statusVariant = (status: CertificateRequest['status']) => {
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

  const renderLoading = () => (
    <TableBody>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  const renderData = () => (
    <TableBody>
      {requests.length > 0 ? (
        requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">
              <Link
                href={`/dashboard/requests/${request.id}`}
                className="block rounded-md px-2 py-1.5 text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Open request ${request.taskTitle}`}
              >
                {request.taskTitle}
              </Link>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {request.associatedProject || '—'}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Badge variant={request.certificateRequired !== false ? 'outline' : 'secondary'} className="text-xs font-medium">
                {request.certificateRequired !== false ? 'Certificate' : 'QA Sign-off'}
              </Badge>
            </TableCell>
            <TableCell className="hidden xl:table-cell">{request.requesterName}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {format((request.createdAt as any)?.toDate() || new Date(), 'PP')}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(request.status)} className="capitalize">
                {request.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/requests/${request.id}`} aria-label={`View details for ${request.taskTitle}`}>
                    Open
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`More actions for ${request.taskTitle}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/requests/${request.id}`}>
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    {hasRole('requester') && request.status === 'approved' && request.certificateId && (
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/certificates/${request.certificateId}`}>
                          View Certificate
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
            No requests found.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task Title</TableHead>
            <TableHead className="hidden md:table-cell">Project</TableHead>
            <TableHead className="hidden lg:table-cell">Review Type</TableHead>
            <TableHead className="hidden xl:table-cell">Requester</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        {isLoading ? renderLoading() : renderData()}
      </Table>
    </div>
  );
});
