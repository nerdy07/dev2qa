
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { createUser } from '@/app/actions/user-actions';


const formSchemaBase = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Invalid email address.' }),
    role: z.enum(['requester', 'qa_tester', 'admin'], { required_error: 'Please select a role.' }),
    expertise: z.string().optional(),
    baseSalary: z.coerce.number().min(0, 'Salary must be a positive number.').optional(),
    annualLeaveEntitlement: z.coerce.number().min(0, 'Leave must be a positive number.').default(20),
});
  
const createFormSchema = formSchemaBase.extend({
    password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

const editFormSchema = formSchemaBase;

interface UserFormProps {
  user?: User;
  onSuccess: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const isEditing = !!user;

  const formSchema = isEditing ? editFormSchema : createFormSchema;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'requester',
      password: '',
      expertise: user?.expertise || '',
      baseSalary: user?.baseSalary || 0,
      annualLeaveEntitlement: user?.annualLeaveEntitlement ?? 20,
    },
  });

  const role = form.watch('role');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        if (isEditing && user) {
            // Server action for updating a user
            const response = await fetch(`/api/users/${user.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            });

            const result = await response.json();
            if (!response.ok) {
              throw new Error(result.message || 'Failed to update user.');
            }
            
            toast({
                title: 'User Updated',
                description: `${values.name} has been successfully updated.`,
            });
        } else {
            // New server action for creating a user
            const result = await createUser(values);

            if (!result.success) {
              throw new Error(result.error);
            }
            
            toast({
                title: 'User Created',
                description: `${values.name} has been successfully created. A welcome email has been sent.`,
            });
        }
        onSuccess();
    } catch (error: any) {
        console.error('User form error:', error);
        toast({
            title: isEditing ? 'Update Failed' : 'Creation Failed',
            description: error.message,
            variant: 'destructive'
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="baseSalary"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Base Monthly Salary (NGN)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 150000" {...field} />
                </FormControl>
                <FormDescription>
                    Enter the user's gross monthly salary before deductions and bonuses.
                </FormDescription>
                <FormMessage />
            </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="annualLeaveEntitlement"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Annual Leave Entitlement (Days)</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 20" {...field} />
                </FormControl>
                <FormDescription>
                    The total number of paid annual leave days per year.
                </FormDescription>
                <FormMessage />
            </FormItem>
            )}
        />
        {!isEditing && 'password' in form.getValues() && (
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Temporary Password</FormLabel>
                    <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="requester">Requester</SelectItem>
                  <SelectItem value="qa_tester">QA Tester</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {role === 'qa_tester' && (
            <FormField
                control={form.control}
                name="expertise"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>QA Tester Expertise</FormLabel>
                    <FormControl>
                    <Textarea
                        placeholder="e.g., Frontend testing, E2E automation, Mobile (iOS/Android), API validation..."
                        {...field}
                    />
                    </FormControl>
                    <FormDescription>
                        This helps the AI suggest the best person for a request.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
