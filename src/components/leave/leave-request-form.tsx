'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { DateRange } from 'react-day-picker';
import { differenceInCalendarDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { LEAVE_TYPES } from '@/lib/constants';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifyAdminsOnLeaveRequest } from '@/app/requests/actions';

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
    if (!currentUser) {
      toast({ title: 'Not Authenticated', variant: 'destructive' });
      return;
    }

    const daysCount = differenceInCalendarDays(values.dates.to, values.dates.from) + 1;
    if (daysCount <= 0) {
        toast({ title: 'Invalid Date Range', description: 'The leave must be for at least one day.', variant: 'destructive' });
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
      
      const docRef = await addDoc(collection(db!, 'leaveRequests'), leaveData);
      
      await notifyAdminsOnLeaveRequest({ id: docRef.id, ...leaveData });

      toast({
        title: 'Leave Request Submitted',
        description: `Your request for ${daysCount} day(s) off has been sent for approval.`,
      });
      onSuccess();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({ title: 'Operation Failed', description: 'Could not submit your leave request.', variant: 'destructive' });
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
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start & End Date</FormLabel>
              <DateRangePicker
                date={field.value}
                setDate={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
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
