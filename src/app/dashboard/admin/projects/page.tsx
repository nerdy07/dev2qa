
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
import type { Project, ProjectResource, Task } from '@/lib/types';
import { ProjectForm } from '@/components/admin/project-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDoc, collection, deleteDoc, doc, setDoc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/providers/auth-provider';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationWrapper } from '@/components/common/pagination-wrapper';

export default function ProjectsPage() {
    const { data: projects, loading, error, setData } = useCollection<Project>('projects');
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [selectedProject, setSelectedProject] = React.useState<Project | undefined>(undefined);
    const [newProjectId, setNewProjectId] = React.useState<string | undefined>(undefined);
    const { toast } = useToast();
    const { hasPermission, user } = useAuth();
    
    // Check permissions for actions
    const canCreate = hasPermission(ALL_PERMISSIONS.PROJECTS.CREATE);
    const canUpdate = hasPermission(ALL_PERMISSIONS.PROJECTS.UPDATE);
    const canDelete = hasPermission(ALL_PERMISSIONS.PROJECTS.DELETE);

    const syncProjectResourcesWithCompanyFiles = React.useCallback(
      async (projectId: string, projectName: string, resources: ProjectResource[] = []) => {
        if (!db) return;

        const filesRef = collection(db, 'files');
        const snapshot = await getDocs(query(filesRef, where('projectId', '==', projectId)));

        const existingFiles = new Map<string, { docId: string; data: any }>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.resourceId) {
            existingFiles.set(data.resourceId as string, { docId: docSnap.id, data });
          }
        });

        const uploaderId = user?.id || auth?.currentUser?.uid || null;
        const uploaderName = user?.name || auth?.currentUser?.displayName || 'System';
        const uploaderEmail = user?.email || auth?.currentUser?.email || '';

        const resourceIds = new Set<string>();

        for (const resource of resources) {
          const resourceId = resource.id || crypto.randomUUID();
          resourceIds.add(resourceId);

          const existing = existingFiles.get(resourceId);
          if (existing) {
            const updates: Record<string, unknown> = {};
            if (existing.data.name !== resource.name) updates.name = resource.name;
            if (existing.data.fileUrl !== resource.url) updates.fileUrl = resource.url;
            if (existing.data.projectName !== projectName) updates.projectName = projectName;
            if (existing.data.folderType !== 'project') updates.folderType = 'project';
            if (existing.data.visibility !== 'all_staff') updates.visibility = 'all_staff';
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = serverTimestamp();
              await updateDoc(doc(db, 'files', existing.docId), updates);
            }
          } else {
            if (!uploaderId) {
              console.warn('Unable to create company file entry for project resource; uploader information missing.');
              continue;
            }

            await addDoc(filesRef, {
              name: resource.name,
              type: 'link',
              fileUrl: resource.url,
              folderType: 'project',
              projectId,
              projectName,
              visibility: 'all_staff',
              uploadedBy: uploaderId,
              uploadedByName: uploaderName,
              uploadedByEmail: uploaderEmail,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              resourceId,
              tags: ['project-resource'],
            });
          }
        }

        const deletions: Promise<void>[] = [];
        existingFiles.forEach((info, resourceId) => {
          if (!resourceIds.has(resourceId)) {
            deletions.push(deleteDoc(doc(db, 'files', info.docId)));
          }
        });

        if (deletions.length > 0) {
          await Promise.allSettled(deletions);
        }
      },
      [user?.id, user?.name, user?.email]
    );

    // Pagination
    const {
        currentPage,
        totalPages,
        currentData: paginatedProjects,
        itemsPerPage,
        setCurrentPage,
        setItemsPerPage,
    } = usePagination({
        data: projects || [],
        itemsPerPage: 20,
        initialPage: 1,
    });
  
    const handleAddNew = () => {
      setSelectedProject(undefined);
      // Generate a new ID for the project upfront
      if (db) {
        const newDocRef = doc(collection(db, 'projects'));
        setNewProjectId(newDocRef.id);
      }
      setIsFormOpen(true);
    };

    const handleEdit = (project: Project) => {
      if (!canUpdate) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to edit projects.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedProject(project);
      setNewProjectId(project.id); // For editing, use the existing ID
      setIsFormOpen(true);
    };
    
    const handleDelete = (project: Project) => {
      if (!canDelete) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to delete projects.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedProject(project);
      setIsAlertOpen(true);
    }
    
    const confirmDelete = async () => {
      if (!canDelete) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to delete projects.',
          variant: 'destructive',
        });
        setIsAlertOpen(false);
        return;
      }
      
      if (selectedProject) {
        try {
            await deleteDoc(doc(db!, 'projects', selectedProject.id));
            toast({
                title: 'Project Deleted',
                description: `The project "${selectedProject.name}" has been deleted.`,
            });
            // Close dialog on success - Firestore real-time listener will update the list automatically
            setIsAlertOpen(false);
            setSelectedProject(undefined);
        } catch(e) {
            const error = e as Error;
            console.error("Error deleting project: ", error);
            toast({
                title: 'Error Deleting Project',
                description: error.message,
                variant: 'destructive',
            });
            // Keep dialog open on error so user can retry
        }
      }
    }
  
    const handleSave = async (values: Omit<Project, 'id'>, id: string) => {
        const isEditing = !!selectedProject;
        
        // Check permissions before saving
        if (isEditing && !canUpdate) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to update projects.',
            variant: 'destructive',
          });
          return false;
        }
        
        if (!isEditing && !canCreate) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to create projects.',
            variant: 'destructive',
          });
          return false;
        }
        
        try {
          const projectRef = doc(db!, 'projects', id);
          if (isEditing) {
              await updateDoc(projectRef, values);
              toast({
                  title: 'Project Updated',
                  description: `The project "${values.name}" has been successfully updated.`,
              });
          } else {
              await setDoc(projectRef, values);
              toast({
                  title: 'Project Created',
                  description: `The project "${values.name}" has been successfully created.`,
              });
          }

          try {
            await syncProjectResourcesWithCompanyFiles(id, values.name, values.resources || []);
          } catch (syncError) {
            console.error('Error syncing project resources with company files:', syncError);
            toast({
              title: 'Project Saved with Warnings',
              description: 'The project was saved, but some resources could not be added to Company Files automatically.',
              variant: 'destructive',
            });
          }
          
          const newProjectData: Project = { 
              id: id, 
              ...values,
              // Convert JS Dates back to objects with a toDate method to mimic Timestamps for optimistic update
              startDate: values.startDate ? { toDate: () => values.startDate as Date } : null,
              endDate: values.endDate ? { toDate: () => values.endDate as Date } : null,
              milestones: values.milestones?.map(m => ({
                  ...m,
                  startDate: m.startDate ? { toDate: () => m.startDate as Date } : null,
                  endDate: m.endDate ? { toDate: () => m.endDate as Date } : null,
              }))
          };
          
          if (setData && projects) {
            if (isEditing) {
              setData(projects.map(p => p.id === id ? newProjectData : p));
            } else {
              setData([...projects, newProjectData]);
            }
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
      setNewProjectId(undefined);
    };

    const statusVariant = (status: Project['status']) => {
        switch (status) {
            case 'In Progress': return 'default';
            case 'Completed': return 'secondary';
            case 'On Hold': return 'destructive';
            default: return 'outline';
        }
    }

    const calculateProgress = (project: Project): number => {
        const allTasks = project.milestones?.flatMap(m => m.tasks || []);
        if (!allTasks || allTasks.length === 0) {
            if (project.status === 'Completed') return 100;
            return 0;
        }
        const completedTasks = allTasks.filter(t => t.status === 'Done').length;
        return Math.round((completedTasks / allTasks.length) * 100);
    }
  
    const renderContent = () => {
        if (loading) {
            return (
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                  <TableCell colSpan={6}>
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
                {paginatedProjects?.map((project) => {
                  const progress = calculateProgress(project);

                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/admin/projects/${project.id}`} className="hover:underline">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>{project.leadName || 'N/A'}</TableCell>
                      <TableCell><Badge variant={statusVariant(project.status)}>{project.status || 'Not Started'}</Badge></TableCell>
                      <TableCell>{project.endDate ? format(project.endDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Progress value={progress} className="h-2 w-24" />
                           <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
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
                            <DropdownMenuItem asChild><Link href={`/dashboard/admin/projects/${project.id}`}>View Details</Link></DropdownMenuItem>
                            {canUpdate && (
                              <DropdownMenuItem onClick={() => handleEdit(project)}>Edit</DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                {canUpdate && <DropdownMenuSeparator />}
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(project)}>Delete</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
        );
    }

    return (
      <>
        <PageHeader
          title="Project Management"
          description="Create and manage all company projects."
        >
          {canCreate && (
            <Dialog open={isFormOpen} onOpenChange={(open) => {
                if (!open) handleFormSuccess();
                else setIsFormOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Project
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              </DialogHeader>
              {newProjectId && (
                <ProjectForm
                  projectId={newProjectId}
                  project={selectedProject} 
                  onSave={handleSave}
                  onCancel={handleFormSuccess}
                />
              )}
            </DialogContent>
          </Dialog>
          )}
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Project Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
          {projects && projects.length > 0 && (
            <div className="p-4">
              <PaginationWrapper
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={projects.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
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
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
