'use client';

import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Check, ThumbsDown, TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveRequest, User } from '@/lib/types';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendLeaveApprovalEmail, sendLeaveRejectionEmail } from '@/app/requests/actions';

export default function LeaveManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { data: leaveRequests, loading, error } = useCollection<LeaveRequest>('leaveRequests');

  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const searchedRequests = useMemo(() => {
    if (!leaveRequests) return [];
    if (!searchTerm.trim()) return leaveRequests;
    return leaveRequests.filter(req => 
      req.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leaveRequests, searchTerm]);
  
  const filteredRequests = useMemo(() => {
    if (!searchedRequests) return { pending: [], approved: [], rejected: [] };
    return {
      pending: searchedRequests.filter(req => req.status === 'pending'),
      approved: searchedRequests.filter(req => req.status === 'approved'),
      rejected: searchedRequests.filter(req => req.status === 'rejected'),
    };
  }, [searchedRequests]);

  const handleApprove = async (request: LeaveRequest) => {
    if (!currentUser) return;
    try {
        const leaveRequestRef = doc(db!, 'leaveRequests', request.id);
        
        await updateDoc(leaveRequestRef, {
            status: 'approved',
            reviewedById: currentUser.id,
            reviewedByName: currentUser.name,
            reviewedAt: serverTimestamp(),
        });
        
        const userRef = doc(db!, 'users', request.userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("Requester's user document not found to send email.");
        const requesterEmail = userSnap.data().email;
        
        await sendLeaveApprovalEmail({
            userName: request.userName,
            startDate: request.startDate.toDate().toISOString(),
            endDate: request.endDate.toDate().toISOString(),
            recipientEmail: requesterEmail,
            approverName: currentUser.name
        });

        toast({ title: 'Leave Approved', description: `Leave request for ${request.userName} has been approved.` });
    } catch (e) {
        const error = e as Error;
        console.error("Error approving leave:", error);
        toast({ title: 'Approval Failed', variant: 'destructive', description: error.message });
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
        const leaveRequestRef = doc(db!, 'leaveRequests', selectedRequest.id);

        await updateDoc(leaveRequestRef, {
            status: 'rejected',
            rejectionReason: rejectionReason,
            reviewedById: currentUser.id,
            reviewedByName: currentUser.name,
            reviewedAt: serverTimestamp(),
        });

        const userRef = doc(db!, 'users', selectedRequest.userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("Requester's user document not found to send email.");
        const requesterEmail = userSnap.data().email;

        await sendLeaveRejectionEmail({
            userName: selectedRequest.userName,
            startDate: selectedRequest.startDate.toDate().toISOString(),
            endDate: selectedRequest.endDate.toDate().toISOString(),
            recipientEmail: requesterEmail,
            reason: rejectionReason,
            rejectorName: currentUser.name
        });

        toast({ title: 'Leave Rejected', description: `Leave request for ${selectedRequest.userName} has been rejected.`, variant: 'destructive' });
        setIsRejectionDialogOpen(false);
        setRejectionReason('');
        setSelectedRequest(null);
    } catch (e) {
        const error = e as Error;
        console.error("Error rejecting leave:", error);
        toast({ title: 'Rejection Failed', variant: 'destructive', description: error.message });
    }
  };

  const RequestsTable = ({ requests, status }: { requests: LeaveRequest[], status: 'pending' | 'approved' | 'rejected' }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                {status === 'pending' && <TableHead>Reason</TableHead>}
                {status !== 'pending' && <TableHead>Reviewed By</TableHead>}
                {status === 'rejected' && <TableHead>Rejection Reason</TableHead>}
                {status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
        </TableHeader>
        <TableBody>
            {loading && [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    {status === 'pending' && <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>}
                </TableRow>
            ))}
            {!loading && requests.length === 0 && (
                <TableRow><TableCell colSpan={status === 'pending' ? 6 : 5} className="h-24 text-center">No requests found in this category.</TableCell></TableRow>
            )}
            {!loading && requests.map(req => (
                <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.userName}</TableCell>
                    <TableCell>{req.leaveType}</TableCell>
                    <TableCell>{req.startDate ? format(req.startDate.toDate(), 'PPP') : ''} - {req.endDate ? format(req.endDate.toDate(), 'PPP') : ''}</TableCell>
                    <TableCell>{req.daysCount}</TableCell>

                    {status === 'pending' && <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{req.reason}</TableCell>}
                    {status !== 'pending' && <TableCell>{req.reviewedByName}</TableCell>}
                    {status === 'rejected' && <TableCell className="text-destructive text-sm max-w-xs truncate">{req.rejectionReason}</TableCell>}
                    
                    {status === 'pending' && (
                        <TableCell className="text-right">
                          <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-primary hover:text-primary" onClick={() => handleApprove(req)}>
                                          <Check className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Approve</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openRejectionDialog(req)}>
                                          <ThumbsDown className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Reject</p></TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'approved' | 'rejected')} className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <TabsList>
                <TabsTrigger value="pending">Pending ({filteredRequests.pending.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({filteredRequests.approved.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({filteredRequests.rejected.length})</TabsTrigger>
            </TabsList>
            <div className="w-full sm:w-auto sm:max-w-xs">
                <Input 
                    placeholder="Search by employee name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <TabsContent value="pending" className="mt-4">
          <Card><CardContent className="p-0"><RequestsTable requests={filteredRequests.pending} status="pending" /></CardContent></Card>
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <Card><CardContent className="p-0"><RequestsTable requests={filteredRequests.approved} status="approved" /></CardContent></Card>
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <Card><CardContent className="p-0"><RequestsTable requests={filteredRequests.rejected} status="rejected" /></CardContent></Card>
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
