
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { User, Role } from '@/lib/types';
import { createUser } from '@/app/actions/user-actions';
import { useCollection } from '@/hooks/use-collection';
import React from 'react';
import { getPermissionsByCategory, getPermissionLabel } from '@/lib/permissions-helper';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';


const formSchemaBase = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100, { message: 'Name must be less than 100 characters.' }),
    email: z.string().email({ message: 'Invalid email address.' }).max(255, { message: 'Email must be less than 255 characters.' }),
    permissions: z.array(z.string()).min(1, { message: 'Please select at least one permission.' }),
    expertise: z.string().max(500, { message: 'Expertise must be less than 500 characters.' }).optional(),
    baseSalary: z.coerce.number().min(0, 'Salary must be a positive number.').max(100000000, 'Salary must be less than 100,000,000.').optional(),
    annualLeaveEntitlement: z.coerce.number().min(0, 'Leave must be a positive number.').max(365, 'Leave must be less than 365 days.').default(20),
    startDate: z.date().optional(),
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
  const [openCategories, setOpenCategories] = React.useState<Set<string>>(new Set());

  const formSchema = isEditing ? editFormSchema : createFormSchema;
  const permissionsByCategory = React.useMemo(() => getPermissionsByCategory(), []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      permissions: user?.permissions || ['profile:read'], // Default to profile:read for all users
      password: '',
      expertise: user?.expertise || '',
      baseSalary: user?.baseSalary || 0,
      annualLeaveEntitlement: user?.annualLeaveEntitlement ?? 20,
    },
  });

  // Initialize open categories when editing existing user
  React.useEffect(() => {
    if (isEditing && user?.permissions) {
      // Open categories that contain at least one of the user's permissions
      const userPerms = new Set(user.permissions);
      const categoriesToOpen = new Set<string>();
      Object.entries(permissionsByCategory).forEach(([category, { permissions }]) => {
        if (permissions.some(perm => userPerms.has(perm))) {
          categoriesToOpen.add(category);
        }
      });
      setOpenCategories(categoriesToOpen);
    }
  }, [isEditing, user, permissionsByCategory]);

  const selectedPermissions = form.watch('permissions');
  const hasRequestApprovePermission = selectedPermissions.includes('requests:approve');

  const toggleCategory = (category: string) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
    }
    setOpenCategories(newOpen);
  };

  const togglePermission = (permission: string) => {
    const current = form.getValues('permissions');
    if (current.includes(permission)) {
      // Remove permission (but never remove profile:read)
      if (permission !== 'profile:read') {
        form.setValue('permissions', current.filter(p => p !== permission));
      }
    } else {
      // Add permission
      form.setValue('permissions', [...current, permission]);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        if (!values.permissions || values.permissions.length === 0) {
          throw new Error("Please select at least one permission.");
        }
        
        // Ensure profile:read is always included
        const permissions = values.permissions.includes('profile:read') 
          ? values.permissions 
          : ['profile:read', ...values.permissions];
        
        const submissionValues: any = { 
          ...values,
          permissions: permissions,
        };
        
        // Convert startDate to ISO string if it exists
        if (values.startDate) {
          submissionValues.startDate = values.startDate.toISOString();
        }

        if (isEditing && user) {
            // Server action for updating a user
            const response = await fetch(`/api/users/${user.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(submissionValues),
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
            const result = await createUser(submissionValues);

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
              <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
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
              <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
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
                <FormLabel>Base Monthly Salary (NGN) <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
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
                <FormLabel>Annual Leave Entitlement (Days) <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                <FormControl>
                    <Input type="number" placeholder="e.g., 20" {...field} />
                </FormControl>
                <FormDescription>
                    The total number of paid annual leave days per year. Defaults to 20 if not specified.
                </FormDescription>
                <FormMessage />
            </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => {
                // Handle both Date objects and Firestore Timestamps
                let dateValue = '';
                if (field.value) {
                  if (field.value instanceof Date) {
                    dateValue = field.value.toISOString().split('T')[0];
                  } else if (typeof field.value === 'string') {
                    dateValue = new Date(field.value).toISOString().split('T')[0];
                  } else if (field.value && typeof field.value === 'object' && 'toDate' in field.value) {
                    dateValue = (field.value as any).toDate().toISOString().split('T')[0];
                  }
                }
                
                return (
                    <FormItem>
                        <FormLabel>Employment Start Date <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                        <FormControl>
                            <Input
                                type="date"
                                value={dateValue}
                                onChange={(e) => {
                                    if (e.target.value) {
                                      const date = new Date(e.target.value);
                                      // Set time to noon to avoid timezone issues
                                      date.setHours(12, 0, 0, 0);
                                      field.onChange(date);
                                    } else {
                                      field.onChange(undefined);
                                    }
                                }}
                            />
                        </FormControl>
                        <FormDescription>
                            If the employee started mid-month, this date is used to calculate prorated salary. Leave empty if they started at the beginning of a month.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
        {!isEditing && 'password' in form.getValues() && (
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Temporary Password <span className="text-destructive">*</span></FormLabel>
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
          name="permissions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Permissions <span className="text-destructive">*</span></FormLabel>
                <FormDescription>
                  Select permissions for this user. Permissions are granular and can be assigned individually.
                </FormDescription>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-4">
                {Object.entries(permissionsByCategory).map(([category, { label, permissions }]) => {
                  const isOpen = openCategories.has(category);
                  const selectedCount = permissions.filter(p => selectedPermissions.includes(p)).length;
                  const allSelected = selectedCount === permissions.length;
                  const someSelected = selectedCount > 0 && selectedCount < permissions.length;
                  
                  return (
                    <Collapsible
                      key={category}
                      open={isOpen}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{label}</span>
                          {selectedCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({selectedCount}/{permissions.length})
                            </span>
                          )}
                        </div>
                        {allSelected && (
                          <Checkbox
                            checked={true}
                            onCheckedChange={(checked) => {
                              if (!checked) {
                                // Deselect all in this category
                                const newPerms = selectedPermissions.filter(p => !permissions.includes(p));
                                form.setValue('permissions', newPerms.length > 0 ? newPerms : ['profile:read']);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {!allSelected && (
                          <Checkbox
                            checked={someSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Select all in this category
                                const newPerms = [...new Set([...selectedPermissions, ...permissions])];
                                form.setValue('permissions', newPerms);
                              } else {
                                // Deselect all in this category
                                const newPerms = selectedPermissions.filter(p => !permissions.includes(p));
                                form.setValue('permissions', newPerms.length > 0 ? newPerms : ['profile:read']);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-6 pt-2 space-y-2">
                        {permissions.map((permission) => {
                          const isSelected = selectedPermissions.includes(permission);
                          const isProfileRead = permission === 'profile:read';
                          
                          return (
                            <div
                              key={permission}
                              className="flex items-start space-x-2 py-1"
                            >
                              <Checkbox
                                checked={isSelected}
                                disabled={isProfileRead}
                                onCheckedChange={() => togglePermission(permission)}
                                className="mt-1"
                              />
                              <label
                                className={`text-sm cursor-pointer flex-1 ${isProfileRead ? 'text-muted-foreground' : ''}`}
                                onClick={() => !isProfileRead && togglePermission(permission)}
                              >
                                <div className="font-medium">{getPermissionLabel(permission)}</div>
                                <div className="text-xs text-muted-foreground font-mono">{permission}</div>
                              </label>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {hasRequestApprovePermission && (
            <FormField
                control={form.control}
                name="expertise"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>QA Tester Expertise <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                    <Textarea
                        placeholder="e.g., Frontend testing, E2E automation, Mobile (iOS/Android), API validation..."
                        {...field}
                    />
                    </FormControl>
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
