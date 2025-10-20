
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection } from '@/hooks/use-collection';
import type { Task, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const formSchema = z.object({
  status: z.enum(['To Do', 'In Progress', 'Done']),
  assigneeId: z.string().optional(),
});

interface TaskFormProps {
  task: Task;
  milestoneId: string;
  onSave: (updatedTask: Task, milestoneId: string) => Promise<boolean>;
  onCancel: () => void;
}

export function TaskForm({ task, milestoneId, onSave, onCancel }: TaskFormProps) {
  const { data: users, loading: usersLoading } = useCollection<User>('users');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: task.status,
      assigneeId: task.assigneeId || undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedUser = users?.find(u => u.id === values.assigneeId);
    
    const updatedTask: Task = {
        ...task,
        status: values.status,
        assigneeId: selectedUser?.id,
        assigneeName: selectedUser?.name || '',
    };
    
    await onSave(updatedTask, milestoneId);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign To</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={usersLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user to assign the task" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users?.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={user.photoURL} alt={user.name} />
                                    <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>{user.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
