
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, TriangleAlert, UserCheck, UserX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Role } from '@/lib/types';
import { UserForm } from '@/components/admin/user-form';
import { RoleForm } from '@/components/admin/role-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createUser } from '@/app/actions/user-actions';


type ActionType = 'delete' | 'deactivate' | 'activate';

function UsersTable() {
  const { data: users, loading, error, setData } = useCollection<User>('users');
  const { user: currentUser, sendPasswordReset } = useAuth();
  const { hasPermission } = usePermissions();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | undefined>(undefined);
  const [actionToConfirm, setActionToConfirm] = React.useState<ActionType | null>(null);
  const { toast } = useToast();

  const canCreate = hasPermission(ALL_PERMISSIONS.USERS.CREATE);
  const canUpdate = hasPermission(ALL_PERMISSIONS.USERS.UPDATE);
  const canDelete = hasPermission(ALL_PERMISSIONS.USERS.DELETE);


  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };
  
  const handleActionTrigger = (user: User, action: ActionType) => {
    setSelectedUser(user);
    setActionToConfirm(action);
    setIsAlertOpen(true);
  }

  const handleResetPassword = async (user: User) => {
    try {
        await sendPasswordReset(user.email);
        toast({
            title: 'Password Reset Email Sent',
            description: `A password reset link has been sent to ${user.email}.`,
        });
    } catch (err) {
        const error = err as Error;
        console.error("Error sending password reset email:", error);
        toast({
            title: 'Error Sending Reset Email',
            description: error.message,
            variant: 'destructive',
        });
    }
  }
  
  const confirmAction = async () => {
    if (!selectedUser || !actionToConfirm) return;

    let response;
    let successMessage = '';
    
    try {
        if (actionToConfirm === 'delete') {
            response = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
            successMessage = `${selectedUser.name}'s account has been permanently deleted.`;
        } else { // 'activate' or 'deactivate'
            const newStatus = actionToConfirm === 'deactivate';
            response = await fetch(`/api/users/${selectedUser.id}`, { 
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disabled: newStatus }) 
            });
            successMessage = `User ${selectedUser.name} has been ${newStatus ? 'deactivated' : 'activated'}.`;
        }
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'An unknown error occurred.');
        }

        toast({ title: 'Success', description: successMessage });
        
        if (users && setData) {
            if (actionToConfirm === 'delete') {
                setData(users.filter(u => u.id !== selectedUser.id));
            } else {
                setData(users.map(u => u.id === selectedUser.id ? { ...u, disabled: actionToConfirm === 'deactivate' } : u));
            }
        }
        
    } catch (err) {
        const error = err as Error;
        console.error(`Error performing action '${actionToConfirm}':`, error);
        toast({
            title: 'Action Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsAlertOpen(false);
        setSelectedUser(undefined);
        setActionToConfirm(null);
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedUser(undefined);
  };

  const roleVariant = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'qa_tester':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const getAlertDialogContent = () => {
    if (!selectedUser || !actionToConfirm) return null;

    const titles = {
        delete: 'Are you sure you want to delete this user?',
        deactivate: 'Are you sure you want to deactivate this user?',
        activate: 'Are you sure you want to activate this user?',
    };

    const descriptions = {
        delete: `This action cannot be undone. This will permanently delete the account for ${selectedUser.name} from both Authentication and Firestore.`,
        deactivate: `${selectedUser.name} will no longer be able to sign in.`,
        activate: `${selectedUser.name} will regain access to the application.`,
    };

    return {
        title: titles[actionToConfirm],
        description: descriptions[actionToConfirm],
    };
  }

  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5}>
                <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Error Loading Users</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      )
    }

    return (
      <TableBody>
        {users?.map((user) => (
          <TableRow key={user.id} className={cn(user.disabled && 'text-muted-foreground opacity-60')}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={roleVariant(user.role)} className="capitalize">{user.role.replace('_', ' ')}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={user.disabled ? 'destructive' : 'default'} className={cn(!user.disabled && "bg-green-500 hover:bg-green-500/90")}>
                {user.disabled ? 'Deactivated' : 'Active'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.id === currentUser?.id || !canUpdate}>
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {canUpdate && <DropdownMenuItem onClick={() => handleEdit(user)}>Edit User</DropdownMenuItem>}
                  {canUpdate && <DropdownMenuItem onClick={() => handleResetPassword(user)}>Send Password Reset</DropdownMenuItem>}
                  {(canUpdate || canDelete) && <DropdownMenuSeparator />}
                  {canUpdate && (user.disabled ? (
                    <DropdownMenuItem onClick={() => handleActionTrigger(user, 'activate')}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleActionTrigger(user, 'deactivate')}>
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate User
                    </DropdownMenuItem>
                  ))}
                  {canDelete && <DropdownMenuSeparator />}
                  {canDelete && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleActionTrigger(user, 'delete')}>Delete User</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };
  
  return (
    <>
      <div className="flex items-center justify-end">
        {canCreate && (
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) setSelectedUser(undefined);
                setIsFormOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                </DialogHeader>
                <UserForm user={selectedUser} onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          )}
      </div>
      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {renderContent()}
        </Table>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{getAlertDialogContent()?.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                      {getAlertDialogContent()?.description}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedUser(undefined)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmAction}
                    className={cn(actionToConfirm === 'delete' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
                  >
                    Confirm
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RolesTable() {
    const { data: roles, loading, error } = useCollection<Role>('roles');
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [selectedRole, setSelectedRole] = React.useState<Role | undefined>(undefined);
    const { toast } = useToast();
    const { hasPermission } = usePermissions();

    const canManageRoles = hasPermission(ALL_PERMISSIONS.ROLES.MANAGE);
  
    const handleEdit = (role: Role) => {
      setSelectedRole(role);
      setIsFormOpen(true);
    };
    
    const handleDelete = (role: Role) => {
      setSelectedRole(role);
      setIsAlertOpen(true);
    }
    
    const confirmDelete = async () => {
      if (selectedRole && db) {
        try {
          await deleteDoc(doc(db, 'roles', selectedRole.id));
          toast({ title: `Role "${selectedRole.name}" Deleted`, description: 'The role has been successfully removed.' });
        } catch (e) {
          const error = e as Error;
          console.error("Error deleting role: ", error);
          toast({ title: 'Error Deleting Role', description: error.message, variant: 'destructive' });
        }
      }
      setIsAlertOpen(false);
      setSelectedRole(undefined);
    }
  
    const handleSave = async (values: Omit<Role, 'id'>) => {
      if (!db) {
          toast({ title: 'Database not available', variant: 'destructive' });
          return false;
      }
      const isEditing = !!selectedRole;
      try {
          if (isEditing) {
              const roleRef = doc(db, 'roles', selectedRole.id);
              await updateDoc(roleRef, values);
              toast({ title: `Role Updated`, description: `Role "${values.name}" was saved.` });
          } else {
              await addDoc(collection(db, 'roles'), values);
              toast({ title: `Role Created`, description: `Role "${values.name}" was created.` });
          }
          handleFormSuccess();
          return true;
      } catch(e) {
          const error = e as Error;
          console.error("Error saving role: ", error);
          toast({ title: 'Error Saving Role', description: error.message, variant: 'destructive' });
          return false;
      }
    }
  
    const handleFormSuccess = () => {
      setIsFormOpen(false);
      setSelectedRole(undefined);
    };
  
    const renderContent = () => {
      if (loading) {
        return (
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        );
      }
  
      if (error) {
        return (
          <TableBody>
            <TableRow>
              <TableCell colSpan={3}>
                <Alert variant="destructive">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Error Loading Roles</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        );
      }
  
      return (
        <TableBody>
          {roles?.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell>{role.permissions.length}</TableCell>
              <TableCell className="text-right">
                {canManageRoles && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={role.name === 'admin'}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(role)} disabled={role.name === 'admin'}>Edit Role</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(role)} disabled={role.name === 'admin'}>Delete Role</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    };

    return (
        <>
        <div className="flex items-center justify-end">
            {canManageRoles && (
                <Dialog open={isFormOpen} onOpenChange={(open) => {
                    if (!open) setSelectedRole(undefined);
                    setIsFormOpen(open);
                }}>
                <DialogTrigger asChild>
                    <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Role
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                    <DialogTitle>{selectedRole ? `Edit Role: ${selectedRole.name}` : 'Create New Role'}</DialogTitle>
                    </DialogHeader>
                    <RoleForm
                    role={selectedRole}
                    onSave={handleSave}
                    onCancel={handleFormSuccess}
                    />
                </DialogContent>
                </Dialog>
            )}
        </div>
        <Card className="mt-4">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Permissions Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            {renderContent()}
            </Table>
        </Card>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the role: <span className="font-semibold">{selectedRole?.name}</span>. This could affect users currently assigned to this role.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedRole(undefined)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    )
}

export default function UsersPage() {
    return (
        <>
            <PageHeader
                title="User Management"
                description="Manage user accounts, roles, and permissions."
            />
            <Tabs defaultValue="users" className="w-full">
                <TabsList>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-6">
                    <UsersTable />
                </TabsContent>
                <TabsContent value="roles" className="mt-6">
                    <RolesTable />
                </TabsContent>
            </Tabs>
        </>
    )
}
