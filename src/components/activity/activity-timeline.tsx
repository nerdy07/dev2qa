/**
 * Activity Timeline Component
 * Displays activity logs for a request or user
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import {
    CheckCircle,
    XCircle,
    UserCheck,
    MessageSquare,
    AtSign,
    RefreshCw,
    FileEdit,
    Activity,
    Filter,
} from 'lucide-react';
import type { AuditLog, AuditLogAction } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActivityTimelineProps {
    activities: AuditLog[];
    loading?: boolean;
    showFilters?: boolean;
}

const actionIcons: Record<AuditLogAction, React.ElementType> = {
    create: FileEdit,
    update: FileEdit,
    delete: XCircle,
    status_change: RefreshCw,
    assign: UserCheck,
    approve: CheckCircle,
    reject: XCircle,
    revise: RefreshCw,
    comment: MessageSquare,
    mention: AtSign,
    export: FileEdit,
    login: Activity,
    logout: Activity,
};

const actionColors: Record<AuditLogAction, string> = {
    create: 'text-blue-500',
    update: 'text-blue-500',
    delete: 'text-red-500',
    status_change: 'text-orange-500',
    assign: 'text-purple-500',
    approve: 'text-green-500',
    reject: 'text-red-500',
    revise: 'text-yellow-500',
    comment: 'text-blue-500',
    mention: 'text-indigo-500',
    export: 'text-gray-500',
    login: 'text-gray-500',
    logout: 'text-gray-500',
};

const actionLabels: Record<AuditLogAction, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    status_change: 'Status Changed',
    assign: 'Assigned',
    approve: 'Approved',
    reject: 'Rejected',
    revise: 'Revised',
    comment: 'Commented',
    mention: 'Mentioned',
    export: 'Exported',
    login: 'Logged In',
    logout: 'Logged Out',
};

export function ActivityTimeline({ activities, loading, showFilters = true }: ActivityTimelineProps) {
    const [selectedActions, setSelectedActions] = React.useState<Set<AuditLogAction>>(new Set());

    const filteredActivities = React.useMemo(() => {
        if (selectedActions.size === 0) return activities;
        return activities.filter(activity => selectedActions.has(activity.action));
    }, [activities, selectedActions]);

    const toggleAction = (action: AuditLogAction) => {
        const newSelected = new Set(selectedActions);
        if (newSelected.has(action)) {
            newSelected.delete(action);
        } else {
            newSelected.add(action);
        }
        setSelectedActions(newSelected);
    };

    const clearFilters = () => {
        setSelectedActions(new Set());
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Timeline
                    </CardTitle>
                    <CardDescription>Loading activities...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Timeline
                    </CardTitle>
                    <CardDescription>No activity yet</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Activity Timeline
                        </CardTitle>
                        <CardDescription>
                            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
                        </CardDescription>
                    </div>
                    {showFilters && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filter
                                    {selectedActions.size > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {selectedActions.size}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Filter by Action</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(actionLabels).map(([action, label]) => (
                                    <DropdownMenuCheckboxItem
                                        key={action}
                                        checked={selectedActions.has(action as AuditLogAction)}
                                        onCheckedChange={() => toggleAction(action as AuditLogAction)}
                                    >
                                        {label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {selectedActions.size > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full"
                                            onClick={clearFilters}
                                        >
                                            Clear Filters
                                        </Button>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

                    {filteredActivities.map((activity, index) => {
                        const Icon = actionIcons[activity.action];
                        const iconColor = actionColors[activity.action];
                        const activityDate = activity.createdAt?.toDate?.() || new Date();

                        return (
                            <div key={activity.id || index} className="relative pl-12">
                                {/* Timeline dot */}
                                <div className="absolute left-0 top-1 flex items-center justify-center">
                                    <div className={`rounded-full bg-background p-2 border-2 border-border ${iconColor}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>
                                                    {activity.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{activity.userName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(activityDate, { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={iconColor}>
                                            {actionLabels[activity.action]}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        {activity.entityName && (
                                            <p className="text-sm">
                                                <span className="font-medium">{activity.entityType}:</span>{' '}
                                                {activity.entityName}
                                            </p>
                                        )}

                                        {activity.changes && activity.changes.length > 0 && (
                                            <div className="text-sm space-y-1">
                                                {activity.changes.map((change, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-muted-foreground">{change.field}:</span>
                                                        {change.oldValue && (
                                                            <span className="line-through text-red-500">
                                                                {String(change.oldValue)}
                                                            </span>
                                                        )}
                                                        {change.oldValue && change.newValue && (
                                                            <span className="text-muted-foreground">→</span>
                                                        )}
                                                        {change.newValue && (
                                                            <span className="text-green-500">
                                                                {String(change.newValue)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activity.metadata?.reason && (
                                            <p className="text-sm text-muted-foreground italic">
                                                "{activity.metadata.reason}"
                                            </p>
                                        )}

                                        <p className="text-xs text-muted-foreground">
                                            {format(activityDate, 'PPpp')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
