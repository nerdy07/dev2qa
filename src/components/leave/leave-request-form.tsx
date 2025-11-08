'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { DateRange } from 'react-day-picker';
import { differenceInCalendarDays, getYear } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { LEAVE_TYPES } from '@/lib/constants';
import { addDoc, collection, getDocs, query, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifyAdminsOnLeaveRequest } from '@/app/requests/actions';
import { User, LeaveRequest } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';

const formSchema = z.object({
  leaveType: z.string({ required_error: 'Please select a leave type.' }),
  dates: z.object({
    from: z.date({ required_error: 'Please select a start date.' }),
    to: z.date({ required_error: 'Please select an end date.' }),
  }).refine(data => data.from <= data.to, {
    message: "End date cannot be before start date.",
    path: ["to"],
  }),
  reason: z.string().min(10, 'Reason must be at least 10 characters.'),
});

interface LeaveRequestFormProps {
  onSuccess: () => void;
}

export function LeaveRequestForm({ onSuccess }: LeaveRequestFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Get user's leave requests to calculate remaining entitlement
  const leaveRequestsQuery = React.useMemo(() => {
    if (!currentUser?.id) return null;
    return query(
      collection(db!, 'leaveRequests'),
      where('userId', '==', currentUser.id),
      orderBy('requestedAt', 'desc')
    );
  }, [currentUser?.id]);
  
  const { data: userLeaveRequests } = useCollection<LeaveRequest>('leaveRequests', leaveRequestsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: '',
      dates: {
        from: undefined,
        to: undefined,
      },
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser || !db) {
      toast({ title: 'Not Authenticated or Database not available', variant: 'destructive' });
      return;
    }

    const daysCount = differenceInCalendarDays(values.dates.to, values.dates.from) + 1;
    if (daysCount <= 0) {
        toast({ title: 'Invalid Date Range', description: 'The leave must be for at least one day.', variant: 'destructive' });
        return;
    }

    // Check leave entitlement
    const totalEntitlement = currentUser.annualLeaveEntitlement || 0;
    const currentYear = getYear(new Date());
    
    // Calculate leave taken this year (approved requests, excluding unpaid leave)
    const leaveTaken = userLeaveRequests
      ?.filter(req => {
        const requestYear = req.startDate?.toDate?.()?.getFullYear();
        return req.status === 'approved' && 
               requestYear === currentYear && 
               req.leaveType !== 'Unpaid Leave';
      })
      .reduce((acc, req) => acc + (req.daysCount || 0), 0) || 0;
    
    const leaveRemaining = totalEntitlement - leaveTaken;
    
    if (daysCount > leaveRemaining && values.leaveType !== 'Unpaid Leave') {
      toast({
        title: 'Insufficient Leave Balance',
        description: `You have ${leaveRemaining} days remaining out of ${totalEntitlement} days. You cannot request ${daysCount} days.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const leaveData = {
        userId: currentUser.id,
        userName: currentUser.name,
        leaveType: values.leaveType,
        startDate: values.dates.from,
        endDate: values.dates.to,
        reason: values.reason,
        daysCount: daysCount,
        status: 'pending' as const,
        requestedAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'leaveRequests'), leaveData);

      // Notify Admins
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnapshot = await getDocs(adminQuery);
      const adminEmails = adminSnapshot.docs.map(doc => (doc.data() as User).email);
      
      const emailResult = await notifyAdminsOnLeaveRequest({ 
        adminEmails,
        userName: currentUser.name,
        leaveType: values.leaveType,
        startDate: values.dates.from.toISOString(),
        endDate: values.dates.to.toISOString(),
        daysCount,
        reason: values.reason,
      });

      toast({
        title: 'Leave Request Submitted',
        description: `Your request for ${daysCount} day(s) off has been sent for approval.`,
      });
      if (!emailResult.success) {
        toast({ title: 'Admin Notification Failed', description: emailResult.error, variant: 'destructive' });
      }

      onSuccess();
    } catch (err) {
      const error = err as Error;
      console.error('Error submitting leave request:', error);
      toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="leaveType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of leave" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LEAVE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dates"
          render={({ field }) => {
            const daysCount = field.value?.from && field.value?.to 
              ? differenceInCalendarDays(field.value.to, field.value.from) + 1 
              : 0;
            
            // Calculate remaining leave
            const totalEntitlement = currentUser?.annualLeaveEntitlement || 0;
            const currentYear = getYear(new Date());
            const leaveTaken = userLeaveRequests
              ?.filter(req => {
                const requestYear = req.startDate?.toDate?.()?.getFullYear();
                return req.status === 'approved' && 
                       requestYear === currentYear && 
                       req.leaveType !== 'Unpaid Leave';
              })
              .reduce((acc, req) => acc + (req.daysCount || 0), 0) || 0;
            const leaveRemaining = totalEntitlement - leaveTaken;
            
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Start & End Date</FormLabel>
                <DateRangePicker
                  date={field.value}
                  setDate={field.onChange}
                />
                {field.value?.from && field.value?.to && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Selected: {daysCount} day{daysCount !== 1 ? 's' : ''}
                    </p>
                    {totalEntitlement > 0 && (
                      <p className={`text-xs ${leaveRemaining < daysCount ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        Remaining: {leaveRemaining} / {totalEntitlement} days
                        {leaveRemaining < daysCount && ' (Insufficient balance - unpaid leave may be available)'}
                      </p>
                    )}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Leave</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief reason for your leave request..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    