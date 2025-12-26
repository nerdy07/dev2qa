'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/hooks/use-collection';
import type { CertificateRequest, User, DesignRequest, Project } from '@/lib/types';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Medal, TriangleAlert, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Heart, Crown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationWrapper } from '@/components/common/pagination-wrapper';

type QALeaderboardEntry = {
    userId: string;
    name: string;
    photoURL?: string;
    approvedCount: number;
    likes?: number;
    userLiked?: boolean;
};

type RequesterLeaderboardEntry = {
    userId: string;
    name: string;
    photoURL?: string;
    approvedCount: number;
    approvalRate: number;
    likes?: number;
    userLiked?: boolean;
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
    const { data: designRequests, loading: designRequestsLoading, error: designRequestsError } = useCollection<DesignRequest>('designRequests');
    const { data: projects, loading: projectsLoading, error: projectsError } = useCollection<Project>('projects');

    // Don't wait for all collections - show page once essential data is loaded
    // designRequests and projects are optional - page should work without them
    const loading = usersLoading || requestsLoading;
    const error = usersError || requestsError || designRequestsError || projectsError;

    const { user: currentUser, customRoles, rolesLoading } = useAuth();
    const { toast } = useToast();

    // Helper function to check if a user has a specific permission
    // This replicates the permission checking logic from auth-provider
    const userHasPermission = React.useCallback((user: User, permission: string, customRolesMap: Map<string, Role>): boolean => {
        if (!user) return false;

        const roles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
        if (roles.length === 0) return false;

        // Check each role for the permission
        for (const roleName of roles) {
            if (!roleName || typeof roleName !== 'string') continue;

            const normalizedRole = roleName.toLowerCase();
            const baseVariations = [
                normalizedRole,
                normalizedRole.replace(/_/g, ''),
                normalizedRole.replace(/\s+/g, '_'),
                normalizedRole.replace(/\s+/g, ''),
                normalizedRole.replace(/_/g, ' '),
            ];

            const roleVariations: string[] = [];
            baseVariations.forEach(base => {
                roleVariations.push(base);
                roleVariations.push(base.replace(/s$/, ''));
                if (!base.endsWith('s')) {
                    roleVariations.push(base + 's');
                }
            });
            roleVariations.push(roleName);
            roleVariations.push(roleName.toLowerCase());
            roleVariations.push(roleName.toUpperCase());

            // Check custom roles from Firestore ONLY (no hardcoded fallback)
            for (const variation of roleVariations) {
                const lowerVariation = variation.toLowerCase();
                const customRole = customRolesMap.get(lowerVariation);
                if (customRole && customRole.permissions && Array.isArray(customRole.permissions)) {
                    if (customRole.permissions.includes(permission)) {
                        return true;
                    }
                }

                // Also try without underscores
                const noUnderscore = lowerVariation.replace(/_/g, '');
                const customRoleNoUnderscore = customRolesMap.get(noUnderscore);
                if (customRoleNoUnderscore && customRoleNoUnderscore.permissions && Array.isArray(customRoleNoUnderscore.permissions)) {
                    if (customRoleNoUnderscore.permissions.includes(permission)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }, []);

    // State to store likes data
    const [qaLikesData, setQaLikesData] = React.useState<Record<string, { likes: number; userLiked: boolean }>>({});
    const [requesterLikesData, setRequesterLikesData] = React.useState<Record<string, { likes: number; userLiked: boolean }>>({});
    const [likingUserId, setLikingUserId] = React.useState<string | null>(null);
    const [loadingLikes, setLoadingLikes] = React.useState(true);

    // State for selected month
    const [selectedMonth, setSelectedMonth] = React.useState<Date>(new Date());
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [qaPage, setQaPage] = React.useState(1);
    const [requesterPage, setRequesterPage] = React.useState(1);

    React.useEffect(() => {
        setQaPage(1);
        setRequesterPage(1);
    }, [selectedMonth, rowsPerPage]);

    const paginate = React.useCallback(<T,>(items: T[], page: number, perPage: number) => {
        const start = (page - 1) * perPage;
        return items.slice(start, start + perPage);
    }, []);

    const qaLeaderboard = React.useMemo<QALeaderboardEntry[]>(() => {
        if (!users || !requests) return [];

        // If roles are still loading, show users who have approved requests (fallback)
        // Once roles load, we'll filter by permissions
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);

        const approvedRequests = requests.filter(r => {
            if (r.status !== 'approved' || !r.qaTesterId) return false;
            const approvalDate = r.updatedAt?.toDate?.() || r.createdAt?.toDate?.();
            if (!approvalDate) return false;
            return approvalDate >= monthStart && approvalDate <= monthEnd;
        });

        const scores = approvedRequests.reduce((acc, req) => {
            acc[req.qaTesterId!] = (acc[req.qaTesterId!] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const qaTesterIds = new Set(Object.keys(scores));

        // If roles are still loading or customRoles is not available, just show users who approved
        if (rolesLoading || !customRoles || customRoles.size === 0) {
            const qaTesters = users.filter(u => qaTesterIds.has(u.id));
            return qaTesters.map(qa => {
                const likesInfo = qaLikesData[qa.id] || { likes: 0, userLiked: false };
                return {
                    userId: qa.id,
                    name: qa.name,
                    photoURL: qa.photoURL,
                    approvedCount: scores[qa.id] || 0,
                    likes: likesInfo.likes,
                    userLiked: likesInfo.userLiked,
                };
            }).sort((a, b) => b.approvedCount - a.approvedCount);
        }

        // Filter users to only those who have permission to approve requests
        // Check both requests:approve and requests:read_all permissions
        const qaTesters = users.filter(u => {
            // Include if they have approved at least one request (they definitely have the permission)
            if (qaTesterIds.has(u.id)) return true;

            // Check if user has permission to approve requests based on their roles
            return userHasPermission(u, ALL_PERMISSIONS.REQUESTS.APPROVE, customRoles) ||
                userHasPermission(u, ALL_PERMISSIONS.REQUESTS.READ_ALL, customRoles);
        });

        return qaTesters
            .map(qa => {
                const likesInfo = qaLikesData[qa.id] || { likes: 0, userLiked: false };
                return {
                    userId: qa.id,
                    name: qa.name,
                    photoURL: qa.photoURL,
                    approvedCount: scores[qa.id] || 0,
                    likes: likesInfo.likes,
                    userLiked: likesInfo.userLiked,
                };
            })
            .sort((a, b) => b.approvedCount - a.approvedCount);

    }, [users, requests, qaLikesData, selectedMonth, customRoles, rolesLoading, userHasPermission]);

    // Track previous top user to detect changes
    const previousTopQA = React.useRef<string | null>(null);
    const previousTopRequester = React.useRef<string | null>(null);

    // Detect top user changes and send notifications
    React.useEffect(() => {
        if (qaLeaderboard.length > 0) {
            const currentTop = qaLeaderboard[0]?.userId;
            if (previousTopQA.current !== null && previousTopQA.current !== currentTop) {
                // Top user changed - send notifications
                fetch('/api/notifications/leaderboard-top-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topUserId: currentTop,
                        leaderboardType: 'qa',
                        previousTopUserId: previousTopQA.current,
                        topUserName: qaLeaderboard[0]?.name,
                    }),
                }).catch(err => console.error('Failed to send notifications:', err));
            }
            previousTopQA.current = currentTop;
        }
    }, [qaLeaderboard[0]?.userId]);

    // Load likes data for QA leaderboard with real-time updates
    React.useEffect(() => {
        if (!qaLeaderboard.length || !db) {
            if (!qaLeaderboard.length) {
                setQaLikesData({});
                setLoadingLikes(false);
            }
            return;
        }

        setLoadingLikes(true);
        const unsubscribes: (() => void)[] = [];

        qaLeaderboard.forEach((entry) => {
            const likesDocRef = doc(db, 'leaderboardLikes', `qa_${entry.userId}`);

            // Real-time listener for likes count
            const unsubscribe = onSnapshot(likesDocRef, (docSnap) => {
                const likesData = docSnap.data();
                setQaLikesData(prev => ({
                    ...prev,
                    [entry.userId]: {
                        ...prev[entry.userId],
                        likes: likesData?.likes || 0,
                    }
                }));
            }, (error) => {
                console.error('Error listening to likes:', error);
            });

            unsubscribes.push(unsubscribe);

            // Check if current user liked (one-time check)
            if (currentUser) {
                const userLikeRef = doc(db, 'leaderboardLikes', `qa_${entry.userId}`, 'userLikes', currentUser.id);
                getDoc(userLikeRef).then((userLikeDoc) => {
                    setQaLikesData(prev => ({
                        ...prev,
                        [entry.userId]: {
                            ...prev[entry.userId],
                            userLiked: userLikeDoc.exists(),
                            likes: prev[entry.userId]?.likes || 0,
                        }
                    }));
                });
            }
        });

        setLoadingLikes(false);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [qaLeaderboard.map(e => e.userId).join(','), currentUser?.id]);

    const handleLike = async (entry: QALeaderboardEntry | RequesterLeaderboardEntry, type: 'qa' | 'requester') => {
        if (!currentUser || !db) {
            toast({
                title: 'Please log in',
                description: 'You need to be logged in to like a leaderboard entry.',
                variant: 'destructive',
            });
            return;
        }

        const likeKey = `${type}_${entry.userId}`;
        if (likingUserId === likeKey) {
            return; // Already processing
        }

        setLikingUserId(likeKey);
        try {
            const likesDocRef = doc(db, 'leaderboardLikes', `${type}_${entry.userId}`);
            const userLikeRef = doc(db, 'leaderboardLikes', `${type}_${entry.userId}`, 'userLikes', currentUser.id);

            // Use a batch write to ensure atomicity
            const { writeBatch } = await import('firebase/firestore');
            const batch = writeBatch(db);

            const userLikeDoc = await getDoc(userLikeRef);
            const isLiked = userLikeDoc.exists();
            const likesDoc = await getDoc(likesDocRef);
            const currentLikes = likesDoc.data()?.likes || 0;

            if (isLiked) {
                // Unlike - decrement likes and delete user like document
                if (currentLikes > 0) {
                    batch.update(likesDocRef, {
                        likes: increment(-1),
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    // If likes is 0 or less, set it to 0
                    batch.set(likesDocRef, {
                        userId: entry.userId,
                        type,
                        likes: 0,
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                }
                batch.delete(userLikeRef);
            } else {
                // Like - increment likes and create user like document
                if (!likesDoc.exists()) {
                    batch.set(likesDocRef, {
                        userId: entry.userId,
                        type,
                        likes: 1,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    batch.update(likesDocRef, {
                        likes: increment(1),
                        updatedAt: serverTimestamp(),
                    });
                }

                batch.set(userLikeRef, {
                    userId: currentUser.id,
                    createdAt: serverTimestamp(),
                });
            }

            // Commit the batch
            await batch.commit();

            // Update local state immediately for better UX
            const setLikesData = type === 'qa' ? setQaLikesData : setRequesterLikesData;
            const currentLikesData = type === 'qa' ? qaLikesData : requesterLikesData;

            setLikesData(prev => ({
                ...prev,
                [entry.userId]: {
                    likes: isLiked ? Math.max(0, (currentLikesData[entry.userId]?.likes || 1) - 1) : ((currentLikesData[entry.userId]?.likes || 0) + 1),
                    userLiked: !isLiked,
                }
            }));

            toast({
                title: isLiked ? 'Unliked' : 'Liked!',
                description: isLiked ? 'You unliked this entry.' : 'You liked this entry!',
            });
        } catch (error: any) {
            console.error('Error toggling like:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update like. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLikingUserId(null);
        }
    };

    const requesterLeaderboard = React.useMemo<RequesterLeaderboardEntry[]>(() => {
        if (!users || !requests) return [];

        // Handle optional collections gracefully
        const safeDesignRequests = designRequests || [];
        const safeProjects = projects || [];

        // Filter requests and designs to selected month
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);

        const monthlyRequests = requests.filter(req => {
            const requestDate = req.createdAt?.toDate?.() || req.updatedAt?.toDate?.();
            if (!requestDate) return false;
            return requestDate >= monthStart && requestDate <= monthEnd;
        });

        const monthlyDesigns = safeDesignRequests.filter(design => {
            const designDate = design.createdAt?.toDate?.() || design.updatedAt?.toDate?.();
            if (!designDate) return false;
            return designDate >= monthStart && designDate <= monthEnd;
        });

        // Get all users who have tasks assigned (from projects)
        const usersWithTasks = new Set<string>();
        safeProjects.forEach(project => {
            project.tasks?.forEach(task => {
                if (task.assignedTo) {
                    usersWithTasks.add(task.assignedTo);
                }
            });
        });

        // Calculate stats from requests
        const requestStats = monthlyRequests.reduce((acc, req) => {
            if (!acc[req.requesterId]) {
                acc[req.requesterId] = { approved: 0, rejected: 0, total: 0 };
            }
            if (req.status === 'approved') {
                acc[req.requesterId].approved++;
                acc[req.requesterId].total++;
            } else if (req.status === 'rejected') {
                acc[req.requesterId].rejected++;
                acc[req.requesterId].total++;
            } else {
                acc[req.requesterId].total++;
            }
            return acc;
        }, {} as Record<string, { approved: number, rejected: number, total: number }>);

        // Calculate stats from designs (treat as approved requests for leaderboard)
        const designStats = monthlyDesigns.reduce((acc, design) => {
            if (!acc[design.designerId]) {
                acc[design.designerId] = { approved: 0, rejected: 0, total: 0 };
            }
            if (design.status === 'approved') {
                acc[design.designerId].approved++;
                acc[design.designerId].total++;
            } else if (design.status === 'rejected') {
                acc[design.designerId].rejected++;
                acc[design.designerId].total++;
            } else {
                acc[design.designerId].total++;
            }
            return acc;
        }, {} as Record<string, { approved: number, rejected: number, total: number }>);

        // Merge request and design stats
        const allStats = { ...requestStats };
        Object.keys(designStats).forEach(designerId => {
            if (!allStats[designerId]) {
                allStats[designerId] = { approved: 0, rejected: 0, total: 0 };
            }
            allStats[designerId].approved += designStats[designerId].approved;
            allStats[designerId].rejected += designStats[designerId].rejected;
            allStats[designerId].total += designStats[designerId].total;
        });

        // Filter users to include:
        // 1. Users who have submitted requests or designs
        // 2. Users who have tasks assigned AND have permission to create requests
        // 3. Designers who have submitted designs
        const requesterIds = new Set([
            ...Object.keys(requestStats),
            ...Object.keys(designStats),
            ...Array.from(usersWithTasks)
        ]);

        // Filter users based on permissions from Firestore roles only (no hardcoded roles)
        // Include:
        // 1. Users who have submitted requests/designs or have tasks assigned
        // 2. Users who have permission to create requests or designs (once roles are loaded)
        const requesters = users.filter(u => {
            // Always include if they have submitted requests/designs or have tasks
            if (requesterIds.has(u.id)) return true;

            // If roles are loaded, also check permissions
            if (!rolesLoading && customRoles && customRoles.size > 0) {
                return userHasPermission(u, ALL_PERMISSIONS.REQUESTS.CREATE, customRoles) ||
                    userHasPermission(u, ALL_PERMISSIONS.DESIGNS.CREATE, customRoles);
            }

            // While roles are loading, only show users who have submitted
            return false;
        });

        return requesters
            .map(requester => {
                const requesterStats = allStats[requester.id] || { approved: 0, total: 0 };
                const likesInfo = requesterLikesData[requester.id] || { likes: 0, userLiked: false };
                return {
                    userId: requester.id,
                    name: requester.name,
                    photoURL: requester.photoURL,
                    approvedCount: requesterStats.approved,
                    approvalRate: requesterStats.total > 0 ? Math.round((requesterStats.approved / requesterStats.total) * 100) : 0,
                    likes: likesInfo.likes,
                    userLiked: likesInfo.userLiked,
                };
            })
            // Sort by approval rate, then by number of approvals as a tie-breaker
            .sort((a, b) => {
                if (b.approvalRate !== a.approvalRate) {
                    return b.approvalRate - a.approvalRate;
                }
                return b.approvedCount - a.approvedCount;
            });

    }, [users, requests, designRequests, projects, requesterLikesData, selectedMonth, customRoles, rolesLoading, userHasPermission]);

    // Detect top requester changes and send notifications
    React.useEffect(() => {
        if (requesterLeaderboard.length > 0) {
            const currentTop = requesterLeaderboard[0]?.userId;
            if (previousTopRequester.current !== null && previousTopRequester.current !== currentTop) {
                // Top user changed - send notifications
                fetch('/api/notifications/leaderboard-top-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topUserId: currentTop,
                        leaderboardType: 'requester',
                        previousTopUserId: previousTopRequester.current,
                        topUserName: requesterLeaderboard[0]?.name,
                    }),
                }).catch(err => console.error('Failed to send notifications:', err));
            }
            previousTopRequester.current = currentTop;
        }
    }, [requesterLeaderboard[0]?.userId]);

    // Load likes data for Requester leaderboard with real-time updates
    React.useEffect(() => {
        if (!requesterLeaderboard.length || !db) {
            if (!requesterLeaderboard.length) {
                setRequesterLikesData({});
                setLoadingLikes(false);
            }
            return;
        }

        setLoadingLikes(true);
        const unsubscribes: (() => void)[] = [];

        requesterLeaderboard.forEach((entry) => {
            const likesDocRef = doc(db, 'leaderboardLikes', `requester_${entry.userId}`);

            // Real-time listener for likes count
            const unsubscribe = onSnapshot(likesDocRef, (docSnap) => {
                const likesData = docSnap.data();
                setRequesterLikesData(prev => ({
                    ...prev,
                    [entry.userId]: {
                        ...prev[entry.userId],
                        likes: likesData?.likes || 0,
                    }
                }));
            }, (error) => {
                console.error('Error listening to likes:', error);
            });

            unsubscribes.push(unsubscribe);

            // Check if current user liked (one-time check)
            if (currentUser) {
                const userLikeRef = doc(db, 'leaderboardLikes', `requester_${entry.userId}`, 'userLikes', currentUser.id);
                getDoc(userLikeRef).then((userLikeDoc) => {
                    setRequesterLikesData(prev => ({
                        ...prev,
                        [entry.userId]: {
                            ...prev[entry.userId],
                            userLiked: userLikeDoc.exists(),
                            likes: prev[entry.userId]?.likes || 0,
                        }
                    }));
                });
            }
        });

        setLoadingLikes(false);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [requesterLeaderboard.map(e => e.userId).join(','), currentUser?.id]);

    const paginatedQa = React.useMemo(
        () => paginate(qaLeaderboard, qaPage, rowsPerPage),
        [qaLeaderboard, qaPage, rowsPerPage, paginate]
    );

    const paginatedRequester = React.useMemo(
        () => paginate(requesterLeaderboard, requesterPage, rowsPerPage),
        [requesterLeaderboard, requesterPage, rowsPerPage, paginate]
    );

    const qaRowOffset = (qaPage - 1) * rowsPerPage;
    const requesterRowOffset = (requesterPage - 1) * rowsPerPage;

    if (loading) {
        return (
            <>
                <PageHeader
                    title="Leaderboards"
                    description={`See who is leading the way in quality and efficiency.`}
                >
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Select
                            value={format(selectedMonth, 'yyyy-MM')}
                            onValueChange={(value) => {
                                const [year, month] = value.split('-').map(Number);
                                setSelectedMonth(new Date(year, month - 1, 1));
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue>
                                    {format(selectedMonth, 'MMMM yyyy')}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const monthDate = subMonths(new Date(), i);
                                    return (
                                        <SelectItem key={format(monthDate, 'yyyy-MM')} value={format(monthDate, 'yyyy-MM')}>
                                            {format(monthDate, 'MMMM yyyy')}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                            disabled={startOfMonth(selectedMonth) >= startOfMonth(new Date())}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        {startOfMonth(selectedMonth).getTime() !== startOfMonth(new Date()).getTime() && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedMonth(new Date())}
                            >
                                Current Month
                            </Button>
                        )}
                    </div>
                </PageHeader>
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
            <PageHeader
                title="Leaderboards"
                description={`See who is leading the way in quality and efficiency.`}
            >
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Select
                        value={format(selectedMonth, 'yyyy-MM')}
                        onValueChange={(value) => {
                            const [year, month] = value.split('-').map(Number);
                            setSelectedMonth(new Date(year, month - 1, 1));
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue>
                                {format(selectedMonth, 'MMMM yyyy')}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => {
                                const monthDate = subMonths(new Date(), i);
                                return (
                                    <SelectItem key={format(monthDate, 'yyyy-MM')} value={format(monthDate, 'yyyy-MM')}>
                                        {format(monthDate, 'MMMM yyyy')}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                        disabled={startOfMonth(selectedMonth) >= startOfMonth(new Date())}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {startOfMonth(selectedMonth).getTime() !== startOfMonth(new Date()).getTime() && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMonth(new Date())}
                        >
                            Current Month
                        </Button>
                    )}
                </div>
            </PageHeader>

            {/* Top Performers Highlight Cards - Only show if there are approvals */}
            {qaLeaderboard.length > 0 && qaLeaderboard[0]?.approvedCount > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {qaLeaderboard[0]?.approvedCount > 0 && (
                        <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Crown className="h-6 w-6 text-yellow-500" />
                                    Top QA Tester
                                </CardTitle>
                                <CardDescription>Our leading QA tester for {format(selectedMonth, 'MMMM yyyy')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20 border-4 border-yellow-400">
                                        <AvatarImage src={qaLeaderboard[0]?.photoURL} alt={qaLeaderboard[0]?.name} />
                                        <AvatarFallback className="text-2xl">{qaLeaderboard[0]?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold">{qaLeaderboard[0]?.name}</h3>
                                        <p className="text-muted-foreground">QA Tester</p>
                                        <p className="text-lg font-semibold text-primary mt-2">
                                            {qaLeaderboard[0]?.approvedCount} Approved Certificates
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleLike(qaLeaderboard[0], 'qa')}
                                        disabled={likingUserId === `qa_${qaLeaderboard[0]?.userId}` || loadingLikes}
                                        className={cn(qaLeaderboard[0]?.userLiked && "text-red-500 border-red-500")}
                                    >
                                        {likingUserId === `qa_${qaLeaderboard[0]?.userId}` ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Heart className={cn("h-4 w-4 mr-2", qaLeaderboard[0]?.userLiked && "fill-current")} />
                                                {qaLeaderboard[0]?.likes || 0}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {requesterLeaderboard.length > 0 && requesterLeaderboard[0]?.approvedCount > 0 && (
                        <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Crown className="h-6 w-6 text-yellow-500" />
                                    Top Requester
                                </CardTitle>
                                <CardDescription>Our leading requester for {format(selectedMonth, 'MMMM yyyy')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20 border-4 border-yellow-400">
                                        <AvatarImage src={requesterLeaderboard[0]?.photoURL} alt={requesterLeaderboard[0]?.name} />
                                        <AvatarFallback className="text-2xl">{requesterLeaderboard[0]?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold">{requesterLeaderboard[0]?.name}</h3>
                                        <p className="text-muted-foreground">Requester</p>
                                        <p className="text-lg font-semibold text-primary mt-2">
                                            {requesterLeaderboard[0]?.approvalRate}% Approval Rate
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {requesterLeaderboard[0]?.approvedCount} Approved
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleLike(requesterLeaderboard[0], 'requester')}
                                        disabled={likingUserId === `requester_${requesterLeaderboard[0]?.userId}` || loadingLikes}
                                        className={cn(requesterLeaderboard[0]?.userLiked && "text-red-500 border-red-500")}
                                    >
                                        {likingUserId === `requester_${requesterLeaderboard[0]?.userId}` ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Heart className={cn("h-4 w-4 mr-2", requesterLeaderboard[0]?.userLiked && "fill-current")} />
                                                {requesterLeaderboard[0]?.likes || 0}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-primary" /> Top QA Testers</CardTitle>
                        <CardDescription>Ranked by the total number of approved certificates for {format(selectedMonth, 'MMMM yyyy')}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Tester</TableHead>
                                    <TableHead className="text-right">Approved</TableHead>
                                    <TableHead className="w-[80px]">Engage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {qaLeaderboard.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No data available.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedQa.map((tester, index) => {
                                        const globalRank = qaRowOffset + index + 1;
                                        const isTop = globalRank === 1;
                                        return (
                                            <TableRow
                                                key={tester.userId}
                                                className={cn(isTop && "bg-yellow-50 dark:bg-yellow-950/10")}
                                            >
                                                <TableCell className="font-bold text-lg">{getRankIcon(globalRank)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={tester.photoURL} alt={tester.name} />
                                                            <AvatarFallback>{tester.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{tester.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-lg">{tester.approvedCount}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleLike(tester, 'qa')}
                                                        disabled={likingUserId === `qa_${tester.userId}` || loadingLikes}
                                                        className={cn(tester.userLiked && "text-red-500")}
                                                        aria-label={`Applaud ${tester.name}`}
                                                    >
                                                        {likingUserId === `qa_${tester.userId}` ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Heart className={cn("h-4 w-4", tester.userLiked && "fill-current")} />
                                                                <span className="ml-1">{tester.likes || 0}</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        {qaLeaderboard.length > rowsPerPage && (
                            <PaginationWrapper
                                currentPage={qaPage}
                                totalItems={qaLeaderboard.length}
                                itemsPerPage={rowsPerPage}
                                onPageChange={setQaPage}
                                onItemsPerPageChange={setRowsPerPage}
                                itemsPerPageOptions={[5, 10, 15, 20]}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-primary" /> Top Requesters</CardTitle>
                        <CardDescription>Ranked by approval rate, then by total approvals for {format(selectedMonth, 'MMMM yyyy')}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead className="text-right">Approved</TableHead>
                                    <TableHead className="w-[80px]">Engage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requesterLeaderboard.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No data available.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedRequester.map((requester, index) => {
                                        const globalRank = requesterRowOffset + index + 1;
                                        const isTop = globalRank === 1;
                                        return (
                                            <TableRow
                                                key={requester.userId}
                                                className={cn(isTop && "bg-yellow-50 dark:bg-yellow-950/10")}
                                            >
                                                <TableCell className="font-bold text-lg">{getRankIcon(globalRank)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={requester.photoURL} alt={requester.name} />
                                                            <AvatarFallback>{requester.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{requester.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-primary">{requester.approvalRate}%</TableCell>
                                                <TableCell className="text-right font-semibold text-lg">{requester.approvedCount}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleLike(requester, 'requester')}
                                                        disabled={likingUserId === `requester_${requester.userId}` || loadingLikes}
                                                        className={cn(requester.userLiked && "text-red-500")}
                                                        aria-label={`Applaud ${requester.name}`}
                                                    >
                                                        {likingUserId === `requester_${requester.userId}` ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Heart className={cn("h-4 w-4", requester.userLiked && "fill-current")} />
                                                                <span className="ml-1">{requester.likes || 0}</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        {requesterLeaderboard.length > rowsPerPage && (
                            <PaginationWrapper
                                currentPage={requesterPage}
                                totalItems={requesterLeaderboard.length}
                                itemsPerPage={rowsPerPage}
                                onPageChange={setRequesterPage}
                                onItemsPerPageChange={setRowsPerPage}
                                itemsPerPageOptions={[5, 10, 15, 20]}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
