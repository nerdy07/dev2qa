'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface DataTableFormProps {
  entity?: { id: string; name: string };
  entityName: string;
  onSave: (name: string) => Promise<boolean>;
  onCancel: () => void;
}

export function DataTableForm({ entity, entityName, onSave, onCancel }: DataTableFormProps) {
  const isEditing = !!entity;

  const formSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: entity?.name || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onSave(values.name);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityName} Name</FormLabel>
              <FormControl>
                <Input placeholder={`Enter ${entityName.toLowerCase()} name`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : `Create ${entityName}`)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
