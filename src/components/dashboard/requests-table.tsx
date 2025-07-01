'use client';

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
import { useRouter } from 'next/navigation';
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

export function CertificateRequestsTable({ requests, isLoading = false }: CertificateRequestsTableProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/requests/${id}`);
  };

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
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  )

  const renderData = () => (
    <TableBody>
        {requests.length > 0 ? (
          requests.map((request) => (
            <TableRow key={request.id} onClick={() => handleRowClick(request.id)} className="cursor-pointer">
              <TableCell className="font-medium">{request.taskTitle}</TableCell>
              <TableCell className="hidden md:table-cell">{request.associatedProject}</TableCell>
              <TableCell className="hidden lg:table-cell">{request.requesterName}</TableCell>
              <TableCell className="hidden sm:table-cell">{format((request.createdAt as any)?.toDate() || new Date(), 'PP')}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(request.status)} className="capitalize">
                  {request.status}
                </Badge>
              </TableCell>
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
                        {user?.role === 'requester' && request.status === 'approved' && request.certificateId && (
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/certificates/${request.certificateId}`)}>
                                View Certificate
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
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
              <TableHead className="hidden lg:table-cell">Requester</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? renderLoading() : renderData()}
        </Table>
    </div>
  );
}
