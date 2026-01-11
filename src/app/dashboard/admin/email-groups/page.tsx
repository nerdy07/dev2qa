'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, TriangleAlert, Mail } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EmailGroup, User } from '@/lib/types';
import { EmailGroupForm } from '@/components/admin/email-group-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { getNotificationEventLabel } from '@/lib/notification-events';

export default function EmailGroupsPage() {
  const { data: emailGroups, loading, error } = useCollection<EmailGroup>('emailGroups');
  const { data: users } = useCollection<User>('users');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<EmailGroup | undefined>(undefined);
  const { toast } = useToast();

  const getMemberNames = (memberIds: string[]) => {
    if (!memberIds || memberIds.length === 0 || !users) return [];
    return users
      .filter(user => memberIds.includes(user.id))
      .map(user => user.name);
  };

  const getMemberEmails = (memberIds: string[]) => {
    if (!memberIds || memberIds.length === 0 || !users) return [];
    return users
      .filter(user => memberIds.includes(user.id) && user.email)
      .map(user => user.email!);
  };

  const handleEdit = (group: EmailGroup) => {
    setSelectedGroup(group);
    setIsFormOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = (group: EmailGroup) => {
    setSelectedGroup(group);
    setIsAlertOpen(true);
    setOpenDropdownId(null);
  };
  
  const confirmDelete = async () => {
    if (selectedGroup) {
        try {
            await deleteDoc(doc(db!, 'emailGroups', selectedGroup.id));
            toast({
                title: 'Email Group Deleted',
                description: `The email group "${selectedGroup.name}" has been deleted.`,
            });
            setIsAlertOpen(false);
            setSelectedGroup(undefined);
        } catch (e) {
            const error = e as Error;
            console.error("Error deleting email group: ", error);
            toast({
                title: 'Error Deleting Email Group',
                description: error.message,
                variant: 'destructive',
            });
        }
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedGroup(undefined);
  };

  const handleCreateNew = () => {
    setSelectedGroup(undefined);
    setIsFormOpen(true);
  };

  const renderContent = () => {
    if (loading) {
        return (
                    <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
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
                      <AlertTitle>Error Loading Email Groups</AlertTitle>
                      <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        )
      }

    if (!emailGroups || emailGroups.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              No email groups found. Create your first email group to get started.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
        <TableBody>
            {emailGroups.map((group) => {
              const memberNames = getMemberNames(group.memberIds || []);
              const memberCount = group.memberIds?.length || 0;
              
              return (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {group.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      {memberNames.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memberNames.slice(0, 3).map((name, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                          {memberNames.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{memberNames.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {group.notificationEvents && group.notificationEvents.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{group.notificationEvents.length} event{group.notificationEvents.length !== 1 ? 's' : ''}</span>
                        <div className="flex flex-wrap gap-1">
                          {group.notificationEvents.slice(0, 3).map((event, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {getNotificationEventLabel(event as any)}
                            </Badge>
                          ))}
                          {group.notificationEvents.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.notificationEvents.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No events configured</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu 
                      open={openDropdownId === group.id} 
                      onOpenChange={(open) => setOpenDropdownId(open ? group.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(group)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive" 
                          onClick={() => handleDelete(group)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
    )
  }

  return (
    <ProtectedRoute permission={ALL_PERMISSIONS.ADMIN_SECTION.READ}>
      <PageHeader
        title="Email Groups"
        description="Create and manage email groups for notifications. Select groups when sending notifications to send emails to all members."
      >
        <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) {
              setSelectedGroup(undefined);
              setIsFormOpen(false);
            }
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Email Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedGroup ? 'Edit Email Group' : 'Create New Email Group'}</DialogTitle>
            </DialogHeader>
            <EmailGroupForm 
                emailGroup={selectedGroup}
                onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Email Groups</CardTitle>
          <CardDescription>
            Manage email groups for notifications. Groups configured with notification events will be automatically CC'd on emails for those events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Notification Events</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the email group: <span className="font-semibold">{selectedGroup?.name}</span>.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedGroup(undefined)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
