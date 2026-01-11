/**
 * QA Queue Statistics Component
 * Displays statistics and metrics for the QA queue
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { CertificateRequest } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface QAQueueStatsProps {
    requests: CertificateRequest[];
}

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ElementType;
    trend?: {
        value: number;
        label: string;
    };
    variant?: 'default' | 'success' | 'warning' | 'destructive';
}

function StatCard({ title, value, description, icon: Icon, trend, variant = 'default' }: StatCardProps) {
    const variantColors = {
        default: 'text-blue-500',
        success: 'text-green-500',
        warning: 'text-yellow-500',
        destructive: 'text-red-500',
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${variantColors[variant]}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
                {trend && (
                    <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500">
                            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function QAQueueStats({ requests }: QAQueueStatsProps) {
    const stats = React.useMemo(() => {
        const pending = requests.filter(r => r.status === 'pending').length;
        const assigned = requests.filter(r => r.status === 'assigned').length;
        const inReview = requests.filter(r => r.status === 'in_review').length;
        const needsRevision = requests.filter(r => r.status === 'needs_revision').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;

        // Calculate oldest pending request
        const pendingRequests = requests.filter(r => r.status === 'pending');
        const oldestPending = pendingRequests.length > 0
            ? pendingRequests.reduce((oldest, current) => {
                const oldestDate = oldest.createdAt?.toDate?.() || new Date();
                const currentDate = current.createdAt?.toDate?.() || new Date();
                return currentDate < oldestDate ? current : oldest;
            })
            : null;

        // Calculate average response time (for approved/rejected requests)
        const completedRequests = requests.filter(r =>
            (r.status === 'approved' || r.status === 'rejected') && r.updatedAt && r.createdAt
        );

        let avgResponseTime = 'N/A';
        if (completedRequests.length > 0) {
            const totalTime = completedRequests.reduce((sum, req) => {
                const created = req.createdAt?.toDate?.() || new Date();
                const updated = req.updatedAt?.toDate?.() || new Date();
                return sum + (updated.getTime() - created.getTime());
            }, 0);
            const avgMs = totalTime / completedRequests.length;
            const avgHours = Math.round(avgMs / (1000 * 60 * 60));
            avgResponseTime = avgHours < 24
                ? `${avgHours}h`
                : `${Math.round(avgHours / 24)}d`;
        }

        // Get unique QA testers
        const qaTesters = new Set(
            requests
                .filter(r => r.qaTesterId)
                .map(r => r.qaTesterId)
        );

        return {
            pending,
            assigned,
            inReview,
            needsRevision,
            approved,
            rejected,
            total: requests.length,
            oldestPending,
            avgResponseTime,
            activeQATesters: qaTesters.size,
        };
    }, [requests]);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Pending Requests"
                value={stats.pending}
                description={
                    stats.oldestPending
                        ? `Oldest: ${formatDistanceToNow(stats.oldestPending.createdAt?.toDate?.() || new Date(), { addSuffix: true })}`
                        : 'No pending requests'
                }
                icon={Clock}
                variant={stats.pending > 5 ? 'warning' : 'default'}
            />

            <StatCard
                title="In Progress"
                value={stats.assigned + stats.inReview}
                description={`${stats.assigned} assigned, ${stats.inReview} in review`}
                icon={AlertCircle}
                variant="default"
            />

            <StatCard
                title="Needs Revision"
                value={stats.needsRevision}
                description="Waiting for requester updates"
                icon={XCircle}
                variant={stats.needsRevision > 0 ? 'warning' : 'default'}
            />

            <StatCard
                title="Completed"
                value={stats.approved + stats.rejected}
                description={`${stats.approved} approved, ${stats.rejected} rejected`}
                icon={CheckCircle}
                variant="success"
            />

            <StatCard
                title="Avg Response Time"
                value={stats.avgResponseTime}
                description="Time to first response"
                icon={Clock}
                variant="default"
            />

            <StatCard
                title="Active QA Testers"
                value={stats.activeQATesters}
                description="Currently handling requests"
                icon={Users}
                variant="default"
            />

            <StatCard
                title="Approval Rate"
                value={
                    stats.approved + stats.rejected > 0
                        ? `${Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)}%`
                        : 'N/A'
                }
                description="Of completed requests"
                icon={CheckCircle}
                variant="success"
            />

            <StatCard
                title="Total Requests"
                value={stats.total}
                description="All time"
                icon={TrendingUp}
                variant="default"
            />
        </div>
    );
}
