
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart as BarChartIcon, TriangleAlert, User, FolderKanban } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import type { Project } from '@/lib/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartConfig } from '@/components/ui/chart';

export default function ProjectInsightsPage() {
    const { data: projects, loading, error } = useCollection<Project>('projects');

    const statusChartData = React.useMemo(() => {
        if (!projects) return [];
        const statusCounts = projects.reduce((acc, project) => {
            const status = project.status || 'Not Started';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    }, [projects]);

    const leadChartData = React.useMemo(() => {
        if (!projects) return [];
        const leadCounts = projects.reduce((acc, project) => {
            const leadName = project.leadName || 'Unassigned';
            acc[leadName] = (acc[leadName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(leadCounts).map(([lead, count]) => ({ lead, count })).sort((a, b) => b.count - a.count);

    }, [projects]);


    const statusChartConfig = {
        count: {
            label: 'Projects',
            color: 'hsl(var(--primary))',
        },
    } satisfies ChartConfig;

    const leadChartConfig = {
        count: {
            label: 'Projects Assigned',
            color: 'hsl(var(--accent))',
        },
    } satisfies ChartConfig;

    const renderChart = (
        chartData: { [key: string]: string | number }[], 
        chartConfig: ChartConfig, 
        dataKey: string,
        chartKey: string
    ) => {
        if (loading) {
            return <Skeleton className="h-[400px] w-full" />;
        }

        if (error) {
            return (
                <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Error Loading Chart Data</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            );
        }
        
        if (chartData.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg">
                    <FolderKanban className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No project data to display.</p>
                    <p className="text-sm text-muted-foreground">Create some projects to see insights here.</p>
                </div>
            )
        }

        return (
            <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                <BarChart data={chartData} accessibilityLayer layout="vertical">
                    <CartesianGrid horizontal={false} />
                    <YAxis
                        dataKey={dataKey}
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        width={120}
                    />
                    <XAxis type="number" dataKey={chartKey} allowDecimals={false} />
                    <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={false}
                    />
                    <Bar
                        dataKey={chartKey}
                        fill={`var(--color-${chartKey})`}
                        radius={4}
                        layout="vertical"
                    >
                        <LabelList dataKey={chartKey} position="right" offset={8} className="fill-foreground text-sm" />
                    </Bar>
                </BarChart>
            </ChartContainer>
        );
    }

    return (
        <>
            <PageHeader
                title="Project Insights"
                description="Visualize project timelines, manage tasks, and track overall progress."
            />
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <BarChartIcon className="h-6 w-6 text-primary" />
                            Project Status Overview
                        </CardTitle>
                        <CardDescription>
                            A summary of all projects based on their current status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderChart(statusChartData, statusChartConfig, 'status', 'count')}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <User className="h-6 w-6 text-accent" />
                            Project Lead Workload
                        </CardTitle>
                        <CardDescription>
                            Number of projects assigned to each project lead.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderChart(leadChartData, leadChartConfig, 'lead', 'count')}
                    </CardContent>
                </Card>

                {/* Placeholder for future charts */}
                <Card className="border-2 border-dashed bg-secondary/50 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>More Visualizations Coming Soon</CardTitle>
                        <CardDescription>
                            This space will soon be populated with Gantt charts, Kanban boards, and real-time analytics.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </>
    );
}
