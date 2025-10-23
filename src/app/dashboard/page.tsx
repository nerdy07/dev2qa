
'use client';
import React from 'react';
import { useAuth } from '@/providers/auth-provider';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Users, Shield, FolderKanban, FileText, FilePlus2, TriangleAlert, CheckCircle, Clock, XCircle, Percent } from 'lucide-react';
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
import type { DateRange } from 'react-day-picker';

export default function DashboardPage() {
  const { user } = useAuth();

  const AdminDashboard = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    
    // For Recent Requests Table - this is already optimized with limit(5)
    const { data: recentRequests, loading: recentRequestsLoading, error: recentRequestsError } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), orderBy('createdAt', 'desc'), limit(5))
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
          <StatCard title="Total Teams" value={teams?.length.toString() || '0'} icon={Shield} />
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
        return query(collection(db!, 'requests'), where('requesterId', '==', user.id));
    }, [user?.id]);
    
    const { data: myRequests, loading, error } = useCollection<CertificateRequest>(
        'requests',
        myRequestsQuery
    );
    const { toast } = useToast();
    const prevRequestsRef = React.useRef<CertificateRequest[] | null>(null);

    const stats = React.useMemo(() => {
        if (!myRequests || myRequests.length === 0) {
            return { total: 0, approved: 0, pending: 0, rejected: 0, approvalRate: 0 };
        }
        const approved = myRequests.filter(r => r.status === 'approved').length;
        const pending = myRequests.filter(r => r.status === 'pending').length;
        const rejected = myRequests.filter(r => r.status === 'rejected').length;
        const totalConsidered = approved + rejected;
        const approvalRate = totalConsidered > 0 ? Math.round((approved / totalConsidered) * 100) : 0;
        return { total: myRequests.length, approved, pending, rejected, approvalRate };
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
        <PageHeader title="My Certificate Requests" description="Track the status of your submitted requests.">
            <Button asChild>
                <Link href="/dashboard/requests/new">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    New Request
                </Link>
            </Button>
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Requests" value={stats.total.toString()} icon={FileText} />
            <StatCard title="Approved" value={stats.approved.toString()} icon={CheckCircle} />
            <StatCard title="Pending" value={stats.pending.toString()} icon={Clock} />
            <StatCard title="Approval Rate" value={`${stats.approvalRate}%`} icon={Percent} description='Based on completed requests' />
        </div>
        <div className="mt-8">
            <CertificateRequestsTable requests={myRequests || []} isLoading={loading} />
        </div>
        </>
    )
  };

  const QATesterDashboard = () => {
    const { user } = useAuth();
    
    // Data for Pending Requests tab
    const { data: pendingRequests, loading: pendingLoading, error: pendingError } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), where('status', '==', 'pending'))
    );

    // Data for My Approvals tab - Simplified query
    const myApprovalsQuery = React.useMemo(() => {
        if (!user?.id) return null;
        return query(
            collection(db!, 'requests'), 
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
    const { data: myRequests, loading: requestsLoading } = useCollection<CertificateRequest>(
      'requests',
      query(collection(db!, 'requests'), where('requesterId', '==', user?.id))
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

    return (
      <>
        <PageHeader 
          title="Manager Dashboard" 
          description="Oversee team performance and project progress."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Teams"
            value={teams?.length || 0}
            icon={Users}
            description="Teams under management"
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
    const { data: pendingRequests, loading: pendingLoading } = useCollection<CertificateRequest>(
      'requests',
      query(collection(db!, 'requests'), where('status', '==', 'pending'))
    );
    const { data: approvedRequests, loading: approvedLoading } = useCollection<CertificateRequest>(
      'requests',
      query(collection(db!, 'requests'), where('status', '==', 'approved'))
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

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'requester':
        return <RequesterDashboard />;
      case 'qa_tester':
        return <QATesterDashboard />;
      case 'developer':
        return <DeveloperDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'hr_admin':
        return <HRAdminDashboard />;
      case 'project_manager':
        return <ProjectManagerDashboard />;
      case 'senior_qa':
        return <SeniorQADashboard />;
      default:
        // This handles the case where user is null during the initial load
        return <DashboardLoading />;
    }
  };

  return <div className="flex-1 space-y-4">{renderDashboard()}</div>;
}
