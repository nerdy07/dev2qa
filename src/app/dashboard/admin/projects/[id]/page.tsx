
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDocument } from '@/hooks/use-collection';
import type { Project, CertificateRequest, Milestone, Task, User, ProjectResource } from '@/lib/types';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TriangleAlert, User as UserIcon, Calendar, Flag, Target, Info, CheckCircle, CircleDot, ClockIcon, Pencil, Link2, ExternalLink, FileArchive, CalendarClock, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { query, where, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CompanyFile } from '@/lib/types';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/admin/task-form';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { cn } from '@/lib/utils';

const DetailItem = ({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-medium">{children || 'N/A'}</span>
        </div>
    </div>
);

const statusVariant = (status: Project['status']) => {
    switch (status) {
        case 'In Progress': return 'default';
        case 'Completed': return 'secondary';
        case 'On Hold': return 'destructive';
        default: return 'outline';
    }
}

const taskStatusVariant = (status: Task['status']) => {
    switch (status) {
        case 'Done': return 'default';
        case 'In Progress': return 'secondary';
        case 'To Do':
        default: return 'outline';
    }
}

const taskStatusIcon = (status: Task['status']) => {
    switch (status) {
        case 'Done': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'In Progress': return <ClockIcon className="h-4 w-4 text-blue-500" />;
        case 'To Do':
        default: return <CircleDot className="h-4 w-4 text-muted-foreground" />;
    }
}

const taskStatusTone = (status: Task['status']) => {
    switch (status) {
        case 'Done': return 'bg-emerald-500/90';
        case 'In Progress': return 'bg-sky-500/90';
        default: return 'bg-muted-foreground/60';
    }
};

const getMilestoneProgress = (milestone: Milestone) => {
    const totalTasks = milestone.tasks?.length ?? 0;
    if (totalTasks === 0) {
        return { completed: 0, total: 0, percent: 0 };
    }
    const completed = milestone.tasks?.filter(task => task.status === 'Done').length ?? 0;
    return {
        completed,
        total: totalTasks,
        percent: Math.round((completed / totalTasks) * 100),
    };
};

export default function ProjectDetailsPage() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const { data: project, loading: projectLoading, error: projectError, setData: setProject } = useDocument<Project>('projects', id as string);

    const [isTaskFormOpen, setIsTaskFormOpen] = React.useState(false);
    const [selectedTask, setSelectedTask] = React.useState<{task: Task, milestoneId: string, milestoneName: string} | null>(null);

    const requestsQuery = React.useMemo(() => {
        if (!project) return null;
        return query(collection(db!, 'requests'), where('associatedProject', '==', project.name));
    }, [project]);

    const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>('requests', requestsQuery);
    const { data: users } = useCollection<User>('users');
    
    // Query files associated with this project
    const projectFilesQuery = React.useMemo(() => {
        if (!project || !db) return null;
        return query(collection(db, 'files'), where('projectId', '==', project.id));
    }, [project]);
    
    const { data: projectFiles, loading: projectFilesLoading } = useCollection<CompanyFile>('files', projectFilesQuery);

    const loading = projectLoading || (project && requestsLoading);
    const error = projectError || requestsError;

    const { hasRole, hasPermission } = useAuth();
    const canEdit = hasPermission(ALL_PERMISSIONS.PROJECTS.UPDATE) || currentUser?.id === project?.leadId;

    const projectProgress = React.useMemo(() => {
        if (!project || !project.milestones || project.milestones.length === 0) {
            return 0;
        }
        const allTasks = project.milestones.flatMap(m => m.tasks || []);
        if (allTasks.length === 0) {
            return 0;
        }
        const completedTasks = allTasks.filter(t => t.status === 'Done').length;
        return Math.round((completedTasks / allTasks.length) * 100);
    }, [project]);

    const handleEditTask = (task: Task, milestoneId: string, milestoneName: string) => {
        setSelectedTask({ task, milestoneId, milestoneName });
        setIsTaskFormOpen(true);
    };

    const handleSaveTask = async (updatedTask: Task, milestoneId: string) => {
        if (!project || !db || !setProject) return false;

        const updatedMilestones = project.milestones?.map(m => {
            if (m.id === milestoneId) {
                const updatedTasks = m.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
                return { ...m, tasks: updatedTasks };
            }
            return m;
        }) || [];

        try {
            const projectRef = doc(db, 'projects', project.id);
            await updateDoc(projectRef, { milestones: updatedMilestones });

            // Optimistically update local state
            setProject({ ...project, milestones: updatedMilestones });

            toast({ title: 'Task Updated', description: `Task "${updatedTask.name}" has been saved.`});
            setIsTaskFormOpen(false);
            setSelectedTask(null);
            return true;
        } catch(e) {
            const error = e as Error;
            console.error("Error updating task:", error);
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
            return false;
        }
    };


    if (loading) {
        return (
            <>
                <PageHeader title=""><Skeleton className="h-9 w-64" /></PageHeader>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
                            <CardContent className="space-y-4">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader>
                            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
                            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                        </Card>
                    </div>
                </div>
            </>
        )
    }

    if (error) {
        return <Alert variant="destructive"><TriangleAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
    }
    
    if (!project) {
        return <Alert variant="destructive"><TriangleAlert className="h-4 w-4" /><AlertTitle>Not Found</AlertTitle><AlertDescription>The requested project could not be found.</AlertDescription></Alert>;
    }

    return (
        <>
            <PageHeader title={project.name} description={`Details for project ID: ${project.id}`} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <aside className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <DetailItem icon={Flag} label="Status">
                                <Badge variant={statusVariant(project.status)}>{project.status || 'Not Started'}</Badge>
                            </DetailItem>
                             <DetailItem icon={UserIcon} label="Project Lead">{project.leadName}</DetailItem>
                             <DetailItem icon={Calendar} label="Start Date">
                                {project.startDate ? format(project.startDate.toDate(), 'PPP') : 'Not set'}
                            </DetailItem>
                             <DetailItem icon={Calendar} label="End Date">
                                {project.endDate ? format(project.endDate.toDate(), 'PPP') : 'Not set'}
                            </DetailItem>
                            <div>
                                <Label className="text-sm text-muted-foreground">Overall Progress</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Progress value={projectProgress} className="h-2" />
                                    <span className="text-sm font-semibold">{projectProgress}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {project.description || 'No description provided.'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Resources</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {project.resources && project.resources.length > 0 ? (
                                <div className="space-y-3">
                                    {project.resources.map(resource => (
                                        <a 
                                            key={resource.id} 
                                            href={resource.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-start gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                                        >
                                            <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{resource.name}</p>
                                                <p 
                                                    className="text-xs text-primary break-all word-break break-words" 
                                                    title={resource.url}
                                                >
                                                    {resource.url}
                                                </p>
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        </a>
                                    ))}
                                </div>
                           ) : (
                                <p className="text-sm text-muted-foreground">No resources attached to this project.</p>
                           )}
                        </CardContent>
                    </Card>
                </aside>

                <main className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Project Milestones</CardTitle>
                            <CardDescription>A breakdown of the project's key phases and tasks.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {project.milestones && project.milestones.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full" defaultValue={project.milestones[0].id}>
                                    {project.milestones.map((milestone) => {
                                        const milestoneProgress = getMilestoneProgress(milestone);
                                        const hasSchedule = milestone.startDate && milestone.endDate;
                                        return (
                                            <AccordionItem value={milestone.id} key={milestone.id} className="rounded-xl border bg-muted/30">
                                                <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                                                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex flex-1 items-start gap-3">
                                                            <div className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", milestone.status === 'Completed' ? 'bg-emerald-500' : milestone.status === 'In Progress' ? 'bg-sky-500' : 'bg-muted-foreground/60')} />
                                                            <div>
                                                                <p className="font-semibold text-base leading-tight">{milestone.name}</p>
                                                                {milestone.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">{milestone.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                            {hasSchedule && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {format(milestone.startDate!.toDate(), 'MMM d')} - {format(milestone.endDate!.toDate(), 'MMM d')}
                                                                </span>
                                                            )}
                                                            <Badge variant="outline" className="text-xs">{milestone.status}</Badge>
                                                            {milestoneProgress.total > 0 && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    {milestoneProgress.completed}/{milestoneProgress.total} ({milestoneProgress.percent}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="space-y-4 border-t bg-background/60 px-4 py-4 sm:px-6">
                                                    {!milestone.description && (
                                                        <p className="text-sm text-muted-foreground">No description for this milestone.</p>
                                                    )}
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Target className="h-4 w-4" />
                                                        <span>{milestone.status === 'Completed' ? 'Milestone completed' : 'Milestone in progress'}</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tasks</h4>
                                                            {milestone.tasks && milestone.tasks.length > 0 && (
                                                                <span className="text-xs text-muted-foreground">{milestone.tasks.length} item{milestone.tasks.length > 1 ? 's' : ''}</span>
                                                            )}
                                                        </div>
                                                        {milestone.tasks && milestone.tasks.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {milestone.tasks.map(task => {
                                                                    const assignee = users?.find(u => u.id === task.assigneeId);
                                                                    const statusTone = taskStatusTone(task.status);
                                                                    return (
                                                                        <div
                                                                            key={task.id}
                                                                            className="rounded-xl border bg-card/80 p-4 shadow-sm transition hover:shadow-md"
                                                                        >
                                                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                                <div className="flex flex-1 items-start gap-3">
                                                                                    <span className={cn("mt-1.5 block h-2.5 w-2.5 rounded-full", statusTone)} />
                                                                                    <div className="space-y-1">
                                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                                            <span className="font-medium text-sm leading-tight">{task.name}</span>
                                                                                            <Badge variant={taskStatusVariant(task.status)}>{task.status}</Badge>
                                                                                            <Badge variant={task.certificateRequired === false ? 'secondary' : 'default'} className="text-xs font-medium">
                                                                                                {task.certificateRequired === false ? 'QA Sign-off' : 'Certificate'}
                                                                                            </Badge>
                                                                                        </div>
                                                                                        {task.description && (
                                                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                                                {task.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 self-end sm:self-start">
                                                                                    {canEdit && (
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-8 w-8"
                                                                                            onClick={() => handleEditTask(task, milestone.id, milestone.name)}
                                                                                            title="Edit task"
                                                                                        >
                                                                                            <Pencil className="h-4 w-4" />
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                                                                {task.startDate && task.endDate && (
                                                                                    <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                                                                                        <CalendarClock className="h-3 w-3" />
                                                                                        {format(task.startDate.toDate(), 'MMM d')} – {format(task.endDate.toDate(), 'MMM d')}
                                                                                    </div>
                                                                                )}
                                                                                {assignee ? (
                                                                                    <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2 py-1">
                                                                                        <Avatar className="h-5 w-5">
                                                                                            <AvatarImage src={assignee.photoURL} alt={assignee.name} />
                                                                                            <AvatarFallback className="text-[10px]">{assignee.name?.[0]}</AvatarFallback>
                                                                                        </Avatar>
                                                                                        <span className="font-medium">{assignee.name}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                                                                                        <Info className="h-3 w-3" />
                                                                                        Unassigned
                                                                                    </span>
                                                                                )}
                                                                                {task.docUrl && (
                                                                                    <a
                                                                                        href={task.docUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-primary hover:underline"
                                                                                    >
                                                                                        <Link2 className="h-3 w-3" />
                                                                                        Task Document
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className='text-sm text-muted-foreground'>No tasks defined for this milestone yet.</p>
                                                        )}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Target className="mx-auto h-12 w-12" />
                                    <p className="mt-4">No milestones have been defined for this project yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Files</CardTitle>
                            <CardDescription>Files and links associated with this project.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {projectFilesLoading ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                                    ))}
                                </div>
                            ) : projectFiles && projectFiles.length > 0 ? (
                                <div className="space-y-3">
                                    {projectFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                                        >
                                            {file.type === 'upload' ? (
                                                <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <Link2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{file.name}</p>
                                                {file.description && (
                                                    <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {file.type === 'upload' ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : 'File'}
                                                        </span>
                                                    ) : (
                                                        <a
                                                            href={file.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Open Link
                                                        </a>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">•</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {file.createdAt ? format(file.createdAt.toDate(), 'PPp') : 'Unknown date'}
                                                    </span>
                                                </div>
                                            </div>
                                            {file.type === 'upload' && file.fileUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 flex-shrink-0"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            // If it's a Firebase Storage URL, get a fresh download URL
                                                            let downloadUrl = file.fileUrl!;
                                                            if (file.fileUrl?.includes('firebasestorage.googleapis.com')) {
                                                                // Extract the path from the URL and get a fresh download URL
                                                                const pathMatch = file.fileUrl.match(/\/o\/(.+)\?/);
                                                                if (pathMatch && storage) {
                                                                    const fileRef = ref(storage, decodeURIComponent(pathMatch[1]));
                                                                    downloadUrl = await getDownloadURL(fileRef);
                                                                }
                                                            }
                                                            window.open(downloadUrl, '_blank');
                                                        } catch (error) {
                                                            console.error('Error downloading file:', error);
                                                        }
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No files have been uploaded for this project yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Associated Certificate Requests</CardTitle>
                            <CardDescription>All QA requests linked to this project.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CertificateRequestsTable requests={requests || []} isLoading={requestsLoading} />
                        </CardContent>
                    </Card>
                </main>
            </div>
            
            <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task: {selectedTask?.task.name}</DialogTitle>
                    </DialogHeader>
                    {selectedTask && (
                        <TaskForm
                            task={selectedTask.task}
                            milestoneId={selectedTask.milestoneId}
                            milestoneName={selectedTask.milestoneName}
                            projectName={project.name}
                            onSave={handleSaveTask}
                            onCancel={() => setIsTaskFormOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
