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
import { query, where, limit, collection, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DashboardLoading from './loading';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user } = useAuth();

  const AdminDashboard = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    const { data: requests, loading: requestsLoading, error } = useCollection<CertificateRequest>('requests');
    
    // For Recent Requests Table
    const { data: recentRequests, loading: recentRequestsLoading } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), orderBy('createdAt', 'desc'), limit(5))
    );

    const loading = usersLoading || teamsLoading || projectsLoading || requestsLoading || recentRequestsLoading;

    const stats = React.useMemo(() => {
        if (!requests) return { approved: 0, pending: 0, rejected: 0 };
        return {
            approved: requests.filter(r => r.status === 'approved').length,
            pending: requests.filter(r => r.status === 'pending').length,
            rejected: requests.filter(r => r.status === 'rejected').length,
        }
    }, [requests]);

    if (loading) return <DashboardLoading />;

    if (error) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load dashboard data. Please try again later.</AlertDescription>
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
          <StatCard title="Total Requests" value={requests?.length.toString() || '0'} icon={FileText} />
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
    const { data: myRequests, loading, error } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), where('requesterId', '==', user?.id || ''))
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
    const { data: pendingRequests, loading, error } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), where('status', '==', 'pending'))
    );

    if (loading) return <DashboardLoading />;

    if (error) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load pending requests. Please try again later.</AlertDescription>
            </Alert>
        )
    }

     return (
        <>
        <PageHeader title="Pending QA Review" description="Approve or reject these certificate requests." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pending Requests" value={pendingRequests?.length.toString() || '0'} icon={Clock} description="Awaiting your review" />
        </div>
        <div className="mt-8">
            <CertificateRequestsTable requests={pendingRequests || []} isLoading={loading} />
        </div>
        </>
    )
  };

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'requester':
        return <RequesterDashboard />;
      case 'qa_tester':
        return <QATesterDashboard />;
      default:
        // This handles the case where user is null during the initial load
        return <DashboardLoading />;
    }
  };

  return <div className="flex-1 space-y-4">{renderDashboard()}</div>;
}
