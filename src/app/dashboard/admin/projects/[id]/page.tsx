
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useDocument } from '@/hooks/use-collection';
import type { Project, CertificateRequest } from '@/lib/types';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TriangleAlert, User, Calendar, Flag, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { query, where, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export default function ProjectDetailsPage() {
    const { id } = useParams();
    const { data: project, loading: projectLoading, error: projectError } = useDocument<Project>('projects', id as string);

    const requestsQuery = React.useMemo(() => {
        if (!project) return null;
        // Query requests where the associatedProject field (a string) matches the project's name
        return query(collection(db!, 'requests'), where('associatedProject', '==', project.name));
    }, [project]);

    const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>('requests', requestsQuery);

    const loading = projectLoading || (project && requestsLoading);
    const error = projectError || requestsError;

    if (loading) {
        return (
            <>
                <PageHeader title=""><Skeleton className="h-9 w-64" /></PageHeader>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
                            <CardContent className="space-y-4">
                                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                            <DetailItem icon={User} label="Project Lead">{project.leadName}</DetailItem>
                            <DetailItem icon={Calendar} label="Start Date">
                                {project.startDate ? format(project.startDate.toDate(), 'PPP') : 'Not set'}
                            </DetailItem>
                             <DetailItem icon={Calendar} label="End Date">
                                {project.endDate ? format(project.endDate.toDate(), 'PPP') : 'Not set'}
                            </DetailItem>
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
                </aside>

                <main className="lg:col-span-2 space-y-6">
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
        </>
    );
}

