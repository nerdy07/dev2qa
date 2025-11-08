'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '@/providers/auth-provider';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ThumbsDown, TriangleAlert, Calendar, Hash, User as UserIcon, Package, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter as DialogFooterComponent,
    DialogClose
  } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Requisition } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocument } from '@/hooks/use-collection';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RequisitionForm } from '@/components/requisitions/requisition-form';

export default function RequisitionDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, hasRole, hasPermission } = useAuth();
  const { toast } = useToast();
  
  const { data: requisition, loading, error, setData: setRequisition } = useDocument<Requisition>('requisitions', id as string);
  
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [isResubmitting, setIsResubmitting] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  const handleApprove = async () => {
    if (!requisition || !user || !db) return;

    try {
        const requisitionRef = doc(db, 'requisitions', requisition.id);
        await updateDoc(requisitionRef, {
            status: 'approved',
            reviewedById: user.id,
            reviewedByName: user.name,
            reviewedAt: serverTimestamp(),
            approvalDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        setRequisition({
            ...requisition,
            status: 'approved',
            reviewedById: user.id,
            reviewedByName: user.name,
            approvalDate: serverTimestamp() as any,
        });

        toast({
            title: 'Requisition Approved',
            description: `Requisition "${requisition.title}" has been approved.`,
        });
    } catch (e) {
        const error = e as Error;
        console.error("Error approving requisition:", error);
        toast({ title: 'Approval Failed', variant: 'destructive', description: error.message });
    }
  };

  const handleReject = async () => {
    if (!requisition || !user || !db || rejectionReason.trim().length < 10) {
        toast({
            title: 'Reason Required',
            description: 'Please provide a reason for rejection (at least 10 characters).',
            variant: 'destructive'
        });
        return;
    }

    try {
        const requisitionRef = doc(db, 'requisitions', requisition.id);
        await updateDoc(requisitionRef, {
            status: 'rejected',
            rejectionReason: rejectionReason,
            reviewedById: user.id,
            reviewedByName: user.name,
            reviewedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        setRequisition({
            ...requisition,
            status: 'rejected',
            rejectionReason: rejectionReason,
            reviewedById: user.id,
            reviewedByName: user.name,
        });

        toast({
            title: 'Requisition Rejected',
            description: `Requisition "${requisition.title}" has been rejected.`,
            variant: 'destructive'
        });
        setRejectionReason('');
    } catch (e) {
        const error = e as Error;
        console.error("Error rejecting requisition:", error);
        toast({ title: 'Rejection Failed', variant: 'destructive', description: error.message });
    }
  };

  const handleResubmit = async () => {
    if (!requisition || !user || !db) return;
    
    if (user.id !== requisition.requesterId) {
      toast({
        title: 'Unauthorized',
        description: 'Only the requester can resubmit this requisition.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsResubmitting(true);
    try {
        const requisitionRef = doc(db, 'requisitions', requisition.id);
        await updateDoc(requisitionRef, {
            status: 'pending',
            updatedAt: serverTimestamp(),
            previousRejectionReason: requisition.rejectionReason || undefined,
            rejectionReason: deleteField(),
            reviewedById: deleteField(),
            reviewedByName: deleteField(),
        });

        setRequisition({
            ...requisition,
            status: 'pending',
            rejectionReason: undefined,
            reviewedById: undefined,
            reviewedByName: undefined,
        });

        toast({
            title: 'Requisition Resubmitted',
            description: `Your requisition "${requisition.title}" has been resubmitted for review.`,
        });

    } catch (e) {
        const error = e as Error;
        console.error("Error resubmitting requisition: ", e);
        toast({
            title: 'Resubmission Failed',
            variant: 'destructive',
            description: error.message,
        });
    } finally {
        setIsResubmitting(false);
    }
  };

  const handleSubmitRequisition = async () => {
    if (!requisition || !user || !db) return;

    try {
      const requisitionRef = doc(db, 'requisitions', requisition.id);
      await updateDoc(requisitionRef, {
        status: 'pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setRequisition({
        ...requisition,
        status: 'pending',
        submittedAt: serverTimestamp() as any,
      });

      toast({
        title: 'Requisition Submitted',
        description: 'Your requisition has been submitted for approval.',
      });
    } catch (error: any) {
      console.error('Error submitting requisition:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit requisition',
        variant: 'destructive',
      });
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

  const DetailItem = ({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-medium">{children}</span>
        </div>
    </div>
  );

  if (loading) {
    return (
        <>
            <PageHeader title=""><Skeleton className="h-9 w-64" /></PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-1/3" />
                        <Skeleton className="h-5 w-1/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                  <Card>
                    <CardHeader><Skeleton className="h-7 w-32" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
              </div>
            </div>
        </>
    )
  }

  if (error || !requisition) {
    return <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Requisition not found."}</AlertDescription>
    </Alert>;
  }

  const isActionable = (hasRole(['admin', 'hr_admin']) || hasPermission(ALL_PERMISSIONS.REQUISITIONS.APPROVE)) && requisition.status === 'pending';
  const canEdit = user?.id === requisition.requesterId && requisition.status === 'draft';
  const createdAtDate = (requisition.createdAt as any)?.toDate() || new Date();

  return (
    <>
      <PageHeader title={requisition.title} />
      
      {requisition.status === 'rejected' && requisition.rejectionReason && (
        <Alert variant="destructive" className="mb-6">
            <ThumbsDown className="h-4 w-4" />
            <AlertTitle>Requisition Rejected by {requisition.reviewedByName}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
                <div>
                    <strong>Reason:</strong> {requisition.rejectionReason}
                </div>
                {user?.id === requisition.requesterId && (
                    <Button
                        onClick={handleResubmit}
                        disabled={isResubmitting}
                        size="sm"
                        className="ml-4"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isResubmitting ? 'animate-spin' : ''}`} />
                        {isResubmitting ? 'Resubmitting...' : 'Resubmit'}
                    </Button>
                )}
            </AlertDescription>
        </Alert>
      )}

      {requisition.status === 'approved' && (
        <Alert className="mb-6 border-primary text-primary bg-primary/10">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle>Requisition Approved!</AlertTitle>
            <AlertDescription>
                This requisition was approved by {requisition.reviewedByName}.
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Requisition Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                        <DetailItem icon={Hash} label="Requisition ID">
                            {requisition.shortId || requisition.id.slice(0, 8)}
                        </DetailItem>
                        <DetailItem icon={Hash} label="Status">
                            <Badge variant={statusVariant(requisition.status)} className="capitalize w-fit">{requisition.status.replace('_', ' ')}</Badge>
                        </DetailItem>
                        <DetailItem icon={UserIcon} label="Requester">
                            {requisition.requesterName}
                        </DetailItem>
                        <DetailItem icon={Calendar} label="Created">
                            {format(createdAtDate, 'PPP p')} ({formatDistanceToNowStrict(createdAtDate, { addSuffix: true })})
                        </DetailItem>
                        {requisition.department && (
                            <DetailItem icon={Package} label="Department">
                                {requisition.department}
                            </DetailItem>
                        )}
                        {requisition.totalEstimatedAmount && (
                            <DetailItem icon={DollarSign} label="Total Amount">
                                {requisition.currency} {requisition.totalEstimatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </DetailItem>
                        )}
                        <DetailItem icon={AlertCircle} label="Urgency">
                            <Badge variant={requisition.urgency === 'urgent' ? 'destructive' : requisition.urgency === 'high' ? 'default' : 'secondary'} className="capitalize">
                                {requisition.urgency}
                            </Badge>
                        </DetailItem>
                        <DetailItem icon={AlertCircle} label="Priority">
                            <Badge variant={requisition.priority === 'critical' ? 'destructive' : requisition.priority === 'urgent' ? 'default' : 'secondary'} className="capitalize">
                                {requisition.priority}
                            </Badge>
                        </DetailItem>
                    </div>
                    {requisition.description && (
                        <>
                            <Separator className="my-6" />
                            <div>
                                <h4 className="font-semibold mb-2 text-base">Description</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{requisition.description}</p>
                            </div>
                        </>
                    )}
                    <Separator className="my-6" />
                    <div>
                        <h4 className="font-semibold mb-2 text-base">Justification</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap">{requisition.justification}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Items Requested</CardTitle>
                    <CardDescription>
                        {requisition.items?.length || 0} item(s) in this requisition
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requisition.items?.map((item, index) => {
                                const itemTotal = item.estimatedTotal || (item.estimatedUnitPrice && item.quantity ? item.estimatedUnitPrice * item.quantity : 0);
                                return (
                                    <TableRow key={item.id || index}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div>{item.itemName}</div>
                                                {item.description && (
                                                    <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.quantity} {item.unit}</TableCell>
                                        <TableCell>
                                            {item.estimatedUnitPrice
                                                ? `${requisition.currency} ${item.estimatedUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : 'Not specified'}
                                        </TableCell>
                                        <TableCell>
                                            {itemTotal > 0
                                                ? `${requisition.currency} ${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : 'Not specified'}
                                        </TableCell>
                                        <TableCell>
                                            {item.category || 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            {isActionable && (
                <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-2">
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                    <XCircle className="mr-2 h-4 w-4" /> Reject Requisition
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Reason for Rejection</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <Label htmlFor="rejection-reason">Provide a mandatory reason for rejecting this requisition.</Label>
                                    <Textarea 
                                        id="rejection-reason"
                                        placeholder="e.g., Budget constraints, items not available..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                <DialogFooterComponent>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit" variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                                </DialogFooterComponent>
                            </DialogContent>
                        </Dialog>

                        <Button onClick={handleApprove} className="w-full">
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve Requisition
                        </Button>
                    </CardContent>
                </Card>
            )}

            {canEdit && (
                <Card>
                    <CardHeader><CardTitle>Edit Requisition</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    Edit
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Edit Requisition</DialogTitle>
                                </DialogHeader>
                                <RequisitionForm 
                                    onSuccess={() => {
                                        setIsEditDialogOpen(false);
                                        router.refresh();
                                    }} 
                                    initialData={requisition}
                                />
                            </DialogContent>
                        </Dialog>
                        <Button 
                            variant="default" 
                            className="w-full"
                            onClick={handleSubmitRequisition}
                        >
                            Submit for Approval
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </>
  );
}

