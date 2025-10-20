
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument } from '@/hooks/use-collection';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DesignRequest } from '@/lib/types';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter as DialogFooterComponent, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TriangleAlert, CheckCircle, ThumbsDown, XCircle, User, Calendar, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { sendDesignApprovedEmail, sendDesignRejectedEmail } from '@/app/requests/actions';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';

export default function DesignRequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { data: request, loading, error } = useDocument<DesignRequest>('designRequests', id as string);
  
  const [rejectionReason, setRejectionReason] = React.useState('');

  const canApprove = hasPermission(ALL_PERMISSIONS.DESIGNS.APPROVE);
  const isActionable = canApprove && request?.status === 'pending';

  const handleApprove = async () => {
    if (!request || !user || !db) return;

    try {
      const requestRef = doc(db, 'designRequests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        reviewerId: user.id,
        reviewerName: user.name,
        updatedAt: serverTimestamp(),
      });

      const emailResult = await sendDesignApprovedEmail({
        recipientEmail: request.designerEmail,
        designerName: request.designerName,
        designTitle: request.designTitle,
        reviewerName: user.name,
      });

      toast({
        title: 'Design Approved',
        description: `The design "${request.designTitle}" has been approved.`,
      });
      if (!emailResult.success) {
        toast({ title: 'Email Failed', description: emailResult.error, variant: 'destructive' });
      }

      router.push('/dashboard/admin/design-approvals');
    } catch (e) {
      console.error("Error approving design request: ", e);
      toast({ title: 'Approval Failed', variant: 'destructive', description: (e as Error).message });
    }
  };

  const handleReject = async () => {
    if (!request || !user || !db) return;

    if (rejectionReason.trim().length < 10) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for rejection (at least 10 characters).', variant: 'destructive' });
      return;
    }

    try {
      const requestRef = doc(db, 'designRequests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewComments: rejectionReason,
        reviewerId: user.id,
        reviewerName: user.name,
        updatedAt: serverTimestamp(),
      });
      
      const emailResult = await sendDesignRejectedEmail({
        recipientEmail: request.designerEmail,
        designerName: request.designerName,
        designTitle: request.designTitle,
        comments: rejectionReason,
        reviewerName: user.name,
      });

      toast({ title: 'Design Rejected', variant: 'destructive' });
      if (!emailResult.success) {
        toast({ title: 'Email Failed', description: emailResult.error, variant: 'destructive' });
      }
      router.push('/dashboard/admin/design-approvals');
    } catch (e) {
      console.error("Error rejecting design request: ", e);
      toast({ title: 'Rejection Failed', variant: 'destructive', description: (e as Error).message });
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

  if (loading) {
    return (
      <>
        <PageHeader title=""><Skeleton className="h-9 w-64" /></PageHeader>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
      </>
    );
  }

  if (error || !request) {
    return <Alert variant="destructive"><TriangleAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error || "Design request not found."}</AlertDescription></Alert>;
  }

  const createdAtDate = (request.createdAt as any)?.toDate() || new Date();
  
  // Basic URL parsing to get a usable Figma embed URL
  const getFigmaEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'www.figma.com') {
        const pathParts = urlObj.pathname.split('/');
        // Assuming format is /file/FILE_KEY/TITLE?...
        if (pathParts[1] === 'file' && pathParts[2]) {
          return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
        }
      }
    } catch (e) {
      // Invalid URL
    }
    return null;
  }
  const figmaEmbedUrl = getFigmaEmbedUrl(request.figmaUrl);


  return (
    <>
      <PageHeader title={request.designTitle} />
      
      {request.status === 'rejected' && (
        <Alert variant="destructive" className="mb-6">
            <ThumbsDown className="h-4 w-4" />
            <AlertTitle>Design Rejected by {request.reviewerName}</AlertTitle>
            <AlertDescription><strong>Feedback:</strong> {request.reviewComments}</AlertDescription>
        </Alert>
      )}

      {request.status === 'approved' && (
        <Alert className="mb-6 border-primary text-primary bg-primary/10">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle>Design Approved by {request.reviewerName}</AlertTitle>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader><CardTitle>Figma Preview</CardTitle></CardHeader>
                <CardContent>
                    {figmaEmbedUrl ? (
                        <iframe
                            className="w-full h-[450px] border bg-muted rounded-md"
                            src={figmaEmbedUrl}
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <Alert>
                            <TriangleAlert className="h-4 w-4" />
                            <AlertTitle>Cannot Embed Figma File</AlertTitle>
                            <AlertDescription>The provided URL is not a valid Figma file link. You can view the file directly by clicking the link in the details section.</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                     <div className="flex items-start gap-3">
                        <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div><span className="text-muted-foreground">Designer</span><p className="font-medium">{request.designerName}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div><span className="text-muted-foreground">Submitted</span><p className="font-medium">{format(createdAtDate, 'PPP p')}</p></div>
                    </div>
                     <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div><span className="text-muted-foreground">Status</span><p><Badge variant={statusVariant(request.status)} className="capitalize">{request.status}</Badge></p></div>
                    </div>
                </CardContent>
                <CardFooter>
                     <a href={request.figmaUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" className="w-full">View in Figma <ExternalLink className="ml-2 h-4 w-4" /></Button>
                    </a>
                </CardFooter>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</p>
                </CardContent>
            </Card>

            {isActionable && (
                <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-2">
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="w-full"><XCircle className="mr-2 h-4 w-4" /> Reject Design</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Reason for Rejection</DialogTitle></DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <Label htmlFor="rejection-reason">Provide feedback for the designer.</Label>
                                    <Textarea id="rejection-reason" placeholder="e.g., The color palette doesn't align with our brand guidelines..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="min-h-[100px]" />
                                </div>
                                <DialogFooterComponent>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit" variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                                </DialogFooterComponent>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={handleApprove} className="w-full"><CheckCircle className="mr-2 h-4 w-4" /> Approve Design</Button>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </>
  );
}
