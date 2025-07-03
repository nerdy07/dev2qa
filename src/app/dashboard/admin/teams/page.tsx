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
import type { Team } from '@/lib/types';
import { DataTableForm } from '@/components/admin/data-table-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeamsPage() {
  const { data: teams, loading, error } = useCollection<Team>('teams');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | undefined>(undefined);
  const { toast } = useToast();

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setIsFormOpen(true);
  };
  
  const handleDelete = (team: Team) => {
    setSelectedTeam(team);
    setIsAlertOpen(true);
  }
  
  const confirmDelete = async () => {
    if (selectedTeam) {
        try {
            await deleteDoc(doc(db!, 'teams', selectedTeam.id));
            toast({
                title: 'Team Deleted',
                description: `The team "${selectedTeam.name}" has been deleted.`,
            });
        } catch (e) {
            const error = e as Error;
            console.error("Error deleting team: ", error);
            toast({
                title: 'Error Deleting Team',
                description: error.message,
                variant: 'destructive',
            });
        }
    }
    setIsAlertOpen(false);
    setSelectedTeam(undefined);
  }

  const handleSave = async (name: string) => {
    const isEditing = !!selectedTeam;
    try {
        if (isEditing) {
            const teamRef = doc(db!, 'teams', selectedTeam.id);
            await updateDoc(teamRef, { name });
            toast({
                title: 'Team Updated',
                description: `The team "${name}" has been successfully updated.`,
            });
        } else {
            await addDoc(collection(db!, 'teams'), { name });
            toast({
                title: 'Team Created',
                description: `The team "${name}" has been successfully created.`,
            });
        }
        handleFormSuccess();
        return true;
    } catch (e) {
        const error = e as Error;
        console.error("Error saving team: ", error);
        toast({
            title: 'Error Saving Team',
            description: error.message,
            variant: 'destructive'
        });
        return false;
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedTeam(undefined);
  };

  const renderContent = () => {
    if (loading) {
        return (
            <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
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
              <TableCell colSpan={2}>
                  <Alert variant="destructive">
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Error Loading Teams</AlertTitle>
                      <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        )
      }

    return (
        <TableBody>
            {teams?.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(team)}>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(team)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
    )
  }

  return (
    <>
      <PageHeader
        title="Team Management"
        description="Create and manage team names for certificate requests."
      >
        <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) setSelectedTeam(undefined);
            setIsFormOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            </DialogHeader>
            <DataTableForm 
                entity={selectedTeam} 
                entityName="Team" 
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
              <TableHead>Team Name</TableHead>
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
                      This action cannot be undone. This will permanently delete the team: <span className="font-semibold">{selectedTeam?.name}</span>.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedTeam(undefined)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
