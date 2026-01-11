/**
 * Revision History Component
 * Displays the revision history for a certificate request
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { RefreshCw, User, Calendar, FileText } from 'lucide-react';
import type { RequestRevision } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface RevisionHistoryProps {
    revisions?: RequestRevision[];
    onCompare?: (rev1: number, rev2: number) => void;
}

export function RevisionHistory({ revisions, onCompare }: RevisionHistoryProps) {
    const [selectedRevisions, setSelectedRevisions] = React.useState<number[]>([]);

    if (!revisions || revisions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Revision History
                    </CardTitle>
                    <CardDescription>No revisions yet</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const handleRevisionSelect = (revNum: number) => {
        if (selectedRevisions.includes(revNum)) {
            setSelectedRevisions(selectedRevisions.filter(r => r !== revNum));
        } else if (selectedRevisions.length < 2) {
            setSelectedRevisions([...selectedRevisions, revNum]);
        }
    };

    const handleCompare = () => {
        if (selectedRevisions.length === 2 && onCompare) {
            onCompare(selectedRevisions[0], selectedRevisions[1]);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Revision History
                        </CardTitle>
                        <CardDescription>
                            {revisions.length} {revisions.length === 1 ? 'revision' : 'revisions'}
                        </CardDescription>
                    </div>
                    {selectedRevisions.length === 2 && onCompare && (
                        <Button onClick={handleCompare} size="sm">
                            Compare Selected
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {revisions.map((revision, index) => {
                    const isSelected = selectedRevisions.includes(revision.revisionNumber);
                    const revDate = revision.revisedAt?.toDate?.() || new Date();

                    return (
                        <div key={index}>
                            <div
                                className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                    }`}
                                onClick={() => handleRevisionSelect(revision.revisionNumber)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            Revision {revision.revisionNumber}
                                        </Badge>
                                        {index === revisions.length - 1 && (
                                            <Badge variant="default">Latest</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        {format(revDate, 'PPp')}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">{revision.revisedByName}</p>
                                            {revision.reason && (
                                                <p className="text-sm text-muted-foreground italic">
                                                    "{revision.reason}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <Separator className="my-2" />

                                    <div className="space-y-1">
                                        <div className="flex items-start gap-2">
                                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Task Title</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {revision.revisionData.taskTitle}
                                                </p>
                                            </div>
                                        </div>

                                        {revision.revisionData.description && (
                                            <div className="pl-6">
                                                <p className="text-sm font-medium">Description</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {revision.revisionData.description}
                                                </p>
                                            </div>
                                        )}

                                        {revision.revisionData.taskLink && (
                                            <div className="pl-6">
                                                <p className="text-sm font-medium">Task Link</p>
                                                <a
                                                    href={revision.revisionData.taskLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {revision.revisionData.taskLink}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {index < revisions.length - 1 && <Separator className="my-4" />}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
