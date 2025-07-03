'use client';

import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Check, ThumbsDown, TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveRequest } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/providers/auth-provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function LeaveManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { data: leaveRequests, loading, error } = useCollection<LeaveRequest>('leaveRequests');

  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);

  const filteredRequests = useMemo(() => {
    if (!leaveRequests) return { pending: [], approved: [], rejected: [] };
    return {
      pending: leaveRequests.filter(req => req.status === 'pending'),
      approved: leaveRequests.filter(req => req.status === 'approved'),
      rejected: leaveRequests.filter(req => req.status === 'rejected'),
    };
  }, [leaveRequests]);

  const handleApprove = async (request: LeaveRequest) => {
    if (!currentUser) return;
    try {
      const requestRef = doc(db, 'leaveRequests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        reviewedById: currentUser.id,
        reviewedByName: currentUser.name,
        reviewedAt: serverTimestamp(),
      });
      toast({ title: 'Leave Approved', description: `Leave request for ${request.userName} has been approved.` });
    } catch (e) {
      console.error("Error approving leave:", e);
      toast({ title: 'Approval Failed', variant: 'destructive' });
    }
  };

  const openRejectionDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsRejectionDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || !currentUser || rejectionReason.trim().length < 10) {
      toast({ title: 'Reason Required', description: 'Please provide a reason of at least 10 characters.', variant: 'destructive' });
      return;
    }
    try {
      const requestRef = doc(db, 'leaveRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: rejectionReason,
        reviewedById: currentUser.id,
        reviewedByName: currentUser.name,
        reviewedAt: serverTimestamp(),
      });
      toast({ title: 'Leave Rejected', description: `Leave request for ${selectedRequest.userName} has been rejected.`, variant: 'destructive' });
      setIsRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
    } catch (e) {
      console.error("Error rejecting leave:", e);
      toast({ title: 'Rejection Failed', variant: 'destructive' });
    }
  };

  const statusVariant = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const RequestsTable = ({ requests }: { requests: LeaveRequest[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reason</TableHead>
          {requests[0]?.status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && [...Array(3)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
            {requests[0]?.status === 'pending' && <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>}
          </TableRow>
        ))}
        {!loading && requests.length === 0 && (
          <TableRow><TableCell colSpan={7} className="h-24 text-center">No requests found.</TableCell></TableRow>
        )}
        {!loading && requests.map(req => (
          <TableRow key={req.id}>
            <TableCell className="font-medium">{req.userName}</TableCell>
            <TableCell>{req.leaveType}</TableCell>
            <TableCell>{format(req.startDate.toDate(), 'PPP')} - {format(req.endDate.toDate(), 'PPP')}</TableCell>
            <TableCell>{req.daysCount}</TableCell>
            <TableCell><Badge variant={statusVariant(req.status)} className="capitalize">{req.status}</Badge></TableCell>
            <TableCell className="text-muted-foreground">{req.reason}</TableCell>
            {req.status === 'pending' && (
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary" onClick={() => handleApprove(req)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openRejectionDialog(req)}>
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      <PageHeader
        title="Leave Management"
        description="Review and manage employee leave requests."
      />

      {error && (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Error loading leave requests</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending ({filteredRequests.pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filteredRequests.approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({filteredRequests.rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <Card><CardContent className="p-0"><RequestsTable requests={filteredRequests.pending} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <Card><CardContent className="p-0"><RequestsTable requests={filteredRequests.approved} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <Card><CardContent className="p-0"><RequestsTable requests={filteredRequests.rejected} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Rejection</DialogTitle>
                <DialogDescription>Please provide a clear reason for rejecting this leave request. This will be visible to the employee.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="rejection-reason" className="sr-only">Rejection Reason</Label>
                <Textarea id="rejection-reason" placeholder="e.g., Critical project deadline, overlapping requests..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
