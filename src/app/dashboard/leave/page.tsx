'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, TriangleAlert, CalendarDays, CalendarCheck, CalendarClock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/hooks/use-collection';
import type { LeaveRequest } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { query, where, collection, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, getYear } from 'date-fns';
import { LeaveRequestForm } from '@/components/leave/leave-request-form';
import { StatCard } from '@/components/dashboard/stat-card';

export default function MyLeavePage() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const leaveQuery = React.useMemo(() => {
    if (!user?.id) return undefined;
    const currentYear = getYear(new Date());
    // This query fetches all leave requests for the user, sorted by date.
    // Filtering for the current year will happen on the client-side for the calculation.
    return query(
      collection(db!, 'leaveRequests'),
      where('userId', '==', user.id),
      orderBy('requestedAt', 'desc')
    );
  }, [user?.id]);

  const { data: leaveRequests, loading, error } = useCollection<LeaveRequest>('leaveRequests', leaveQuery);

  const leaveStats = React.useMemo(() => {
    const totalEntitlement = user?.annualLeaveEntitlement || 0;
    if (!leaveRequests) {
      return { totalEntitlement, leaveTaken: 0, leaveRemaining: totalEntitlement };
    }
    const currentYear = getYear(new Date());
    const leaveTaken = leaveRequests
      .filter(req => 
        req.status === 'approved' && 
        req.leaveType === 'Annual Leave' &&
        getYear(req.startDate.toDate()) === currentYear
      )
      .reduce((acc, req) => acc + req.daysCount, 0);
    
    const leaveRemaining = totalEntitlement - leaveTaken;

    return { totalEntitlement, leaveTaken, leaveRemaining };
  }, [leaveRequests, user?.annualLeaveEntitlement]);

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
  
  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-12" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5}>
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Leave History</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {leaveRequests && leaveRequests.length > 0 ? (
          leaveRequests.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-medium">{req.leaveType}</TableCell>
              <TableCell>
                {format(req.startDate.toDate(), 'PPP')} - {format(req.endDate.toDate(), 'PPP')}
              </TableCell>
              <TableCell>{req.daysCount}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(req.status)} className="capitalize">{req.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                  {req.status === 'pending' && req.reason}
                  {req.status === 'approved' && req.reviewedByName && `Approved by ${req.reviewedByName}`}
                  {req.status === 'rejected' && (
                    <span className="text-destructive">
                      {req.rejectionReason}
                    </span>
                  )}
                  {!req.reason && !req.rejectionReason && '-'}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              You haven't requested any leave yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    );
  };

  return (
    <>
      <PageHeader
        title="My Leave"
        description="Request time off and view your leave history and balance."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
            </DialogHeader>
            <LeaveRequestForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatCard title="Annual Entitlement" value={`${leaveStats.totalEntitlement} days`} icon={CalendarDays} />
        <StatCard title="Leave Taken (This Year)" value={`${leaveStats.leaveTaken} days`} icon={CalendarCheck} />
        <StatCard title="Leave Remaining" value={`${leaveStats.leaveRemaining} days`} icon={CalendarClock} />
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Leave History</CardTitle>
            <CardDescription>A log of all your past and pending leave requests.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                </TableRow>
            </TableHeader>
            {renderContent()}
            </Table>
        </CardContent>
      </Card>
    </>
  );
}
