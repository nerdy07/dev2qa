
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, TriangleAlert } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import type { Role } from '@/lib/types';
import { RoleForm } from '@/components/admin/role-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function RolesPage() {
  const { data: roles, loading, error } = useCollection<Role>('roles');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | undefined>(undefined);
  const { toast } = useToast();

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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };

  return (
    <>
      <PageHeader
        title="Role Management"
        description="Define roles and assign granular permissions to control user access."
      >
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
      </PageHeader>
      <Card>
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
  );
}
