'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/hooks/use-collection';
import type { CertificateRequest, User } from '@/lib/types';
import { Medal, TriangleAlert, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type QALeaderboardEntry = {
    userId: string;
    name: string;
    approvedCount: number;
};

type RequesterLeaderboardEntry = {
    userId: string;
    name: string;
    approvedCount: number;
    approvalRate: number;
};

const LeaderboardLoadingSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead><Skeleton className="h-5 w-12" /></TableHead><TableHead><Skeleton className="h-5 w-24" /></TableHead><TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-10" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead><Skeleton className="h-5 w-12" /></TableHead><TableHead><Skeleton className="h-5 w-24" /></TableHead><TableHead><Skeleton className="h-5 w-20" /></TableHead><TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-5 w-32" /></div></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-10" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
);


export default function LeaderboardsPage() {
    const { data: users, loading: usersLoading, error: usersError } = useCollection<User>('users');
    const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>('requests');

    const loading = usersLoading || requestsLoading;
    const error = usersError || requestsError;

    const qaLeaderboard = React.useMemo<QALeaderboardEntry[]>(() => {
        if (!users || !requests) return [];

        const qaTesters = users.filter(u => u.role === 'qa_tester');
        const approvedRequests = requests.filter(r => r.status === 'approved' && r.qaTesterId);

        const scores = approvedRequests.reduce((acc, req) => {
            acc[req.qaTesterId!] = (acc[req.qaTesterId!] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return qaTesters
            .map(qa => ({
                userId: qa.id,
                name: qa.name,
                approvedCount: scores[qa.id] || 0,
            }))
            .sort((a, b) => b.approvedCount - a.approvedCount);

    }, [users, requests]);

    const requesterLeaderboard = React.useMemo<RequesterLeaderboardEntry[]>(() => {
        if (!users || !requests) return [];

        const requesters = users.filter(u => u.role === 'requester');
        
        const stats = requests.reduce((acc, req) => {
            if (!acc[req.requesterId]) {
                acc[req.requesterId] = { approved: 0, rejected: 0, total: 0 };
            }
            if (req.status === 'approved') {
                acc[req.requesterId].approved++;
                acc[req.requesterId].total++;
            } else if (req.status === 'rejected') {
                acc[req.requesterId].rejected++;
                acc[req.requesterId].total++;
            }
            return acc;
        }, {} as Record<string, { approved: number, rejected: number, total: number }>);

        return requesters
            .map(requester => {
                const requesterStats = stats[requester.id] || { approved: 0, total: 0 };
                return {
                    userId: requester.id,
                    name: requester.name,
                    approvedCount: requesterStats.approved,
                    approvalRate: requesterStats.total > 0 ? Math.round((requesterStats.approved / requesterStats.total) * 100) : 0,
                };
            })
            // Sort by approval rate, then by number of approvals as a tie-breaker
            .sort((a, b) => {
                if (b.approvalRate !== a.approvalRate) {
                    return b.approvalRate - a.approvalRate;
                }
                return b.approvedCount - a.approvedCount;
            });

    }, [users, requests]);

    if (loading) {
        return (
            <>
                <PageHeader title="Leaderboards" description="See who is leading the way in quality and efficiency." />
                <LeaderboardLoadingSkeleton />
            </>
        )
    }

    if (error) {
        return (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Error Loading Leaderboards</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        );
      }

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
        if (rank === 3) return <Medal className="h-5 w-5 text-yellow-700" />;
        return <span className="text-sm font-medium">{rank}</span>;
    }

    return (
        <>
            <PageHeader title="Leaderboards" description="See who is leading the way in quality and efficiency." />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-primary"/> Top QA Testers</CardTitle>
                        <CardDescription>Ranked by the total number of approved certificates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Tester</TableHead>
                                    <TableHead className="text-right">Approved</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {qaLeaderboard.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No data available.</TableCell></TableRow>}
                                {qaLeaderboard.slice(0, 10).map((tester, index) => (
                                    <TableRow key={tester.userId}>
                                        <TableCell className="font-bold text-lg">{getRankIcon(index + 1)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>{tester.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{tester.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-lg">{tester.approvedCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-primary"/> Top Requesters</CardTitle>
                        <CardDescription>Ranked by approval rate, then by total approvals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead className="text-right">Approved</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requesterLeaderboard.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No data available.</TableCell></TableRow>}
                                {requesterLeaderboard.slice(0, 10).map((requester, index) => (
                                    <TableRow key={requester.userId}>
                                        <TableCell className="font-bold text-lg">{getRankIcon(index + 1)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>{requester.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{requester.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-primary">{requester.approvalRate}%</TableCell>
                                        <TableCell className="text-right font-semibold text-lg">{requester.approvedCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
