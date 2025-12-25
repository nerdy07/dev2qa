'use client';

import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Check, XCircle, Clock, Package, AlertCircle, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Requisition } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import Link from 'next/link';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationWrapper } from '@/components/common/pagination-wrapper';

export default function RequisitionsManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { data: requisitions, loading, error } = useCollection<Requisition>('requisitions');

  const [rejectionReason, setRejectionReason] = useState('');
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [isFulfillmentDialogOpen, setIsFulfillmentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'fulfilled'>('pending');

  const searchedRequisitions = useMemo(() => {
    if (!requisitions) return [];
    if (!searchTerm.trim()) return requisitions;
    return requisitions.filter(req => 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.shortId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requisitions, searchTerm]);
  
  const filteredRequisitions = useMemo(() => {
    if (!searchedRequisitions) return { pending: [], approved: [], rejected: [], fulfilled: [] };
    return {
      pending: searchedRequisitions.filter(req => req.status === 'pending'),
      approved: searchedRequisitions.filter(req => req.status === 'approved'),
      rejected: searchedRequisitions.filter(req => req.status === 'rejected'),
      fulfilled: searchedRequisitions.filter(req => req.status === 'fulfilled' || req.status === 'partially_fulfilled'),
    };
  }, [searchedRequisitions]);

  // Pagination for each tab
  const pendingPagination = usePagination({
    data: filteredRequisitions.pending,
    itemsPerPage: 20,
    initialPage: 1,
  });
  const approvedPagination = usePagination({
    data: filteredRequisitions.approved,
    itemsPerPage: 20,
    initialPage: 1,
  });
  const rejectedPagination = usePagination({
    data: filteredRequisitions.rejected,
    itemsPerPage: 20,
    initialPage: 1,
  });
  const fulfilledPagination = usePagination({
    data: filteredRequisitions.fulfilled,
    itemsPerPage: 20,
    initialPage: 1,
  });

  const handleApprove = async (requisition: Requisition) => {
    if (!currentUser || !db) return;
    try {
        const requisitionRef = doc(db, 'requisitions', requisition.id);
        
        await updateDoc(requisitionRef, {
            status: 'approved',
            reviewedById: currentUser.id,
            reviewedByName: currentUser.name,
            reviewedAt: serverTimestamp(),
            approvalDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        toast({ title: 'Requisition Approved', description: `Requisition "${requisition.title}" has been approved.` });

    } catch (e) {
        const error = e as Error;
        console.error("Error approving requisition:", error);
        toast({ title: 'Approval Failed', variant: 'destructive', description: error.message });
    }
  };

  const openRejectionDialog = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsRejectionDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequisition || !currentUser || !db || rejectionReason.trim().length < 10) {
      toast({ title: 'Reason Required', description: 'Please provide a reason of at least 10 characters.', variant: 'destructive' });
      return;
    }
    
    try {
        const requisitionRef = doc(db, 'requisitions', selectedRequisition.id);

        await updateDoc(requisitionRef, {
            status: 'rejected',
            rejectionReason: rejectionReason,
            reviewedById: currentUser.id,
            reviewedByName: currentUser.name,
            reviewedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        toast({ title: 'Requisition Rejected', description: `Requisition "${selectedRequisition.title}" has been rejected.`, variant: 'destructive' });
        
        setIsRejectionDialogOpen(false);
        setRejectionReason('');
        setSelectedRequisition(null);
    } catch (e) {
        const error = e as Error;
        console.error("Error rejecting requisition:", error);
        toast({ title: 'Rejection Failed', variant: 'destructive', description: error.message });
    }
  };

  const openFulfillmentDialog = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsFulfillmentDialogOpen(true);
  };

  const handleFulfill = async () => {
    if (!selectedRequisition || !currentUser || !db) return;
    
    try {
        const requisitionRef = doc(db, 'requisitions', selectedRequisition.id);

        await updateDoc(requisitionRef, {
            status: 'fulfilled',
            fulfilledById: currentUser.id,
            fulfilledByName: currentUser.name,
            fulfilledAt: serverTimestamp(),
            fulfillmentNotes: fulfillmentNotes.trim() || undefined,
            updatedAt: serverTimestamp(),
        });

        toast({ title: 'Requisition Fulfilled', description: `Requisition "${selectedRequisition.title}" has been marked as fulfilled.` });
        
        setIsFulfillmentDialogOpen(false);
        setFulfillmentNotes('');
        setSelectedRequisition(null);
    } catch (e) {
        const error = e as Error;
        console.error("Error fulfilling requisition:", error);
        toast({ title: 'Fulfillment Failed', variant: 'destructive', description: error.message });
    }
  };

  const statusVariant = (status: Requisition['status']) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'pending':
        return 'default';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'fulfilled':
        return 'default';
      case 'partially_fulfilled':
        return 'default';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const RequisitionsTable = ({ requisitions: tableRequisitions, status }: { requisitions: Requisition[], status: string }) => {
    if (tableRequisitions.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {status} requisitions found.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRequisitions.map((requisition) => (
            <TableRow key={requisition.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/requisitions/${requisition.id}`}
                  className="hover:underline"
                >
                  {requisition.title}
                </Link>
                {requisition.shortId && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({requisition.shortId})
                  </span>
                )}
              </TableCell>
              <TableCell>{requisition.requesterName}</TableCell>
              <TableCell>{requisition.items?.length || 0} items</TableCell>
              <TableCell>
                {requisition.totalEstimatedAmount
                  ? `${requisition.currency} ${requisition.totalEstimatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'Not specified'}
              </TableCell>
              <TableCell>
                <Badge variant={requisition.urgency === 'urgent' ? 'destructive' : requisition.urgency === 'high' ? 'default' : 'secondary'} className="capitalize">
                  {requisition.urgency}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(requisition.status)} className="capitalize">
                  {requisition.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {requisition.createdAt?.toDate
                  ? format(requisition.createdAt.toDate(), 'PPP')
                  : 'N/A'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/requisitions/${requisition.id}`)}
                  >
                    View
                  </Button>
                  {requisition.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(requisition)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openRejectionDialog(requisition)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {requisition.status === 'approved' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openFulfillmentDialog(requisition)}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Fulfill
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <ProtectedRoute 
      permission={ALL_PERMISSIONS.REQUISITIONS.READ_ALL}
    >
      <PageHeader
        title="Requisitions Management"
        description="Review and manage all requisition requests"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requisitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load requisitions. Please try again.</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Requisitions</CardTitle>
            <CardDescription>
              Manage requisition requests from all staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">
                  Pending ({filteredRequisitions.pending.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({filteredRequisitions.approved.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({filteredRequisitions.rejected.length})
                </TabsTrigger>
                <TabsTrigger value="fulfilled">
                  Fulfilled ({filteredRequisitions.fulfilled.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-6">
                <div className="space-y-4">
                  <RequisitionsTable requisitions={pendingPagination.currentData} status="pending" />
                  {filteredRequisitions.pending.length > 0 && (
                    <PaginationWrapper
                      currentPage={pendingPagination.currentPage}
                      totalPages={pendingPagination.totalPages}
                      totalItems={filteredRequisitions.pending.length}
                      itemsPerPage={pendingPagination.itemsPerPage}
                      onPageChange={pendingPagination.setCurrentPage}
                      onItemsPerPageChange={pendingPagination.setItemsPerPage}
                    />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="approved" className="mt-6">
                <div className="space-y-4">
                  <RequisitionsTable requisitions={approvedPagination.currentData} status="approved" />
                  {filteredRequisitions.approved.length > 0 && (
                    <PaginationWrapper
                      currentPage={approvedPagination.currentPage}
                      totalPages={approvedPagination.totalPages}
                      totalItems={filteredRequisitions.approved.length}
                      itemsPerPage={approvedPagination.itemsPerPage}
                      onPageChange={approvedPagination.setCurrentPage}
                      onItemsPerPageChange={approvedPagination.setItemsPerPage}
                    />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="rejected" className="mt-6">
                <div className="space-y-4">
                  <RequisitionsTable requisitions={rejectedPagination.currentData} status="rejected" />
                  {filteredRequisitions.rejected.length > 0 && (
                    <PaginationWrapper
                      currentPage={rejectedPagination.currentPage}
                      totalPages={rejectedPagination.totalPages}
                      totalItems={filteredRequisitions.rejected.length}
                      itemsPerPage={rejectedPagination.itemsPerPage}
                      onPageChange={rejectedPagination.setCurrentPage}
                      onItemsPerPageChange={rejectedPagination.setItemsPerPage}
                    />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="fulfilled" className="mt-6">
                <div className="space-y-4">
                  <RequisitionsTable requisitions={fulfilledPagination.currentData} status="fulfilled" />
                  {filteredRequisitions.fulfilled.length > 0 && (
                    <PaginationWrapper
                      currentPage={fulfilledPagination.currentPage}
                      totalPages={fulfilledPagination.totalPages}
                      totalItems={filteredRequisitions.fulfilled.length}
                      itemsPerPage={fulfilledPagination.itemsPerPage}
                      onPageChange={fulfilledPagination.setCurrentPage}
                      onItemsPerPageChange={fulfilledPagination.setItemsPerPage}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this requisition. The requester will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters required
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectionReason.trim().length < 10}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFulfillmentDialogOpen} onOpenChange={setIsFulfillmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Requisition</DialogTitle>
            <DialogDescription>
              Mark this requisition as fulfilled. You can add notes about how it was fulfilled.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fulfillment-notes">Fulfillment Notes (Optional)</Label>
              <Textarea
                id="fulfillment-notes"
                placeholder="Add any notes about how this requisition was fulfilled (e.g., items delivered, payment processed, etc.)..."
                value={fulfillmentNotes}
                onChange={(e) => setFulfillmentNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Add details about how the requisition was fulfilled
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="default"
              onClick={handleFulfill}
            >
              <Package className="mr-2 h-4 w-4" />
              Mark as Fulfilled
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

