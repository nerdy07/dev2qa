
'use client';

import React from 'react';
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
import { ALL_PERMISSIONS, ADMIN_PERMISSION_GROUPS, getPermissionsFromAdminGroups } from '@/lib/roles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Role name must be at least 2 characters.' }),
  permissions: z.array(z.string()).min(1, { message: 'A role must have at least one permission.' }),
  adminGroups: z.array(z.string()).optional(), // For admin roles with granular groups
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
      adminGroups: [],
    },
  });

  // Watch form values for admin role detection
  const roleName = form.watch('name');
  const permissions = form.watch('permissions');
  
  // Detect if this is an admin role (name contains 'admin' or has admin permissions)
  const isAdminRole = React.useMemo(() => {
    const nameLower = roleName.toLowerCase();
    return nameLower.includes('admin') || 
           permissions.some(p => p.startsWith('admin:') || p.startsWith('users:') || p.startsWith('roles:'));
  }, [roleName, permissions]);

  // Reset form when role changes (for editing)
  React.useEffect(() => {
    if (role) {
      // Try to detect admin groups from permissions
      const detectedGroups: string[] = [];
      Object.entries(ADMIN_PERMISSION_GROUPS).forEach(([groupKey, group]) => {
        const hasAllPermissions = group.permissions.every(perm => role.permissions.includes(perm));
        if (hasAllPermissions && group.permissions.length > 0) {
          detectedGroups.push(groupKey);
        }
      });
      
      form.reset({
        name: role.name || '',
        permissions: role.permissions || [],
        adminGroups: detectedGroups,
      });
    }
  }, [role, form]);

  // Sync admin groups with permissions
  const handleAdminGroupChange = (groupKey: string, checked: boolean) => {
    const currentGroups = form.getValues('adminGroups') || [];
    const newGroups = checked
      ? [...currentGroups, groupKey]
      : currentGroups.filter(g => g !== groupKey);
    
    form.setValue('adminGroups', newGroups);
    
    // Get permissions from selected groups
    const groupPermissions = getPermissionsFromAdminGroups(newGroups);
    const currentPermissions = form.getValues('permissions') || [];
    
    if (checked) {
      // Add group permissions
      const allPermissions = [...new Set([...currentPermissions, ...groupPermissions])];
      form.setValue('permissions', allPermissions);
    } else {
      // Remove only the permissions that are exclusive to this group
      const groupPermSet = new Set(groupPermissions);
      const remainingPermissions = currentPermissions.filter(p => !groupPermSet.has(p));
      form.setValue('permissions', remainingPermissions);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Only save name and permissions, adminGroups is just for UI convenience
    await onSave({
      name: values.name,
      permissions: values.permissions,
    });
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
                  {isAdminRole 
                    ? 'Select admin permission groups or individual permissions below.'
                    : 'Select the permissions this role should have.'}
                </FormDescription>
              </div>
              
              {isAdminRole && (
                <div className="mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Admin Permission Groups</CardTitle>
                      <CardDescription className="text-xs">
                        Select permission groups for easier management. Individual permissions can be selected below.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(ADMIN_PERMISSION_GROUPS).map(([groupKey, group]) => {
                          const selectedGroups = form.watch('adminGroups') || [];
                          const isSelected = selectedGroups.includes(groupKey);
                          
                          return (
                            <div key={groupKey} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent">
                              <FormControl>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    handleAdminGroupChange(groupKey, checked as boolean);
                                  }}
                                />
                              </FormControl>
                              <div className="flex-1">
                                <FormLabel className="font-medium text-sm cursor-pointer">
                                  {group.label}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {group.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  ({group.permissions.length} permissions)
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">All Permissions</TabsTrigger>
                  <TabsTrigger value="selected">Selected Only</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
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
                </TabsContent>
                <TabsContent value="selected" className="mt-4">
                  <ScrollArea className="h-72 w-full rounded-md border p-4">
                    <div className="space-y-4">
                      {(() => {
                        const selectedPerms = form.watch('permissions') || [];
                        const selectedGrouped = Object.entries(groupedPermissions)
                          .map(([moduleName, permissions]) => ({
                            moduleName,
                            permissions: permissions.filter(p => selectedPerms.includes(p))
                          }))
                          .filter(({ permissions }) => permissions.length > 0);
                        
                        if (selectedGrouped.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No permissions selected yet</p>
                            </div>
                          );
                        }
                        
                        return selectedGrouped.map(({ moduleName, permissions }) => (
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
                        ));
                      })()}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
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
