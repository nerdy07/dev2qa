/**
 * QA Queue Filters Component
 * Provides filtering controls for the QA queue
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { RequestStatus } from '@/lib/types';

export interface QAQueueFilters {
    status?: RequestStatus[];
    qaTesterId?: string;
    projectName?: string;
    teamName?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

interface QAQueueFiltersProps {
    filters: QAQueueFilters;
    onFiltersChange: (filters: QAQueueFilters) => void;
    qaTesters?: Array<{ id: string; name: string }>;
    projects?: string[];
    teams?: string[];
}

const statusOptions: { value: RequestStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_review', label: 'In Review' },
    { value: 'needs_revision', label: 'Needs Revision' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

export function QAQueueFiltersComponent({
    filters,
    onFiltersChange,
    qaTesters = [],
    projects = [],
    teams = [],
}: QAQueueFiltersProps) {
    const hasActiveFilters = React.useMemo(() => {
        return (
            (filters.status && filters.status.length > 0) ||
            filters.qaTesterId ||
            filters.projectName ||
            filters.teamName ||
            filters.search ||
            filters.dateFrom ||
            filters.dateTo
        );
    }, [filters]);

    const clearFilters = () => {
        onFiltersChange({});
    };

    const toggleStatus = (status: RequestStatus) => {
        const currentStatuses = filters.status || [];
        const newStatuses = currentStatuses.includes(status)
            ? currentStatuses.filter(s => s !== status)
            : [...currentStatuses, status];

        onFiltersChange({
            ...filters,
            status: newStatuses.length > 0 ? newStatuses : undefined,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                </h3>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                    id="search"
                    placeholder="Search by task title..."
                    value={filters.search || ''}
                    onChange={(e) =>
                        onFiltersChange({ ...filters, search: e.target.value || undefined })
                    }
                />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((option) => {
                        const isSelected = filters.status?.includes(option.value);
                        return (
                            <Badge
                                key={option.value}
                                variant={isSelected ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => toggleStatus(option.value)}
                            >
                                {option.label}
                                {isSelected && <X className="h-3 w-3 ml-1" />}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* QA Tester Filter */}
            {qaTesters.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="qa-tester">QA Tester</Label>
                    <Select
                        value={filters.qaTesterId || 'all'}
                        onValueChange={(value) =>
                            onFiltersChange({
                                ...filters,
                                qaTesterId: value === 'all' ? undefined : value,
                            })
                        }
                    >
                        <SelectTrigger id="qa-tester">
                            <SelectValue placeholder="All QA Testers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All QA Testers</SelectItem>
                            {qaTesters.map((tester) => (
                                <SelectItem key={tester.id} value={tester.id}>
                                    {tester.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Project Filter */}
            {projects.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                        value={filters.projectName || 'all'}
                        onValueChange={(value) =>
                            onFiltersChange({
                                ...filters,
                                projectName: value === 'all' ? undefined : value,
                            })
                        }
                    >
                        <SelectTrigger id="project">
                            <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map((project) => (
                                <SelectItem key={project} value={project}>
                                    {project}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Team Filter */}
            {teams.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="team">Team</Label>
                    <Select
                        value={filters.teamName || 'all'}
                        onValueChange={(value) =>
                            onFiltersChange({
                                ...filters,
                                teamName: value === 'all' ? undefined : value,
                            })
                        }
                    >
                        <SelectTrigger id="team">
                            <SelectValue placeholder="All Teams" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Teams</SelectItem>
                            {teams.map((team) => (
                                <SelectItem key={team} value={team}>
                                    {team}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Date Range Filter */}
            <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'From'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={filters.dateFrom}
                                onSelect={(date) =>
                                    onFiltersChange({ ...filters, dateFrom: date })
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateTo ? format(filters.dateTo, 'PP') : 'To'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={filters.dateTo}
                                onSelect={(date) =>
                                    onFiltersChange({ ...filters, dateTo: date })
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Active Filters:</p>
                    <div className="flex flex-wrap gap-2">
                        {filters.status && filters.status.length > 0 && (
                            <Badge variant="secondary">
                                Status: {filters.status.length}
                            </Badge>
                        )}
                        {filters.qaTesterId && (
                            <Badge variant="secondary">
                                QA Tester: {qaTesters.find(t => t.id === filters.qaTesterId)?.name}
                            </Badge>
                        )}
                        {filters.projectName && (
                            <Badge variant="secondary">Project: {filters.projectName}</Badge>
                        )}
                        {filters.teamName && (
                            <Badge variant="secondary">Team: {filters.teamName}</Badge>
                        )}
                        {filters.search && (
                            <Badge variant="secondary">Search: "{filters.search}"</Badge>
                        )}
                        {(filters.dateFrom || filters.dateTo) && (
                            <Badge variant="secondary">
                                Date: {filters.dateFrom ? format(filters.dateFrom, 'PP') : '...'} -{' '}
                                {filters.dateTo ? format(filters.dateTo, 'PP') : '...'}
                            </Badge>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
