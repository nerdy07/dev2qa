'use client';
import { useAuth } from '@/providers/auth-provider';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Users, Shield, FolderKanban, FileText, FilePlus2, TriangleAlert } from 'lucide-react';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection } from '@/hooks/use-collection';
import { Team, Project, CertificateRequest, User } from '@/lib/types';
import { query, where, limit } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DashboardLoading from './loading';

export default function DashboardPage() {
  const { user } = useAuth();

  const AdminDashboard = () => {
    const { data: users, loading: usersLoading } = useCollection<User>('users');
    const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
    const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
    const { data: requests, loading: requestsLoading, error } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), limit(5))
    );

    const loading = usersLoading || teamsLoading || projectsLoading || requestsLoading;

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
          <StatCard title="Total Requests" value={requests?.length.toString() || '...'} icon={FileText} description='Showing last 5' />
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight mb-4">Recent Requests</h2>
          <CertificateRequestsTable requests={requests || []} isLoading={loading} />
        </div>
      </>
    );
  };

  const RequesterDashboard = () => {
    const { data: myRequests, loading, error } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), where('requesterId', '==', user?.id || ''))
    );

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
        <CertificateRequestsTable requests={myRequests || []} isLoading={loading} />
        </>
    )
  };

  const QATesterDashboard = () => {
    const { data: pendingRequests, loading, error } = useCollection<CertificateRequest>(
        'requests',
        query(collection(db!, 'requests'), where('status', '==', 'pending'))
    );

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
        <CertificateRequestsTable requests={pendingRequests || []} isLoading={loading} />
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
