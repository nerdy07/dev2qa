
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Users, Shield, FolderKanban, FileText, FilePlus2, TriangleAlert, CheckCircle, Clock, XCircle, Percent, Trophy } from 'lucide-react';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection } from '@/hooks/use-collection';
import { Team, Project, CertificateRequest, User } from '@/lib/types';
import { query, where, limit, collection, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DashboardLoading from './loading';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const AdminDashboard = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    
    // Filter teams based on user's team membership or permissions
    const myTeams = React.useMemo(() => {
      if (!teams || !user) return [];
      
      // If user has permission to manage teams (CREATE/UPDATE/DELETE) or is admin, show all teams
      const canViewAllTeams = hasPermission(ALL_PERMISSIONS.TEAMS.CREATE) || 
                              hasPermission(ALL_PERMISSIONS.TEAMS.UPDATE) || 
                              hasPermission(ALL_PERMISSIONS.TEAMS.DELETE) ||
                              user.isAdmin;
      
      if (canViewAllTeams) {
        return teams;
      }
      
      // Otherwise, only show teams the user belongs to
      return teams.filter(team => team.id === user.teamId);
    }, [teams, user, hasPermission]);
    
    // For Recent Requests Table - make query stable to prevent navigation blocking
    const recentRequestsQuery = React.useMemo(() => {
      if (!db) return null;
      return query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(5));
    }, []);
    
    const { data: recentRequests, loading: recentRequestsLoading, error: recentRequestsError } = useCollection<CertificateRequest>(
        'requests',
        recentRequestsQuery
    );

    // State for our new stats, fetched efficiently
    const [stats, setStats] = React.useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
    const [statsLoading, setStatsLoading] = React.useState(true);
    const [statsError, setStatsError] = React.useState<string | null>(null);

    // Fetch counts efficiently on component mount
    React.useEffect(() => {
        const fetchCounts = async () => {
            if (!db) return;
            try {
                const requestsCollection = collection(db, 'requests');
                
                const approvedQuery = query(requestsCollection, where('status', '==', 'approved'));
                const pendingQuery = query(requestsCollection, where('status', '==', 'pending'));
                const rejectedQuery = query(requestsCollection, where('status', '==', 'rejected'));

                // Get counts from server
                const [totalSnapshot, approvedSnapshot, pendingSnapshot, rejectedSnapshot] = await Promise.all([
                    getCountFromServer(requestsCollection),
                    getCountFromServer(approvedQuery),
                    getCountFromServer(pendingQuery),
                    getCountFromServer(rejectedQuery),
                ]);

                setStats({
                    total: totalSnapshot.data().count,
                    approved: approvedSnapshot.data().count,
                    pending: pendingSnapshot.data().count,
                    rejected: rejectedSnapshot.data().count,
                });

            } catch (err) {
                const error = err as Error;
                console.error("Failed to fetch dashboard stats:", error);
                setStatsError(error.message);
            } finally {
                setStatsLoading(false);
            }
        };

        fetchCounts();
    }, []);

    const loading = usersLoading || teamsLoading || projectsLoading || recentRequestsLoading || statsLoading;
    const error = statsError || recentRequestsError;

    if (loading) return <DashboardLoading />;

    if (error) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Dashboard</AlertTitle>
                <AlertDescription>{typeof error === 'string' ? error : (error as Error)?.message}</AlertDescription>
            </Alert>
        )
    }

    return (
      <>
        <PageHeader
          title={`Welcome, ${user?.name}!`}
          description="Here's a quick overview of your system."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={users?.length.toString() || '0'} icon={Users} />
          <StatCard 
            title={myTeams.length === teams?.length ? "Total Teams" : "My Teams"} 
            value={myTeams.length.toString()} 
            icon={Shield} 
          />
          <StatCard title="Total Projects" value={projects?.length.toString() || '0'} icon={FolderKanban} />
          <StatCard title="Total Requests" value={stats.total.toString()} icon={FileText} />
        </div>
        <div className="grid gap-4 md:grid-cols-3 mt-4">
            <StatCard title="Approved Certificates" value={stats.approved.toString()} icon={CheckCircle} />
            <StatCard title="Pending Requests" value={stats.pending.toString()} icon={Clock} />
            <StatCard title="Rejected Requests" value={stats.rejected.toString()} icon={XCircle} />
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight mb-4">Recent Requests</h2>
          <CertificateRequestsTable requests={recentRequests || []} isLoading={loading} />
        </div>
      </>
    );
  };

  const RequesterDashboard = () => {
    const myRequestsQuery = React.useMemo(() => {
        if (!user?.id) return null;
        return query(
          collection(db!, 'requests'), 
          where('requesterId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
    }, [user?.id]);
    
    const { data: myRequests, loading, error } = useCollection<CertificateRequest>(
        'requests',
        myRequestsQuery
    );
    const { toast } = useToast();
    const prevRequestsRef = React.useRef<CertificateRequest[] | null>(null);

    const stats = React.useMemo(() => {
        if (!myRequests || myRequests.length === 0) {
            return { total: 0, approved: 0, pending: 0, rejected: 0, approvalRate: 0, actionRequired: 0 };
        }
        const approved = myRequests.filter(r => r.status === 'approved').length;
        const pending = myRequests.filter(r => r.status === 'pending').length;
        const rejected = myRequests.filter(r => r.status === 'rejected').length;
        const actionRequired = myRequests.filter(r => r.status === 'rejected' && !r.qaProcessRating).length;
        const totalConsidered = approved + rejected;
        const approvalRate = totalConsidered > 0 ? Math.round((approved / totalConsidered) * 100) : 0;
        return { total: myRequests.length, approved, pending, rejected, approvalRate, actionRequired };
    }, [myRequests]);

    // Get recent items for quick access
    const recentPending = React.useMemo(() => {
      return myRequests?.filter(r => r.status === 'pending').slice(0, 3) || [];
    }, [myRequests]);

    const recentApproved = React.useMemo(() => {
      return myRequests?.filter(r => r.status === 'approved').slice(0, 3) || [];
    }, [myRequests]);

    const needsAction = React.useMemo(() => {
      return myRequests?.filter(r => r.status === 'rejected' && !r.qaProcessRating).slice(0, 3) || [];
    }, [myRequests]);

    React.useEffect(() => {
        if (loading || !myRequests) {
          return;
        }
    
        if (prevRequestsRef.current === null) {
          prevRequestsRef.current = myRequests;
          return;
        }
    
        myRequests.forEach(newRequest => {
          const oldRequest = prevRequestsRef.current?.find(r => r.id === newRequest.id);
          if (oldRequest) {
            // Status change from pending
            if (oldRequest.status === 'pending' && newRequest.status !== 'pending') {
              if (newRequest.status === 'approved') {
                toast({
                  title: "Request Approved!",
                  description: `Your request "${newRequest.taskTitle}" has been approved.`,
                });
              } else if (newRequest.status === 'rejected') {
                toast({
                  title: "Request Rejected",
                  description: `Your request "${newRequest.taskTitle}" has been rejected.`,
                  variant: "destructive"
                });
              }
            }
            // Certificate revoked
            if (oldRequest.certificateStatus !== 'revoked' && newRequest.certificateStatus === 'revoked') {
                toast({
                  title: "Certificate Revoked",
                  description: `The certificate for "${newRequest.taskTitle}" has been revoked.`,
                  variant: "destructive",
                });
            }
          }
        });
    
        prevRequestsRef.current = myRequests;
    
    }, [myRequests, loading, toast]);

    if (loading) return <DashboardLoading />;

    if (error) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load your requests. Please try again later.</AlertDescription>
            </Alert>
        )
    }

    return (
        <>
        <PageHeader 
          title={`Welcome back, ${user?.name}!`} 
          description="Here's an overview of your work and what needs your attention."
        >
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/my-work">
                View All Work
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/requests/new">
                <FilePlus2 className="mr-2 h-4 w-4" />
                New Request
              </Link>
            </Button>
          </div>
        </PageHeader>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard 
            title="Action Required" 
            value={stats.actionRequired.toString()} 
            icon={TriangleAlert}
            description="Items need feedback"
            className={stats.actionRequired > 0 ? "border-orange-200 bg-orange-50/50" : ""}
          />
          <StatCard title="In Progress" value={stats.pending.toString()} icon={Clock} description="Awaiting review" />
          <StatCard title="Completed" value={stats.approved.toString()} icon={CheckCircle} description="Approved requests" />
          <StatCard title="Success Rate" value={`${stats.approvalRate}%`} icon={Percent} description="Based on completed" />
        </div>

        {/* Action Required Section */}
        {needsAction.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TriangleAlert className="h-5 w-5 text-orange-600" />
                    Action Required
                  </CardTitle>
                  <CardDescription>These requests were rejected and need your feedback</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href="/dashboard/my-work">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {needsAction.map(request => (
                  <Card 
                    key={request.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
                    onClick={() => router.push(`/dashboard/requests/${request.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base line-clamp-2">{request.taskTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FolderKanban className="h-3 w-3" />
                        <span className="truncate">{request.associatedProject || 'No project'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format((request.createdAt as any)?.toDate() || new Date(), 'MMM d, yyyy')}</span>
                      </div>
                      <Badge variant="destructive" className="mt-2">Rejected - Needs Feedback</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* In Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>In Progress</CardTitle>
                  <CardDescription>Requests currently under review</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/my-work?status=pending">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentPending.length > 0 ? (
                <div className="space-y-4">
                  {recentPending.map(request => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => router.push(`/dashboard/requests/${request.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{request.taskTitle}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {request.associatedProject || 'No project'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow((request.createdAt as any)?.toDate() || new Date(), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/dashboard/requests/new">Create Request</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Completed */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recently Completed</CardTitle>
                  <CardDescription>Your approved certificates</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/my-work?status=approved">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentApproved.length > 0 ? (
                <div className="space-y-4">
                  {recentApproved.map(request => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => router.push(`/dashboard/requests/${request.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{request.taskTitle}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {request.associatedProject || 'No project'}
                          </span>
                          {request.certificateId && (
                            <Link 
                              href={`/dashboard/certificates/${request.certificateId}`}
                              className="text-primary hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Certificate
                            </Link>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />Approved
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No completed requests yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you might want to perform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button asChild variant="outline" className="h-auto py-6 flex-col items-start">
                <Link href="/dashboard/requests/new">
                  <FilePlus2 className="h-6 w-6 mb-2" />
                  <span className="font-semibold">New Certificate Request</span>
                  <span className="text-xs text-muted-foreground mt-1">Submit a new QA certificate request</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-6 flex-col items-start">
                <Link href="/dashboard/my-work">
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="font-semibold">View All My Work</span>
                  <span className="text-xs text-muted-foreground mt-1">See all requests and designs</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-6 flex-col items-start">
                <Link href="/dashboard/leaderboards">
                  <Trophy className="h-6 w-6 mb-2" />
                  <span className="font-semibold">View Leaderboards</span>
                  <span className="text-xs text-muted-foreground mt-1">Check team performance</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
    )
  };

  const QATesterDashboard = () => {
    const { user } = useAuth();
    
    // Data for Pending Requests tab - Make query stable
    const pendingRequestsQuery = React.useMemo(() => {
        if (!db) return null;
        return query(collection(db, 'requests'), where('status', '==', 'pending'));
    }, []);
    
    const { data: pendingRequests, loading: pendingLoading, error: pendingError } = useCollection<CertificateRequest>(
        'requests',
        pendingRequestsQuery
    );

    // Data for My Approvals tab - Simplified query
    const myApprovalsQuery = React.useMemo(() => {
        if (!user?.id || !db) return null;
        return query(
            collection(db, 'requests'), 
            where('qaTesterId', '==', user.id),
            orderBy('updatedAt', 'desc'),
            limit(50)
        );
    }, [user?.id]);

    const { data: myApprovedRequestsData, loading: approvedLoading, error: approvedError } = useCollection<CertificateRequest>(
        'requests',
        myApprovalsQuery
    );
    
    const myApprovedRequests = React.useMemo(() => {
        if (!myApprovedRequestsData) return [];
        return myApprovedRequestsData.filter(req => req.status === 'approved');
    }, [myApprovedRequestsData]);


    // State for filters
    const [searchTerm, setSearchTerm] = React.useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

    const loading = pendingLoading || approvedLoading;
    const error = pendingError || approvedError;

    const filteredApprovedRequests = React.useMemo(() => {
        if (!myApprovedRequests) return [];

        return myApprovedRequests.filter(req => {
            const approvalDate = (req.updatedAt as any)?.toDate();
            
            const matchesSearch = searchTerm.trim() === '' || 
                                  req.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  req.associatedProject.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDate = !dateRange || !dateRange.from || !approvalDate || (
                approvalDate >= dateRange.from && 
                (!dateRange.to || approvalDate <= new Date(dateRange.to.setHours(23, 59, 59, 999))) // Include the whole end day
            );
            
            return matchesSearch && matchesDate;
        });
    }, [myApprovedRequests, searchTerm, dateRange]);


    if (loading) return <DashboardLoading />;

    if (error) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to load dashboard data. If this persists, you may need to create a Firestore index. Check the browser console for a link.
                </AlertDescription>
            </Alert>
        )
    }

     return (
        <>
        <PageHeader title="QA Dashboard" description="Review pending requests and manage your approvals." />
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:w-[400px] md:grid-cols-2">
                <TabsTrigger value="pending">
                    <Clock className="mr-2 h-4 w-4" /> Pending Review ({pendingRequests?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="approvals">
                    <CheckCircle className="mr-2 h-4 w-4" /> My Approvals ({myApprovedRequests?.length || 0})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Requests</CardTitle>
                        <CardDescription>These requests are awaiting your review and action.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <CertificateRequestsTable requests={pendingRequests || []} isLoading={pendingLoading} />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="approvals" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Approved Certificates</CardTitle>
                        <CardDescription>A history of the last 50 certificate requests you have approved. You can filter by title, requester, project, or date.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                            <Input 
                                placeholder="Filter by title, requester, project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:max-w-sm"
                            />
                            <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full md:w-auto" />
                        </div>
                        <CertificateRequestsTable requests={filteredApprovedRequests} isLoading={approvedLoading} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        </>
    )
  };

  const DeveloperDashboard = () => {
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    
    // Make query stable
    const myRequestsQuery = React.useMemo(() => {
        if (!user?.id || !db) return null;
        return query(collection(db, 'requests'), where('requesterId', '==', user.id));
    }, [user?.id]);
    
    const { data: myRequests, loading: requestsLoading } = useCollection<CertificateRequest>(
      'requests',
      myRequestsQuery
    );

    return (
      <>
        <PageHeader 
          title="Developer Dashboard" 
          description="Manage your projects and development tasks."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Projects"
            value={projects?.length || 0}
            icon={FolderKanban}
            description="Projects you're working on"
          />
          <StatCard
            title="My Requests"
            value={myRequests?.length || 0}
            icon={FileText}
            description="Certificate requests submitted"
          />
          <StatCard
            title="Approved"
            value={myRequests?.filter(r => r.status === 'approved').length || 0}
            icon={CheckCircle}
            description="Successfully approved requests"
          />
          <StatCard
            title="Pending"
            value={myRequests?.filter(r => r.status === 'pending').length || 0}
            icon={Clock}
            description="Requests awaiting review"
          />
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>My Recent Requests</CardTitle>
              <CardDescription>Your latest certificate requests and their status.</CardDescription>
            </CardHeader>
            <CardContent>
              <CertificateRequestsTable requests={myRequests || []} isLoading={requestsLoading} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const ManagerDashboard = () => {
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    const { data: requests, loading: requestsLoading } = useCollection<CertificateRequest>('requests');

    // Filter teams based on user's team membership or permissions
    const myTeams = React.useMemo(() => {
      if (!teams || !user) return [];
      
      // If user has permission to manage teams (CREATE/UPDATE/DELETE) or is admin, show all teams
      const canViewAllTeams = hasPermission(ALL_PERMISSIONS.TEAMS.CREATE) || 
                              hasPermission(ALL_PERMISSIONS.TEAMS.UPDATE) || 
                              hasPermission(ALL_PERMISSIONS.TEAMS.DELETE) ||
                              user.isAdmin;
      
      if (canViewAllTeams) {
        return teams;
      }
      
      // Otherwise, only show teams the user belongs to
      return teams.filter(team => team.id === user.teamId);
    }, [teams, user, hasPermission]);

    return (
      <>
        <PageHeader 
          title="Manager Dashboard" 
          description="Oversee team performance and project progress."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={myTeams.length === teams?.length ? "Teams" : "My Teams"}
            value={myTeams.length || 0}
            icon={Users}
            description={myTeams.length === teams?.length ? "Teams under management" : "Teams you belong to"}
          />
          <StatCard
            title="Projects"
            value={projects?.length || 0}
            icon={FolderKanban}
            description="Active projects"
          />
          <StatCard
            title="Total Requests"
            value={requests?.length || 0}
            icon={FileText}
            description="All certificate requests"
          />
          <StatCard
            title="Approval Rate"
            value={`${Math.round(((requests?.filter(r => r.status === 'approved').length || 0) / (requests?.length || 1)) * 100)}%`}
            icon={Percent}
            description="Request approval rate"
          />
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Overview</CardTitle>
              <CardDescription>Monitor team productivity and project status.</CardDescription>
            </CardHeader>
            <CardContent>
              <CertificateRequestsTable requests={requests || []} isLoading={requestsLoading} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const HRAdminDashboard = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: requests, loading: requestsLoading } = useCollection<CertificateRequest>('requests');

    return (
      <>
        <PageHeader 
          title="HR Admin Dashboard" 
          description="Manage personnel, payroll, and HR operations."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={users?.length || 0}
            icon={Users}
            description="Active team members"
          />
          <StatCard
            title="Active Requests"
            value={requests?.filter(r => r.status === 'pending').length || 0}
            icon={Clock}
            description="Pending certificate requests"
          />
          <StatCard
            title="Approved This Month"
            value={requests?.filter(r => r.status === 'approved').length || 0}
            icon={CheckCircle}
            description="Successfully approved requests"
          />
          <StatCard
            title="Team Productivity"
            value="85%"
            icon={Percent}
            description="Overall team performance"
          />
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>HR Operations Overview</CardTitle>
              <CardDescription>Monitor employee performance and HR metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <CertificateRequestsTable requests={requests || []} isLoading={requestsLoading} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const ProjectManagerDashboard = () => {
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    const { data: requests, loading: requestsLoading } = useCollection<CertificateRequest>('requests');

    return (
      <>
        <PageHeader 
          title="Project Manager Dashboard" 
          description="Track project progress and resource allocation."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Projects"
            value={projects?.length || 0}
            icon={FolderKanban}
            description="Projects in progress"
          />
          <StatCard
            title="Project Requests"
            value={requests?.length || 0}
            icon={FileText}
            description="Certificate requests"
          />
          <StatCard
            title="Completion Rate"
            value="78%"
            icon={Percent}
            description="Project completion rate"
          />
          <StatCard
            title="Resource Utilization"
            value="92%"
            icon={Users}
            description="Team resource usage"
          />
        </div>
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Project Status Overview</CardTitle>
              <CardDescription>Monitor project progress and team performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <CertificateRequestsTable requests={requests || []} isLoading={requestsLoading} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  };

  const SeniorQADashboard = () => {
    // Make queries stable
    const pendingRequestsQuery = React.useMemo(() => {
        if (!db) return null;
        return query(collection(db, 'requests'), where('status', '==', 'pending'));
    }, []);
    
    const approvedRequestsQuery = React.useMemo(() => {
        if (!db) return null;
        return query(collection(db, 'requests'), where('status', '==', 'approved'));
    }, []);
    
    const { data: pendingRequests, loading: pendingLoading } = useCollection<CertificateRequest>(
      'requests',
      pendingRequestsQuery
    );
    const { data: approvedRequests, loading: approvedLoading } = useCollection<CertificateRequest>(
      'requests',
      approvedRequestsQuery
    );

    return (
      <>
        <PageHeader 
          title="Senior QA Dashboard" 
          description="Advanced QA oversight and mentoring tools."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Reviews"
            value={pendingRequests?.length || 0}
            icon={Clock}
            description="Requests awaiting QA review"
          />
          <StatCard
            title="Approved This Month"
            value={approvedRequests?.length || 0}
            icon={CheckCircle}
            description="Successfully approved requests"
          />
          <StatCard
            title="QA Team Size"
            value="8"
            icon={Users}
            description="QA team members"
          />
          <StatCard
            title="Quality Score"
            value="94%"
            icon={Percent}
            description="Overall quality rating"
          />
        </div>
        <div className="mt-8">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pending Reviews</TabsTrigger>
              <TabsTrigger value="approved">Approved Certificates</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending QA Reviews</CardTitle>
                  <CardDescription>Certificate requests awaiting your review and approval.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CertificateRequestsTable requests={pendingRequests || []} isLoading={pendingLoading} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="approved" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Approved Certificates</CardTitle>
                  <CardDescription>Your approved certificate requests and quality metrics.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CertificateRequestsTable requests={approvedRequests || []} isLoading={approvedLoading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </>
    );
  };

  // Dynamic Dashboard based on permissions
  const DynamicDashboard = () => {
    // Get auth context for debugging
    const { user: authUser } = useAuth();
    
    // Check what permissions the user has to determine what to show
    const canViewUsers = hasPermission(ALL_PERMISSIONS.USERS.READ);
    const canViewTeams = hasPermission(ALL_PERMISSIONS.TEAMS.READ);
    const canViewProjects = hasPermission(ALL_PERMISSIONS.PROJECTS.READ);
    const canViewAllRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL);
    const canCreateRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE);
    const canApproveRequests = hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE);
    const canViewPayroll = hasPermission(ALL_PERMISSIONS.PAYROLL.READ);
    const canViewExpenses = hasPermission(ALL_PERMISSIONS.EXPENSES.READ);
    const canViewAnalytics = hasPermission(ALL_PERMISSIONS.PROJECT_INSIGHTS.READ);
    const canViewAllDesigns = hasPermission(ALL_PERMISSIONS.DESIGNS.READ_ALL);
    const canApproveDesigns = hasPermission(ALL_PERMISSIONS.DESIGNS.APPROVE);
    const canViewRequisitions = hasPermission(ALL_PERMISSIONS.REQUISITIONS.READ_ALL);
    const canViewOwnRequisitions = hasPermission(ALL_PERMISSIONS.REQUISITIONS.READ_OWN);
    const canViewLeaderboards = hasPermission(ALL_PERMISSIONS.LEADERBOARDS.READ);

    // Data fetching
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    
    // Filter teams based on user's team membership or permissions
    const myTeams = React.useMemo(() => {
      if (!teams || !user) return [];
      
      // If user has permission to manage teams (CREATE/UPDATE/DELETE) or is admin, show all teams
      const canViewAllTeams = hasPermission(ALL_PERMISSIONS.TEAMS.CREATE) || 
                              hasPermission(ALL_PERMISSIONS.TEAMS.UPDATE) || 
                              hasPermission(ALL_PERMISSIONS.TEAMS.DELETE) ||
                              user.isAdmin;
      
      if (canViewAllTeams) {
        return teams;
      }
      
      // Otherwise, only show teams the user belongs to
      return teams.filter(team => team.id === user.teamId);
    }, [teams, user, hasPermission]);
    
    // Requests queries based on permissions
    const allRequestsQuery = React.useMemo(() => {
      if (!db || !canViewAllRequests) return null;
      return query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(10));
    }, [canViewAllRequests]);

    const myRequestsQuery = React.useMemo(() => {
      if (!user?.id || !db || !canCreateRequests) return null;
      return query(collection(db, 'requests'), where('requesterId', '==', user.id), orderBy('createdAt', 'desc'), limit(10));
    }, [user?.id, canCreateRequests]);

    const pendingRequestsQuery = React.useMemo(() => {
      if (!db || !canApproveRequests) return null;
      return query(collection(db, 'requests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(10));
    }, [canApproveRequests]);

    const { data: allRequests, loading: allRequestsLoading } = useCollection<CertificateRequest>('requests', allRequestsQuery);
    const { data: myRequests, loading: myRequestsLoading } = useCollection<CertificateRequest>('requests', myRequestsQuery);
    const { data: pendingRequests, loading: pendingRequestsLoading } = useCollection<CertificateRequest>('requests', pendingRequestsQuery);

    // Stats calculation
    const [stats, setStats] = React.useState({ 
      totalRequests: 0, 
      approvedRequests: 0, 
      pendingRequests: 0, 
      rejectedRequests: 0 
    });
    const [statsLoading, setStatsLoading] = React.useState(true);

    React.useEffect(() => {
      const fetchStats = async () => {
        if (!db) return;
        try {
          const requestsCollection = collection(db, 'requests');
          const [totalSnapshot, approvedSnapshot, pendingSnapshot, rejectedSnapshot] = await Promise.all([
            getCountFromServer(requestsCollection),
            getCountFromServer(query(requestsCollection, where('status', '==', 'approved'))),
            getCountFromServer(query(requestsCollection, where('status', '==', 'pending'))),
            getCountFromServer(query(requestsCollection, where('status', '==', 'rejected')))
          ]);

          setStats({
            totalRequests: totalSnapshot.data().count,
            approvedRequests: approvedSnapshot.data().count,
            pendingRequests: pendingSnapshot.data().count,
            rejectedRequests: rejectedSnapshot.data().count,
          });
        } catch (err) {
          console.error("Failed to fetch dashboard stats:", err);
        } finally {
          setStatsLoading(false);
        }
      };

      if (canViewAllRequests || canApproveRequests) {
        fetchStats();
      } else {
        setStatsLoading(false);
      }
    }, [canViewAllRequests, canApproveRequests]);

    const loading = usersLoading || teamsLoading || projectsLoading || statsLoading || 
                    (canViewAllRequests && allRequestsLoading) || 
                    (canCreateRequests && myRequestsLoading) || 
                    (canApproveRequests && pendingRequestsLoading);

    if (loading) return <DashboardLoading />;

    // Calculate user-specific stats
    const myApprovedCount = myRequests?.filter(r => r.status === 'approved').length || 0;
    const myPendingCount = myRequests?.filter(r => r.status === 'pending').length || 0;

    return (
      <>
        <PageHeader 
          title="My Dashboard" 
          description="Your personalized workspace with insights and quick actions based on your permissions."
        />
        
        {/* Stats Grid - Show relevant stats based on permissions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {canViewUsers && (
            <StatCard
              title="Total Users"
              value={users?.length || 0}
              icon={Users}
              description="Active team members"
            />
          )}
          {canViewTeams && (
            <StatCard
              title={myTeams.length === teams?.length ? "Teams" : "My Teams"}
              value={myTeams.length || 0}
              icon={Shield}
              description={myTeams.length === teams?.length ? "Active teams" : "Teams you belong to"}
            />
          )}
          {canViewProjects && (
            <StatCard
              title="Active Projects"
              value={projects?.length || 0}
              icon={FolderKanban}
              description="Projects in progress"
            />
          )}
          {(canViewAllRequests || canApproveRequests) && (
            <>
              <StatCard
                title="Total Requests"
                value={stats.totalRequests}
                icon={FileText}
                description="All certificate requests"
              />
              <StatCard
                title="Pending Reviews"
                value={stats.pendingRequests}
                icon={Clock}
                description="Awaiting approval"
              />
              <StatCard
                title="Approved"
                value={stats.approvedRequests}
                icon={CheckCircle}
                description="Successfully approved"
              />
            </>
          )}
          {canCreateRequests && !canViewAllRequests && (
            <>
              <StatCard
                title="My Requests"
                value={myRequests?.length || 0}
                icon={FileText}
                description="Your certificate requests"
              />
              <StatCard
                title="Approved"
                value={myApprovedCount}
                icon={CheckCircle}
                description="Your approved requests"
              />
              <StatCard
                title="Pending"
                value={myPendingCount}
                icon={Clock}
                description="Your pending requests"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {canCreateRequests && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/requests/new')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FilePlus2 className="h-5 w-5" />
                  New Request
                </CardTitle>
                <CardDescription>Create a new certificate request</CardDescription>
              </CardHeader>
            </Card>
          )}
          {canViewProjects && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/admin/projects')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  View Projects
                </CardTitle>
                <CardDescription>Manage and track projects</CardDescription>
              </CardHeader>
            </Card>
          )}
          {canViewTeams && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/teams')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  View Teams
                </CardTitle>
                <CardDescription>Manage teams and members</CardDescription>
              </CardHeader>
            </Card>
          )}
          {canViewUsers && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/admin/users')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Users
                </CardTitle>
                <CardDescription>View and manage user accounts</CardDescription>
              </CardHeader>
            </Card>
          )}
          {canViewAnalytics && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/analytics')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Analytics
                </CardTitle>
                <CardDescription>View project insights and analytics</CardDescription>
              </CardHeader>
            </Card>
          )}
          {canViewLeaderboards && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/leaderboards')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Leaderboards
                </CardTitle>
                <CardDescription>View top performers</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Recent Requests Section */}
        {(canViewAllRequests || canApproveRequests || canCreateRequests) && (
          <div className="mt-8">
            <Tabs defaultValue={canApproveRequests ? "pending" : "my-requests"} className="w-full">
              <TabsList>
                {canApproveRequests && <TabsTrigger value="pending">Pending Reviews</TabsTrigger>}
                {canCreateRequests && <TabsTrigger value="my-requests">My Requests</TabsTrigger>}
                {canViewAllRequests && <TabsTrigger value="all">All Requests</TabsTrigger>}
              </TabsList>
              
              {canApproveRequests && (
                <TabsContent value="pending" className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Pending Reviews</CardTitle>
                          <CardDescription>Certificate requests awaiting your approval</CardDescription>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/dashboard/admin/requests">View All</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CertificateRequestsTable requests={pendingRequests || []} isLoading={pendingRequestsLoading} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              
              {canCreateRequests && (
                <TabsContent value="my-requests" className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>My Requests</CardTitle>
                          <CardDescription>Your certificate requests and their status</CardDescription>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/dashboard/my-work">View All</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CertificateRequestsTable requests={myRequests || []} isLoading={myRequestsLoading} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              
              {canViewAllRequests && (
                <TabsContent value="all" className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>All Requests</CardTitle>
                          <CardDescription>All certificate requests in the system</CardDescription>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/dashboard/admin/requests">View All</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CertificateRequestsTable requests={allRequests || []} isLoading={allRequestsLoading} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        {/* Show empty state if user has no relevant permissions */}
        {!canViewUsers && !canViewTeams && !canViewProjects && !canViewAllRequests && 
         !canCreateRequests && !canApproveRequests && !canViewAnalytics && !canViewLeaderboards && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Welcome to My Dashboard</CardTitle>
              <CardDescription>
                Your dashboard will show relevant information based on your permissions. 
                Contact your administrator if you need access to additional features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No dashboard content available</p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 text-xs space-y-1 p-4 bg-muted rounded">
                    <p className="font-semibold">Debug Info:</p>
                    <p>User Roles: {authUser?.roles?.join(', ') || authUser?.role || 'None'}</p>
                    <p>Can View Users: {canViewUsers ? 'Yes' : 'No'}</p>
                    <p>Can View Teams: {canViewTeams ? 'Yes' : 'No'}</p>
                    <p>Can View Projects: {canViewProjects ? 'Yes' : 'No'}</p>
                    <p>Can Create Requests: {canCreateRequests ? 'Yes' : 'No'}</p>
                    <p>Can Approve Requests: {canApproveRequests ? 'Yes' : 'No'}</p>
                    <p>Can View All Requests: {canViewAllRequests ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  if (!user) {
    return <DashboardLoading />;
  }

  return <div className="flex-1 space-y-4"><DynamicDashboard /></div>;
}
