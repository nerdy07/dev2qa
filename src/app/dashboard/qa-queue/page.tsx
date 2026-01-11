/**
 * QA Queue Page
 * Dedicated page for QA queue management with advanced features
 */

'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QAQueueStats } from '@/components/dashboard/qa-queue-stats';
import { QAQueueTable } from '@/components/dashboard/qa-queue-table';
import { QAQueueFiltersComponent, type QAQueueFilters } from '@/components/dashboard/qa-queue-filters';
import { useAuth } from '@/providers/auth-provider';
import { useCollection } from '@/hooks/use-collection';
import type { CertificateRequest, User } from '@/lib/types';
import { query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ALL_PERMISSIONS } from '@/lib/roles';

export default function QAQueuePage() {
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const [filters, setFilters] = React.useState<QAQueueFilters>({});

    // Fetch all requests
    const { data: allRequests, loading, refetch } = useCollection<CertificateRequest>(
        'requests',
        null
    );

    // Fetch all users for filters
    const { data: allUsers } = useCollection<User>('users', null);

    // Filter requests based on current filters
    const filteredRequests = React.useMemo(() => {
        if (!allRequests) return [];

        return allRequests.filter(request => {
            // Status filter
            if (filters.status && filters.status.length > 0) {
                if (!filters.status.includes(request.status)) return false;
            }

            // QA Tester filter
            if (filters.qaTesterId) {
                if (request.qaTesterId !== filters.qaTesterId) return false;
            }

            // Project filter
            if (filters.projectName) {
                if (request.associatedProject !== filters.projectName) return false;
            }

            // Team filter
            if (filters.teamName) {
                if (request.associatedTeam !== filters.teamName) return false;
            }

            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!request.taskTitle.toLowerCase().includes(searchLower)) return false;
            }

            // Date range filter
            if (filters.dateFrom || filters.dateTo) {
                const createdAt = request.createdAt?.toDate?.() || new Date();
                if (filters.dateFrom && createdAt < filters.dateFrom) return false;
                if (filters.dateTo && createdAt > filters.dateTo) return false;
            }

            return true;
        });
    }, [allRequests, filters]);

    // Get unique projects and teams for filters
    const projects = React.useMemo(() => {
        if (!allRequests) return [];
        return Array.from(new Set(allRequests.map(r => r.associatedProject))).sort();
    }, [allRequests]);

    const teams = React.useMemo(() => {
        if (!allRequests) return [];
        return Array.from(new Set(allRequests.map(r => r.associatedTeam))).sort();
    }, [allRequests]);

    // Get QA testers for filters
    const qaTesters = React.useMemo(() => {
        if (!allUsers) return [];
        return allUsers
            .filter(u => hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE))
            .map(u => ({ id: u.id, name: u.name }));
    }, [allUsers, hasPermission]);

    const handleBatchAction = async (action: string, requestIds: string[]) => {
        toast({
            title: 'Batch Action',
            description: `Action "${action}" will be performed on ${requestIds.length} request(s)`,
        });
        // TODO: Implement batch actions
    };

    const handleExport = () => {
        // Export filtered requests to CSV
        const csv = [
            ['ID', 'Task Title', 'Requester', 'Status', 'Project', 'Team', 'Created At'].join(','),
            ...filteredRequests.map(r => [
                r.id,
                `"${r.taskTitle}"`,
                r.requesterName,
                r.status,
                r.associatedProject,
                r.associatedTeam,
                r.createdAt?.toDate?.().toISOString() || '',
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qa-queue-${new Date().toISOString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
            title: 'Export Complete',
            description: `Exported ${filteredRequests.length} requests to CSV`,
        });
    };

    if (!hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE)) {
        return (
            <div>
                <PageHeader title="QA Queue" />
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            You do not have permission to access the QA queue.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="QA Queue">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </PageHeader>

            {/* Statistics */}
            <QAQueueStats requests={allRequests || []} />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filters</CardTitle>
                            <CardDescription>
                                {filteredRequests.length} of {allRequests?.length || 0} requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <QAQueueFiltersComponent
                                filters={filters}
                                onFiltersChange={setFilters}
                                qaTesters={qaTesters}
                                projects={projects}
                                teams={teams}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Queue Table */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Requests</CardTitle>
                            <CardDescription>
                                Manage and process QA requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground">Loading requests...</p>
                                </div>
                            ) : (
                                <QAQueueTable
                                    requests={filteredRequests}
                                    onBatchAction={handleBatchAction}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
