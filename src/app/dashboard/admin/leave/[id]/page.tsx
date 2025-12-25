'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { CheckCircle, ThumbsDown, Calendar, User, Clock, FileText, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useDocument } from '@/hooks/use-collection';
import type { LeaveRequest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { eachDayOfInterval } from 'date-fns';

export default function LeaveRequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const { data: leaveRequest, loading, error } = useDocument<LeaveRequest>('leaveRequests', id as string);

  // Calculate all dates in the leave range
  const leaveDates = React.useMemo(() => {
    if (!leaveRequest?.startDate || !leaveRequest?.endDate) return [];
    const start = leaveRequest.startDate.toDate();
    const end = leaveRequest.endDate.toDate();
    return eachDayOfInterval({ start, end });
  }, [leaveRequest]);

  // Custom modifiers for calendar highlighting
  const modifiers = React.useMemo(() => {
    if (leaveDates.length === 0) return {};
    return {
      leave: leaveDates,
    };
  }, [leaveDates]);

  const modifiersClassNames = React.useMemo(() => {
    return {
      leave: 'bg-primary/20 text-primary font-semibold border-2 border-primary',
    };
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader
          title="Leave Request Details"
          description="View complete leave request information."
        >
          <BackButton />
        </PageHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-64 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (error || !leaveRequest) {
    return (
      <>
        <PageHeader
          title="Leave Request Details"
          description="View complete leave request information."
        >
          <BackButton />
        </PageHeader>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || 'Leave request not found.'}
          </AlertDescription>
        </Alert>
      </>
    );
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

  const statusIcon = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const startDate = leaveRequest.startDate?.toDate();
  const endDate = leaveRequest.endDate?.toDate();
  const requestedAt = leaveRequest.requestedAt?.toDate();
  const reviewedAt = leaveRequest.reviewedAt?.toDate();

  return (
    <>
      <PageHeader
        title="Leave Request Details"
        description="View complete leave request information."
      >
        <BackButton />
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Request Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Request Information</CardTitle>
                <Badge variant={statusVariant(leaveRequest.status)} className="flex items-center gap-1.5">
                  {statusIcon(leaveRequest.status)}
                  {leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Employee</p>
                  <p className="text-base font-semibold">{leaveRequest.userName}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Leave Type</p>
                  <p className="text-base font-semibold">{leaveRequest.leaveType}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                  <p className="text-base font-semibold">
                    {startDate && endDate
                      ? `${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {leaveRequest.daysCount} {leaveRequest.daysCount === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Requested At</p>
                  <p className="text-base font-semibold">
                    {requestedAt ? format(requestedAt, 'PPP p') : 'N/A'}
                  </p>
                </div>
              </div>

              {leaveRequest.status !== 'pending' && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Reviewed By</p>
                      <p className="text-base font-semibold">{leaveRequest.reviewedByName || 'N/A'}</p>
                      {reviewedAt && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(reviewedAt, 'PPP p')}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {leaveRequest.status === 'rejected' && leaveRequest.rejectionReason && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Rejection Reason</p>
                      <p className="text-base text-destructive">{leaveRequest.rejectionReason}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reason for Leave</CardTitle>
              <CardDescription>The complete reason provided by the employee.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-base whitespace-pre-wrap leading-relaxed">
                  {leaveRequest.reason || 'No reason provided.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Calendar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Dates</CardTitle>
              <CardDescription>
                The highlighted dates on the calendar show the requested leave period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {startDate && endDate ? (
                <div className="flex justify-center">
                  <CalendarComponent
                    mode="range"
                    defaultMonth={startDate}
                    selected={{ from: startDate, to: endDate }}
                    className="rounded-md border"
                    disabled
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                    classNames={{
                      day_range_start: 'bg-primary text-primary-foreground font-semibold',
                      day_range_end: 'bg-primary text-primary-foreground font-semibold',
                      day_range_middle: 'bg-primary/20 text-primary font-semibold',
                    }}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Date information not available.</p>
              )}
            </CardContent>
          </Card>

          {leaveRequest.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/admin/leave?tab=pending`)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Back to Leave Management
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

