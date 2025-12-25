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
import { useToast } from '@/hooks/use-toast';
import type { InfractionType } from '@/lib/types';
import { setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  deduction: z.coerce.number().min(0, 'Deduction must be 0 or greater.').max(100, 'Deduction cannot exceed 100%.'),
});

interface InfractionTypeFormProps {
  type?: InfractionType;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InfractionTypeForm({ type, onSuccess, onCancel }: InfractionTypeFormProps) {
  const { toast } = useToast();
  const isEditing = !!type;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type?.name || '',
      deduction: type?.deduction ?? 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db) {
      toast({ title: 'Database not available', variant: 'destructive' });
      return;
    }

    try {
      const typeId = type?.id || doc(collection(db, 'infractionTypes')).id;
      const typeRef = doc(db, 'infractionTypes', typeId);

      const typeData: Omit<InfractionType, 'id'> = {
        name: values.name,
        deduction: values.deduction,
        updatedAt: serverTimestamp(),
      };

      if (!isEditing) {
        typeData.createdAt = serverTimestamp();
      }

      await setDoc(typeRef, typeData, { merge: true });

      toast({
        title: isEditing ? 'Infraction Type Updated' : 'Infraction Type Created',
        description: `The infraction type "${values.name}" has been ${isEditing ? 'updated' : 'created'}.`,
      });

      onSuccess();
    } catch (err) {
      const error = err as Error;
      console.error('Error saving infraction type:', error);
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
              <FormLabel>Infraction Type Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Absence from company-wide cadence call without notice" {...field} />
              </FormControl>
              <FormDescription>
                Enter a clear description of the infraction type.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deduction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deduction Percentage</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the percentage deduction for this infraction (0-100). Set to 0 for note-only infractions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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

