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
import { getStatusVariant, getStatusLabel } from '@/lib/request-workflow';

interface CertificateRequestsTableProps {
  requests: CertificateRequest[];
  isLoading?: boolean;
}

export const CertificateRequestsTable = React.memo(function CertificateRequestsTable({ requests, isLoading = false }: CertificateRequestsTableProps) {
  const { hasRole } = useAuth();

  const statusVariant = (status: CertificateRequest['status']) => {
    return getStatusVariant(status);
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
            <TableCell className="font-medium" style={{ maxWidth: '220px', width: '220px' }}>
              <Link
                href={`/dashboard/requests/${request.id}`}
                className="block rounded-md px-2 py-1.5 text-sm font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Open request ${request.taskTitle}`}
                title={request.taskTitle}
              >
                <p 
                  className="m-0 overflow-hidden text-ellipsis whitespace-nowrap block" 
                  style={{
                    maxWidth: '100%',
                  }}
                >
                  {request.taskTitle}
                </p>
              </Link>
            </TableCell>
            <TableCell className="hidden md:table-cell max-w-[120px]">
              <span className="truncate block" title={request.associatedProject || '—'}>
                {request.associatedProject || '—'}
              </span>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Badge variant={request.certificateRequired !== false ? 'outline' : 'secondary'} className="text-xs font-medium whitespace-nowrap">
                {request.certificateRequired !== false ? 'Certificate' : 'QA Sign-off'}
              </Badge>
            </TableCell>
            <TableCell className="hidden xl:table-cell max-w-[150px]">
              <span className="truncate block" title={request.requesterName}>
                {request.requesterName}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {format((request.createdAt as any)?.toDate() || new Date(), 'PP')}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(request.status)} className="capitalize">
                {getStatusLabel(request.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
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
    <div className="rounded-lg border shadow-sm overflow-x-auto w-full">
      <div className="min-w-[800px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]" style={{ maxWidth: '220px', width: '220px' }}>Task Title</TableHead>
              <TableHead className="hidden md:table-cell min-w-[120px]">Project</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[100px]">Review Type</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[150px]">Requester</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[100px]">Date</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="text-right min-w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? renderLoading() : renderData()}
        </Table>
      </div>
    </div>
  );
});
