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
import type { Project } from '@/lib/types';
import { DataTableForm } from '@/components/admin/data-table-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProjectsPage() {
    const { data: projects, loading, error } = useCollection<Project>('projects');
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [selectedProject, setSelectedProject] = React.useState<Project | undefined>(undefined);
    const { toast } = useToast();
  
    const handleEdit = (project: Project) => {
      setSelectedProject(project);
      setIsFormOpen(true);
    };
    
    const handleDelete = (project: Project) => {
      setSelectedProject(project);
      setIsAlertOpen(true);
    }
    
    const confirmDelete = async () => {
      if (selectedProject) {
        try {
            await deleteDoc(doc(db!, 'projects', selectedProject.id));
            toast({
                title: 'Project Deleted',
                description: `The project "${selectedProject.name}" has been deleted.`,
            });
        } catch(e) {
            const error = e as Error;
            console.error("Error deleting project: ", error);
            toast({
                title: 'Error Deleting Project',
                description: error.message,
                variant: 'destructive',
            })
        }
      }
      setIsAlertOpen(false);
      setSelectedProject(undefined);
    }
  
    const handleSave = async (name: string) => {
      const isEditing = !!selectedProject;
      try {
        if (isEditing) {
            const projectRef = doc(db!, 'projects', selectedProject.id);
            await updateDoc(projectRef, { name });
            toast({
                title: 'Project Updated',
                description: `The project "${name}" has been successfully updated.`,
            });
        } else {
            await addDoc(collection(db!, 'projects'), { name });
            toast({
                title: 'Project Created',
                description: `The project "${name}" has been successfully created.`,
            });
        }
        handleFormSuccess();
        return true;
      } catch (e) {
        const error = e as Error;
        console.error("Error saving project: ", error);
        toast({
            title: 'Error Saving Project',
            description: error.message,
            variant: 'destructive'
        });
        return false;
      }
    }

    const handleFormSuccess = () => {
      setIsFormOpen(false);
      setSelectedProject(undefined);
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
                          <AlertTitle>Error Loading Projects</AlertTitle>
                          <AlertDescription>{error.message}</AlertDescription>
                      </Alert>
                  </TableCell>
                </TableRow>
              </TableBody>
            )
          }

        return (
            <TableBody>
                {projects?.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(project)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(project)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
        );
    }

    return (
      <>
        <PageHeader
          title="Project Management"
          description="Create and manage project names for certificate requests."
        >
          <Dialog open={isFormOpen} onOpenChange={(open) => {
              if (!open) setSelectedProject(undefined);
              setIsFormOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              </DialogHeader>
              <DataTableForm 
                entity={selectedProject} 
                entityName="Project" 
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
                <TableHead>Project Name</TableHead>
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
                        This action cannot be undone. This will permanently delete the project: <span className="font-semibold">{selectedProject?.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedProject(undefined)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
