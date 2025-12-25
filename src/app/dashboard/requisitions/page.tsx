'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, Clock, CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/hooks/use-collection';
import type { Requisition } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { query, where, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { RequisitionForm } from '@/components/requisitions/requisition-form';
import { StatCard } from '@/components/dashboard/stat-card';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MyRequisitionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const requisitionsQuery = React.useMemo(() => {
    if (!user?.id || !db) return null;
    // Query without orderBy to avoid requiring a composite index
    // We'll sort client-side instead
    return query(
      collection(db, 'requisitions'),
      where('requesterId', '==', user.id)
    );
  }, [user?.id, db]);

  const { data: requisitions, loading, error } = useCollection<Requisition>('requisitions', requisitionsQuery);

  // Sort requisitions client-side if needed (handles missing index or different field names)
  const sortedRequisitions = React.useMemo(() => {
    if (!requisitions) return [];
    
    return [...requisitions].sort((a, b) => {
      // Try createdAt first, then requestedAt, then fallback to id
      const dateA = (a as any).createdAt?.toDate?.() || (a.requestedAt as any)?.toDate?.() || new Date(0);
      const dateB = (b as any).createdAt?.toDate?.() || (b.requestedAt as any)?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });
  }, [requisitions]);

  const requisitionStats = React.useMemo(() => {
    if (!requisitions) {
      return { total: 0, drafts: 0, pending: 0, approved: 0, rejected: 0, fulfilled: 0 };
    }
    return {
      total: requisitions.length,
      drafts: requisitions.filter(r => r.status === 'draft').length,
      pending: requisitions.filter(r => r.status === 'pending').length,
      approved: requisitions.filter(r => r.status === 'approved').length,
      rejected: requisitions.filter(r => r.status === 'rejected').length,
      fulfilled: requisitions.filter(r => r.status === 'fulfilled' || r.status === 'partially_fulfilled').length,
    };
  }, [requisitions]);

  const handleSubmitRequisition = async (requisitionId: string) => {
    if (!db || !user) return;

    try {
      const requisitionRef = doc(db, 'requisitions', requisitionId);
      await updateDoc(requisitionRef, {
        status: 'pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

  const handleCancelRequisition = async (requisitionId: string) => {
    if (!db || !user) return;

    try {
      const requisitionRef = doc(db, 'requisitions', requisitionId);
      await updateDoc(requisitionRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Requisition Cancelled',
        description: 'Your requisition has been cancelled.',
      });
    } catch (error: any) {
      console.error('Error cancelling requisition:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel requisition',
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

  const statusIcon = (status: Requisition['status']) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'fulfilled':
        return <Package className="h-4 w-4" />;
      case 'partially_fulfilled':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load requisitions. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title="My Requisitions"
        description="Manage your requisition requests"
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Requisition</DialogTitle>
            </DialogHeader>
            <RequisitionForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          title="Total Requisitions"
          value={requisitionStats.total.toString()}
          icon={FileText}
        />
        <StatCard
          title="Pending"
          value={requisitionStats.pending.toString()}
          icon={Clock}
        />
        <StatCard
          title="Approved"
          value={requisitionStats.approved.toString()}
          icon={CheckCircle}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      ) : !requisitions || requisitions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requisitions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first requisition to request items or supplies.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Requisition
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Requisitions</CardTitle>
            <CardDescription>
              View and manage all your requisition requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRequisitions.map((requisition) => (
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
                    <TableCell>{requisition.items?.length || 0} items</TableCell>
                    <TableCell>
                      {requisition.totalEstimatedAmount
                        ? `${requisition.currency} ${requisition.totalEstimatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(requisition.status)} className="flex items-center gap-1 w-fit">
                        {statusIcon(requisition.status)}
                        <span className="capitalize">{requisition.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {((requisition as any).createdAt?.toDate
                        ? format((requisition as any).createdAt.toDate(), 'PPP')
                        : requisition.requestedAt?.toDate
                        ? format(requisition.requestedAt.toDate(), 'PPP')
                        : 'N/A')}
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
                        {requisition.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubmitRequisition(requisition.id)}
                            >
                              Submit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRequisition(requisition.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {requisition.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/requisitions/${requisition.id}`)}
                          >
                            Resubmit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

