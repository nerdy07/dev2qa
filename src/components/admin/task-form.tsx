
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
import { notifyOnTaskAssignment } from '@/app/requests/actions';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  status: z.enum(['To Do', 'In Progress', 'Done']),
  assigneeId: z.string().optional(),
});

interface TaskFormProps {
  task: Task;
  milestoneId: string;
  milestoneName: string; // Pass milestone and project names for the email
  projectName: string;
  milestoneIsActive?: boolean; // Whether the milestone is an active sprint
  onSave: (updatedTask: Task, milestoneId: string) => Promise<boolean>;
  onCancel: () => void;
}

export function TaskForm({ task, milestoneId, milestoneName, projectName, milestoneIsActive = false, onSave, onCancel }: TaskFormProps) {
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: task.status,
      assigneeId: task.assigneeId || 'unassigned',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedUserId = values.assigneeId === 'unassigned' ? undefined : values.assigneeId;
    const selectedUser = users?.find(u => u.id === selectedUserId);
    
    const updatedTask: Task = {
        ...task,
        status: values.status,
        assigneeId: selectedUser?.id,
        assigneeName: selectedUser?.name || '',
    };
    
    const wasJustAssigned = !task.assigneeId && selectedUser;
    const wasReassigned = task.assigneeId && task.assigneeId !== selectedUser?.id && selectedUser;
    // Send email if: task was just assigned OR task was reassigned in an active sprint
    const shouldSendEmail = selectedUser && (wasJustAssigned || (wasReassigned && milestoneIsActive));

    const success = await onSave(updatedTask, milestoneId);

    if (success && shouldSendEmail && selectedUser) {
        const emailResult = await notifyOnTaskAssignment({
            recipientEmail: selectedUser.email,
            assigneeName: selectedUser.name,
            taskName: updatedTask.name,
            milestoneName: milestoneName,
            projectName: projectName,
        });

        if (emailResult.success) {
            toast({
                title: "User Notified",
                description: `${selectedUser.name} has been notified of their assignment${milestoneIsActive ? ' in the active sprint' : ''}.`
            })
        } else {
            toast({
                title: "Notification Failed",
                description: emailResult.error,
                variant: "destructive",
            })
        }
    }
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
