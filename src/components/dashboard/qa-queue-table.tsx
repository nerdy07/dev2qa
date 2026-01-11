/**
 * Enhanced QA Queue Table Component
 * Advanced table for managing QA queue with filtering, sorting, and batch operations
 */

'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, ArrowUpDown, CheckCircle, XCircle, UserCheck, Eye } from 'lucide-react';
import type { CertificateRequest } from '@/lib/types';
import { getStatusVariant, getStatusLabel } from '@/lib/request-workflow';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QAQueueTableProps {
    requests: CertificateRequest[];
    onBatchAction?: (action: string, requestIds: string[]) => void;
    onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

type SortColumn = 'createdAt' | 'status' | 'requesterName' | 'taskTitle';
type SortDirection = 'asc' | 'desc';

export function QAQueueTable({ requests, onBatchAction, onSort }: QAQueueTableProps) {
    const [selectedRequests, setSelectedRequests] = React.useState<Set<string>>(new Set());
    const [sortColumn, setSortColumn] = React.useState<SortColumn>('createdAt');
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

    const toggleSelectAll = () => {
        if (selectedRequests.size === requests.length) {
            setSelectedRequests(new Set());
        } else {
            setSelectedRequests(new Set(requests.map(r => r.id)));
        }
    };

    const toggleSelectRequest = (requestId: string) => {
        const newSelected = new Set(selectedRequests);
        if (newSelected.has(requestId)) {
            newSelected.delete(requestId);
        } else {
            newSelected.add(requestId);
        }
        setSelectedRequests(newSelected);
    };

    const handleSort = (column: SortColumn) => {
        const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortColumn(column);
        setSortDirection(newDirection);
        onSort?.(column, newDirection);
    };

    const handleBatchAction = (action: string) => {
        if (selectedRequests.size > 0 && onBatchAction) {
            onBatchAction(action, Array.from(selectedRequests));
            setSelectedRequests(new Set());
        }
    };

    const getRowPriority = (request: CertificateRequest): 'high' | 'medium' | 'low' => {
        const createdAt = request.createdAt?.toDate?.() || new Date();
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > 7) return 'high';
        if (ageInDays > 3) return 'medium';
        return 'low';
    };

    const sortedRequests = React.useMemo(() => {
        return [...requests].sort((a, b) => {
            let comparison = 0;

            switch (sortColumn) {
                case 'createdAt':
                    const aDate = a.createdAt?.toDate?.() || new Date(0);
                    const bDate = b.createdAt?.toDate?.() || new Date(0);
                    comparison = aDate.getTime() - bDate.getTime();
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'requesterName':
                    comparison = a.requesterName.localeCompare(b.requesterName);
                    break;
                case 'taskTitle':
                    comparison = a.taskTitle.localeCompare(b.taskTitle);
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [requests, sortColumn, sortDirection]);

    return (
        <div className="space-y-4">
            {/* Batch Actions Toolbar */}
            {selectedRequests.size > 0 && onBatchAction && (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                        {selectedRequests.size} selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBatchAction('assign-to-me')}
                        >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign to Me
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBatchAction('mark-in-review')}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Mark In Review
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequests(new Set())}
                        >
                            Clear Selection
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={selectedRequests.size === requests.length && requests.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-12">Priority</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('taskTitle')}
                                    className="hover:bg-transparent"
                                >
                                    Task
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('requesterName')}
                                    className="hover:bg-transparent"
                                >
                                    Requester
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('status')}
                                    className="hover:bg-transparent"
                                >
                                    Status
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>Project / Team</TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('createdAt')}
                                    className="hover:bg-transparent"
                                >
                                    Age
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                    No requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedRequests.map((request) => {
                                const priority = getRowPriority(request);
                                const isSelected = selectedRequests.has(request.id);
                                const createdAt = request.createdAt?.toDate?.() || new Date();

                                return (
                                    <TableRow
                                        key={request.id}
                                        className={cn(
                                            'cursor-pointer hover:bg-muted/50',
                                            isSelected && 'bg-muted',
                                            priority === 'high' && 'border-l-4 border-l-red-500',
                                            priority === 'medium' && 'border-l-4 border-l-yellow-500'
                                        )}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelectRequest(request.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {priority === 'high' && (
                                                <Badge variant="destructive" className="text-xs">
                                                    High
                                                </Badge>
                                            )}
                                            {priority === 'medium' && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Med
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/dashboard/requests/${request.id}`}
                                                className="font-medium hover:underline"
                                            >
                                                {request.taskTitle}
                                            </Link>
                                            {request.certificateRequired === false && (
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                    No Cert
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{request.requesterName}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(request.status)}>
                                                {getStatusLabel(request.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="font-medium">{request.associatedProject}</div>
                                                <div className="text-muted-foreground">{request.associatedTeam}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {formatDistanceToNow(createdAt, { addSuffix: true })}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(createdAt, 'PP')}
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/requests/${request.id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {request.status === 'pending' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() => onBatchAction?.('assign-to-me', [request.id])}
                                                            >
                                                                <UserCheck className="h-4 w-4 mr-2" />
                                                                Assign to Me
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => onBatchAction?.('approve', [request.id])}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Quick Approve
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
