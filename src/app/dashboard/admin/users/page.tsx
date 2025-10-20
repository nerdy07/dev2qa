
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
import { Card } from '@/components/ui/card';
import { User } from '@/lib/types';
import { UserForm } from '@/components/admin/user-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';

type ActionType = 'delete' | 'deactivate' | 'activate';

export default function UsersPage() {
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
      <PageHeader
        title="User Management"
        description="Create, view, and manage user accounts."
      >
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
      </PageHeader>
      <Card>
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
  );
}
