
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
import type { BonusType } from '@/lib/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '../ui/input';
import { sendBonusNotification } from '@/app/requests/actions';

const formSchema = z.object({
  userId: z.string({ required_error: 'Please select a user.' }),
  bonusType: z.string({ required_error: 'Please select a bonus type.' }),
  amount: z.coerce.number().min(0, 'Amount cannot be negative.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
});

interface BonusFormProps {
  onSuccess: () => void;
}

export function BonusForm({ onSuccess }: BonusFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: bonusTypes, loading: typesLoading } = useCollection<BonusType>('bonusTypes');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        amount: 0,
    }
  });

  const selectedBonusTypeName = form.watch('bonusType');
  const selectedBonusType = bonusTypes?.find(b => b.name === selectedBonusTypeName);

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
    
    if (!selectedBonusType) {
        toast({ title: 'Invalid Bonus Type', variant: 'destructive' });
        return;
    }

    try {
      const bonusData = {
        userId: selectedUser.id,
        userName: selectedUser.name,
        bonusType: values.bonusType,
        description: values.description,
        amount: selectedBonusType.currency === 'PERCENTAGE' ? selectedBonusType.amount : values.amount,
        currency: selectedBonusType.currency as 'NGN' | 'PERCENTAGE',
        dateIssued: serverTimestamp(),
        issuedById: currentUser.id,
        issuedByName: currentUser.name,
      };

      await addDoc(collection(db, 'bonuses'), bonusData);
      
      // Create in-app notification
      const { createInAppNotification } = await import('@/lib/notifications');
      await createInAppNotification({
        userId: selectedUser.id,
        type: 'general',
        title: 'Bonus Issued',
        message: `You have been issued a bonus: ${values.bonusType}${values.description ? ` - ${values.description}` : ''}`,
        read: false,
      });
      
      const emailResult = await sendBonusNotification({
        recipientEmail: selectedUser.email,
        userName: selectedUser.name,
        bonusType: values.bonusType,
        description: values.description
      });

      toast({
        title: 'Bonus Issued',
        description: `A bonus has been recorded for ${selectedUser.name}.`,
      });
      if (!emailResult.success) {
        toast({ title: 'Email Failed', description: emailResult.error, variant: 'destructive' });
      }

      onSuccess();
    } catch (err) {
      const error = err as Error;
      console.error('Error issuing bonus:', error);
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
                    <SelectValue placeholder="Select a user to issue a bonus to" />
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
          name="bonusType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bonus Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of bonus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {typesLoading ? (
                    <SelectItem value="loading" disabled>Loading types...</SelectItem>
                  ) : bonusTypes && bonusTypes.length > 0 ? (
                    bonusTypes.map(bonus => (
                      <SelectItem key={bonus.id} value={bonus.name}>
                        {bonus.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No bonus types available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedBonusType && (
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedBonusType.currency === 'PERCENTAGE' ? 'Bonus Percentage' : 'Bonus Amount (NGN)'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        {...field} 
                        disabled={selectedBonusType.currency === 'PERCENTAGE' && selectedBonusType.amount > 0}
                        value={selectedBonusType.currency === 'PERCENTAGE' ? selectedBonusType.amount : field.value}
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedBonusType.currency === 'PERCENTAGE' ? 'This is a percentage of the monthly pay.' : 'Enter the spot bonus amount.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description / Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide specific details about the achievement being rewarded."
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
            {form.formState.isSubmitting ? 'Issuing...' : 'Issue Bonus'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    