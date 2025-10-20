
'use client';

import { useForm, Controller } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { Role } from '@/lib/types';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Role name must be at least 2 characters.' }),
  permissions: z.array(z.string()).min(1, { message: 'A role must have at least one permission.' }),
});

interface RoleFormProps {
  role?: Role;
  onSave: (values: Omit<Role, 'id'>) => Promise<boolean>;
  onCancel: () => void;
}

export function RoleForm({ role, onSave, onCancel }: RoleFormProps) {
  const isEditing = !!role;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: role?.name || '',
      permissions: role?.permissions || [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await onSave(values);
  }

  // Group permissions by module (the part before the colon)
  const groupedPermissions = Object.values(ALL_PERMISSIONS).reduce((acc, module) => {
    Object.values(module).forEach(permission => {
      const moduleName = permission.split(':')[0];
      if (!acc[moduleName]) {
        acc[moduleName] = [];
      }
      acc[moduleName].push(permission);
    });
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Branch Manager" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Permissions</FormLabel>
                <FormDescription>
                  Select the permissions this role should have.
                </FormDescription>
              </div>
              <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([moduleName, permissions]) => (
                    <div key={moduleName}>
                      <h4 className="font-medium capitalize mb-2">{moduleName.replace(/_/g, ' ')}</h4>
                      <Separator className="mb-3" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {permissions.map((permission) => (
                          <FormField
                            key={permission}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={permission}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permission)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, permission])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== permission
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">
                                    {permission.split(':')[1].replace(/_/g, ' ')}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Role')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
