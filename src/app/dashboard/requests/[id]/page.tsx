'use client';

import { useParams, useRouter } from 'next/navigation';
import { mockRequests } from '@/lib/mock-data';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, ThumbsDown, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
  } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function RequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = React.useState('');

  const request = mockRequests.find((r) => r.id === id);

  if (!request) {
    return <div>Request not found.</div>;
  }
  
  const handleApprove = () => {
    toast({
        title: 'Request Approved',
        description: `Certificate for "${request.taskTitle}" has been generated.`,
    });
    // In real app, update status and generate certificate, then redirect.
    router.push('/dashboard');
  }
  
  const handleReject = () => {
    if (rejectionReason.trim().length < 10) {
        toast({
            title: 'Reason Required',
            description: 'Please provide a reason for rejection (at least 10 characters).',
            variant: 'destructive'
        });
        return;
    }
    toast({
        title: 'Request Rejected',
        description: `Request for "${request.taskTitle}" has been rejected.`,
        variant: 'destructive'
    });
    // In real app, update status with reason, then redirect.
    router.push('/dashboard');
  }

  const statusVariant = (status: 'pending' | 'approved' | 'rejected') => {
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

  const isActionable = user?.role === 'qa_tester' && request.status === 'pending';

  return (
    <>
      <PageHeader title={request.taskTitle}>
        {isActionable && (
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reason for Rejection</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Label htmlFor="rejection-reason">Provide a mandatory reason for rejecting this request.</Label>
                            <Textarea 
                                id="rejection-reason"
                                placeholder="e.g., Testing failed on mobile devices..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button onClick={handleApprove}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                </Button>
            </div>
        )}
      </PageHeader>
      
      {request.status === 'rejected' && request.rejectionReason && (
        <Alert variant="destructive" className="mb-6">
            <ThumbsDown className="h-4 w-4" />
            <AlertTitle>Request Rejected by {request.qaTesterName}</AlertTitle>
            <AlertDescription>
                <strong>Reason:</strong> {request.rejectionReason}
            </AlertDescription>
        </Alert>
      )}

      {request.status === 'approved' && (
        <Alert className="mb-6 border-primary text-primary">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Request Approved!</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
                <span>This request was approved by {request.qaTesterName}.</span>
                <Button variant="link" asChild className="p-0 h-auto text-primary">
                    <Link href={`/dashboard/certificates/${request.certificateId}`}>View Certificate</Link>
                </Button>
            </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Submitted on {format(request.createdAt, 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusVariant(request.status)} className="capitalize w-fit">{request.status}</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Requester</span>
              <span className="font-medium">{request.requesterName}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">{format(request.updatedAt, 'PPP p')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Team</span>
              <span className="font-medium">{request.associatedTeam}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium">{request.associatedProject}</span>
            </div>
            {request.taskLink && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Task Link</span>
                <a
                  href={request.taskLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  View Task <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{request.description}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
