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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { BonusType } from '@/lib/types';
import { setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  amount: z.coerce.number().min(0, 'Amount must be 0 or greater.'),
  currency: z.enum(['NGN', 'PERCENTAGE'], { required_error: 'Please select a currency type.' }),
});

interface BonusTypeFormProps {
  type?: BonusType;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BonusTypeForm({ type, onSuccess, onCancel }: BonusTypeFormProps) {
  const { toast } = useToast();
  const isEditing = !!type;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type?.name || '',
      amount: type?.amount ?? 0,
      currency: type?.currency || 'NGN',
    },
  });

  const currency = form.watch('currency');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db) {
      toast({ title: 'Database not available', variant: 'destructive' });
      return;
    }

    try {
      const typeId = type?.id || doc(collection(db, 'bonusTypes')).id;
      const typeRef = doc(db, 'bonusTypes', typeId);

      const typeData: Omit<BonusType, 'id'> = {
        name: values.name,
        amount: values.amount,
        currency: values.currency,
        updatedAt: serverTimestamp(),
      };

      if (!isEditing) {
        typeData.createdAt = serverTimestamp();
      }

      await setDoc(typeRef, typeData, { merge: true });

      toast({
        title: isEditing ? 'Bonus Type Updated' : 'Bonus Type Created',
        description: `The bonus type "${values.name}" has been ${isEditing ? 'updated' : 'created'}.`,
      });

      onSuccess();
    } catch (err) {
      const error = err as Error;
      console.error('Error saving bonus type:', error);
      toast({
        title: 'Operation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bonus Type Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Exceeding KPIs consistently for 2 review cycles" {...field} />
              </FormControl>
              <FormDescription>
                Enter a clear description of the bonus type.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NGN">NGN (Fixed Amount)</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose whether this is a fixed amount or a percentage of salary.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {currency === 'PERCENTAGE' ? 'Percentage' : 'Amount (NGN)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step={currency === 'PERCENTAGE' ? '0.1' : '1'}
                    placeholder={currency === 'PERCENTAGE' ? 'e.g., 10' : 'e.g., 5000'}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {currency === 'PERCENTAGE'
                    ? 'Enter the percentage of monthly salary (e.g., 10 for 10%)'
                    : 'Enter the fixed amount in NGN. Set to 0 for variable/discretionary bonuses.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

