
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useCollection } from '@/hooks/use-collection';
import type { InfractionType } from '@/lib/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendInfractionNotification } from '@/app/requests/actions';

const formSchema = z.object({
  userId: z.string({ required_error: 'Please select a user.' }),
  infractionType: z.string({ required_error: 'Please select an infraction type.' }),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
});

interface InfractionFormProps {
  onSuccess: () => void;
}

export function InfractionForm({ onSuccess }: InfractionFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: infractionTypes, loading: typesLoading } = useCollection<InfractionType>('infractionTypes');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser || !db) {
      toast({ title: 'Not Authenticated or Database not available', variant: 'destructive' });
      return;
    }

    const selectedUser = users?.find(u => u.id === values.userId);
    if (!selectedUser) {
        toast({ title: 'Invalid User', description: 'The selected user could not be found.', variant: 'destructive' });
        return;
    }
    
    const selectedInfraction = infractionTypes?.find(i => i.name === values.infractionType);
    if (!selectedInfraction) {
        toast({ title: 'Invalid Infraction Type', variant: 'destructive' });
        return;
    }

    try {
      const infractionData = {
        userId: selectedUser.id,
        userName: selectedUser.name,
        infractionType: values.infractionType,
        description: values.description,
        deductionPercentage: selectedInfraction.deduction,
        dateIssued: serverTimestamp(),
        issuedById: currentUser.id,
        issuedByName: currentUser.name,
      };

      await addDoc(collection(db, 'infractions'), infractionData);
      
      // Create in-app notification
      const { createInAppNotification } = await import('@/lib/notifications');
      await createInAppNotification({
        userId: selectedUser.id,
        type: 'general',
        title: 'Infraction Issued',
        message: `An infraction has been issued: ${values.infractionType}${values.description ? ` - ${values.description}` : ''}`,
        read: false,
      });
      
      const emailResult = await sendInfractionNotification({
          recipientEmail: selectedUser.email,
          userName: selectedUser.name,
          infractionType: values.infractionType,
          description: values.description
      });


      toast({
        title: 'Infraction Issued',
        description: `An infraction has been recorded for ${selectedUser.name}.`,
      });
      if (!emailResult.success) {
          toast({ title: 'Email Failed', description: emailResult.error, variant: 'destructive' });
      }
      onSuccess();
    } catch (err) {
      const error = err as Error;
      console.error('Error issuing infraction:', error);
      toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select User</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={usersLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user to issue an infraction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="infractionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Infraction Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of infraction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {typesLoading ? (
                    <SelectItem value="loading" disabled>Loading types...</SelectItem>
                  ) : infractionTypes && infractionTypes.length > 0 ? (
                    infractionTypes.map(infraction => (
                      <SelectItem key={infraction.id} value={infraction.name}>
                        {infraction.name} ({infraction.deduction > 0 ? `${infraction.deduction}%` : 'Note'})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No infraction types available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description / Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide specific details about the infraction, e.g., date of occurrence, context, etc."
                  {...field}
                />
              </FormControl>
              <FormDescription>This information will be visible to the user.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
            {form.formState.isSubmitting ? 'Issuing...' : 'Issue Infraction'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    