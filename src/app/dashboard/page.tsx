'use client';
import { useAuth } from '@/providers/auth-provider';
import { PageHeader } from '@/components/common/page-header';
import { mockUsers, mockTeams, mockProjects, mockRequests } from '@/lib/mock-data';
import { StatCard } from '@/components/dashboard/stat-card';
import { Users, Shield, FolderKanban, FileText, FilePlus2 } from 'lucide-react';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const AdminDashboard = () => (
    <>
      <PageHeader
        title={`Welcome, ${user?.name}!`}
        description="Here's a quick overview of your system."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={mockUsers.length.toString()} icon={Users} />
        <StatCard title="Total Teams" value={mockTeams.length.toString()} icon={Shield} />
        <StatCard title="Total Projects" value={mockProjects.length.toString()} icon={FolderKanban} />
        <StatCard title="Total Requests" value={mockRequests.length.toString()} icon={FileText} />
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Recent Requests</h2>
        <CertificateRequestsTable requests={mockRequests.slice(0, 5)} />
      </div>
    </>
  );

  const RequesterDashboard = () => {
    const myRequests = mockRequests.filter(req => req.requesterId === user?.id);
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
        <CertificateRequestsTable requests={myRequests} />
        </>
    )
  };

  const QATesterDashboard = () => {
    const pendingRequests = mockRequests.filter(req => req.status === 'pending');
     return (
        <>
        <PageHeader title="Pending QA Review" description="Approve or reject these certificate requests." />
        <CertificateRequestsTable requests={pendingRequests} />
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
        return <div>Loading...</div>;
    }
  };

  return <div className="flex-1 space-y-4">{renderDashboard()}</div>;
}
