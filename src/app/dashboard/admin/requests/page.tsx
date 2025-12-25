'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { useCollection } from '@/hooks/use-collection';
import { CertificateRequest } from '@/lib/types';
import { query, collection, orderBy, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { ProtectedRoute } from '@/components/common/protected-route';
import { Skeleton } from '@/components/ui/skeleton';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationWrapper } from '@/components/common/pagination-wrapper';

export default function AllRequestsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Check permissions
  const canViewAllRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL);
  const canApproveRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE);

  // State for filters
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  // Query for all requests
  const allRequestsQuery = React.useMemo(() => {
    if (!db || !canViewAllRequests) return null;
    let baseQuery = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    
    if (statusFilter !== 'all') {
      baseQuery = query(collection(db, 'requests'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }
    
    return baseQuery;
  }, [statusFilter, canViewAllRequests]);

  const { data: allRequests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>(
    'requests',
    allRequestsQuery
  );

  // Stats calculation
  const [stats, setStats] = React.useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      if (!db) return;
      try {
        const requestsCollection = collection(db, 'requests');
        const [totalSnapshot, pendingSnapshot, approvedSnapshot, rejectedSnapshot] = await Promise.all([
          getCountFromServer(requestsCollection),
          getCountFromServer(query(requestsCollection, where('status', '==', 'pending'))),
          getCountFromServer(query(requestsCollection, where('status', '==', 'approved'))),
          getCountFromServer(query(requestsCollection, where('status', '==', 'rejected'))),
        ]);

        setStats({
          total: totalSnapshot.data().count,
          pending: pendingSnapshot.data().count,
          approved: approvedSnapshot.data().count,
          rejected: rejectedSnapshot.data().count,
        });
      } catch (err) {
        console.error('Failed to fetch request stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    if (canViewAllRequests || canApproveRequests) {
      fetchStats();
    } else {
      setStatsLoading(false);
    }
  }, [canViewAllRequests, canApproveRequests]);

  // Filter requests by search term and status
  const filteredRequestsByTab = React.useMemo(() => {
    if (!allRequests) return { all: [], pending: [], approved: [], rejected: [] };
    
    let filtered = allRequests;
    
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
    
    return {
      all: filtered,
      pending: filtered.filter(r => r.status === 'pending'),
      approved: filtered.filter(r => r.status === 'approved'),
      rejected: filtered.filter(r => r.status === 'rejected'),
    };
  }, [allRequests, searchTerm]);

  const [activeTab, setActiveTab] = React.useState('all');

  // Get current tab's data
  const currentTabData = React.useMemo(() => {
    return filteredRequestsByTab[activeTab as keyof typeof filteredRequestsByTab] || [];
  }, [filteredRequestsByTab, activeTab]);

  // Pagination for current tab
  const {
    currentPage,
    totalPages,
    currentData,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
  } = usePagination({
    data: currentTabData,
    itemsPerPage: 20,
    initialPage: 1,
  });

  // Reset to page 1 when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, setCurrentPage]);

  const loading = requestsLoading || statsLoading;

  if (!canViewAllRequests && !canApproveRequests) {
    return (
      <ProtectedRoute permission={ALL_PERMISSIONS.REQUESTS.READ_ALL}>
        <div></div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute permission={ALL_PERMISSIONS.REQUESTS.READ_ALL}>
      <div className="flex-1 space-y-4">
        <PageHeader
          title="All Requests"
          description="View and manage all certificate requests in the system"
        />

        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Requests"
                value={stats.total.toString()}
                icon={FileText}
                description="All certificate requests"
              />
              <StatCard
                title="Pending Reviews"
                value={stats.pending.toString()}
                icon={Clock}
                description="Awaiting approval"
              />
              <StatCard
                title="Approved"
                value={stats.approved.toString()}
                icon={CheckCircle}
                description="Successfully approved"
              />
              <StatCard
                title="Rejected"
                value={stats.rejected.toString()}
                icon={XCircle}
                description="Rejected requests"
              />
            </>
          )}
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Request Management</CardTitle>
            <CardDescription>
              Filter and search through all certificate requests. {filteredRequests.length} request(s) found.
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

            {/* Requests Table */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="all">
                  All Requests ({filteredRequestsByTab.all.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({filteredRequestsByTab.pending.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({filteredRequestsByTab.approved.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({filteredRequestsByTab.rejected.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <CertificateRequestsTable 
                  requests={currentData} 
                  isLoading={loading}
                />
                {filteredRequestsByTab.all.length > 0 && (
                  <PaginationWrapper
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredRequestsByTab.all.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                )}
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                <CertificateRequestsTable 
                  requests={currentData} 
                  isLoading={loading}
                />
                {filteredRequestsByTab.pending.length > 0 && (
                  <PaginationWrapper
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredRequestsByTab.pending.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                <CertificateRequestsTable 
                  requests={currentData} 
                  isLoading={loading}
                />
                {filteredRequestsByTab.approved.length > 0 && (
                  <PaginationWrapper
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredRequestsByTab.approved.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                )}
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                <CertificateRequestsTable 
                  requests={currentData} 
                  isLoading={loading}
                />
                {filteredRequestsByTab.rejected.length > 0 && (
                  <PaginationWrapper
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredRequestsByTab.rejected.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

