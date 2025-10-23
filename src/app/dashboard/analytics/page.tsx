'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Team, User, CertificateRequest, Project } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { ProtectedRoute } from '@/components/common/protected-route';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType; 
  trend?: { value: number; label: string; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center pt-1">
            <Badge variant={trend.positive ? 'default' : 'destructive'}>
              {trend.positive ? '+' : ''}{trend.value}%
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamPerformanceCard({ team, members, requests, projects }: {
  team: Team;
  members: User[];
  requests: CertificateRequest[];
  projects: Project[];
}) {
  const teamRequests = requests.filter(r => 
    members.some(member => member.id === r.requesterId)
  );
  const teamProjects = projects.filter(p => 
    members.some(member => member.id === p.assignedTo)
  );
  
  const approvedRequests = teamRequests.filter(r => r.status === 'approved').length;
  const pendingRequests = teamRequests.filter(r => r.status === 'pending').length;
  const approvalRate = teamRequests.length > 0 ? 
    Math.round((approvedRequests / teamRequests.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>{team.name}</span>
          <Badge variant="outline">{members.length} members</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold">{teamRequests.length}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
          <div>
            <div className="text-2xl font-bold">{approvalRate}%</div>
            <p className="text-xs text-muted-foreground">Approval Rate</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Approved</span>
            <span className="text-green-600">{approvedRequests}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Pending</span>
            <span className="text-yellow-600">{pendingRequests}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Projects</span>
            <span>{teamProjects.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsDashboard() {
  const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: requests, loading: requestsLoading } = useCollection<CertificateRequest>('requests');
  const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
  const { hasPermission } = usePermissions();

  const loading = teamsLoading || usersLoading || requestsLoading || projectsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate overall statistics
  const totalUsers = users?.length || 0;
  const totalTeams = teams?.length || 0;
  const totalRequests = requests?.length || 0;
  const totalProjects = projects?.length || 0;
  
  const approvedRequests = requests?.filter(r => r.status === 'approved').length || 0;
  const pendingRequests = requests?.filter(r => r.status === 'pending').length || 0;
  const rejectedRequests = requests?.filter(r => r.status === 'rejected').length || 0;
  
  const overallApprovalRate = totalRequests > 0 ? 
    Math.round((approvedRequests / totalRequests) * 100) : 0;

  // Get team performance data
  const teamPerformance = teams?.map(team => {
    const teamMembers = users?.filter(user => user.teamId === team.id) || [];
    return {
      team,
      members: teamMembers,
      requests: requests?.filter(r => 
        teamMembers.some(member => member.id === r.requesterId)
      ) || [],
      projects: projects?.filter(p => 
        teamMembers.some(member => member.id === p.assignedTo)
      ) || []
    };
  }) || [];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Teams"
          value={totalTeams}
          description="Active teams in the organization"
          icon={Users}
          trend={{ value: 12, label: "vs last month", positive: true }}
        />
        <StatCard
          title="Total Members"
          value={totalUsers}
          description="Active team members"
          icon={Users}
          trend={{ value: 8, label: "vs last month", positive: true }}
        />
        <StatCard
          title="Total Requests"
          value={totalRequests}
          description="Certificate requests submitted"
          icon={BarChart3}
          trend={{ value: 15, label: "vs last month", positive: true }}
        />
        <StatCard
          title="Approval Rate"
          value={`${overallApprovalRate}%`}
          description="Overall request approval rate"
          icon={CheckCircle}
          trend={{ value: 5, label: "vs last month", positive: true }}
        />
      </div>

      {/* Request Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Request Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{approvedRequests}</div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{pendingRequests}</div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{rejectedRequests}</div>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamPerformance.map(({ team, members, requests, projects }) => (
            <TeamPerformanceCard
              key={team.id}
              team={team}
              members={members}
              requests={requests}
              projects={projects}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests?.slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center space-x-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{request.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.status} • {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                  {request.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute 
      permission={ALL_PERMISSIONS.PROJECT_INSIGHTS.READ}
      roles={['admin', 'manager', 'hr_admin', 'project_manager']}
    >
      <PageHeader
        title="Team Analytics"
        description="Monitor team performance, productivity metrics, and organizational insights."
      />
      <AnalyticsDashboard />
    </ProtectedRoute>
  );
}
