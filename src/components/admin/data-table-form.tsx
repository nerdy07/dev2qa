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
import { useToast } from '@/hooks/use-toast';

interface DataTableFormProps {
  entity?: { id: string; name: string };
  entityName: string;
  onSuccess: () => void;
}

export function DataTableForm({ entity, entityName, onSuccess }: DataTableFormProps) {
  const { toast } = useToast();
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real app, you'd call a server action here.
    console.log(values);
    toast({
      title: isEditing ? `${entityName} Updated` : `${entityName} Created`,
      description: `The ${entityName.toLowerCase()} "${values.name}" has been successfully ${isEditing ? 'updated' : 'created'}.`,
    });
    onSuccess();
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
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? 'Save Changes' : `Create ${entityName}`}</Button>
        </div>
      </form>
    </Form>
  );
}
