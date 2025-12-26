'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { useCollection } from '@/hooks/use-collection';
import { CertificateRequest } from '@/lib/types';
import { query, collection, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function RequestsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get status from URL query params, default to 'all'
  const statusFromUrl = searchParams?.get('status') || 'all';
  
  // Check permissions
  const canViewAllRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL);
  const canViewOwnRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.READ_OWN);

  // State for filters - initialize from URL
  const [statusFilter, setStatusFilter] = React.useState<string>(statusFromUrl);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Update status filter when URL changes (e.g., browser back/forward)
  React.useEffect(() => {
    const urlStatus = searchParams?.get('status') || 'all';
    setStatusFilter(urlStatus);
  }, [searchParams]);

  // Handler to update both state and URL when filter changes
  const handleStatusFilterChange = React.useCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value === 'all') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    const newUrl = params.toString() ? `/dashboard/requests?${params.toString()}` : '/dashboard/requests';
    router.replace(newUrl, { scroll: false });
    // State will be updated by the useEffect above when URL changes
  }, [router, searchParams]);

  // Query requests based on permissions
  const requestsQuery = React.useMemo(() => {
    if (!db) return null;
    
    if (canViewAllRequests) {
      // Users with READ_ALL permission see all requests
      if (statusFilter !== 'all') {
        return query(
          collection(db, 'requests'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }
      return query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    } else if (canViewOwnRequests && user?.id) {
      // Users with only READ_OWN permission see only their requests
      // Note: We fetch all user requests and filter by status client-side
      // to avoid requiring a composite index for requesterId + status + orderBy
      return query(
        collection(db, 'requests'),
        where('requesterId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
    }
    
    return null;
  }, [canViewAllRequests, canViewOwnRequests, user?.id, statusFilter]);

  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
  } = useCollection<CertificateRequest>('requests', requestsQuery);

  // Filter requests by status and search term
  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];
    
    let filtered = requests;
    
    // Apply status filter (client-side for READ_OWN users when filtering by status)
    // For READ_ALL users, status filtering is already done server-side in the query
    if (statusFilter !== 'all' && !canViewAllRequests) {
      // For READ_OWN users, filter by status client-side since we fetch all user requests
      filtered = filtered.filter(request => request.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.taskTitle?.toLowerCase().includes(searchLower) ||
        request.requesterName?.toLowerCase().includes(searchLower) ||
        request.associatedProject?.toLowerCase().includes(searchLower) ||
        request.id?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [requests, statusFilter, searchTerm, canViewAllRequests]);

  const loading = requestsLoading;

  // Check if user has any permission to view requests
  if (!canViewAllRequests && !canViewOwnRequests) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Requests"
          description="View and manage certificate requests"
        />
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view requests. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={canViewAllRequests ? "All Requests" : "My Requests"}
        description={
          canViewAllRequests
            ? "View and manage all certificate requests"
            : "View your certificate requests"
        }
      />

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Request Management</CardTitle>
          <CardDescription>
            Filter and search through {canViewAllRequests ? 'all' : 'your'} certificate requests. {filteredRequests.length} request(s) found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by task title, requester, project, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestsError && (
            <Alert variant="destructive" className="mb-6">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load requests. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <CertificateRequestsTable 
              requests={filteredRequests} 
              isLoading={loading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

