
'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CertificateRequestsTable } from '@/components/dashboard/requests-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { useCollection } from '@/hooks/use-collection';
import type { CertificateRequest, Project, Team, User, Invoice } from '@/lib/types';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import {
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Users,
  FolderKanban,
  Clock,
  TriangleAlert,
  Activity,
  FilePlus2,
  Receipt,
} from 'lucide-react';

type HeroSummary = {
  title: string;
  value: string;
  description: string;
  cta?: {
    label: string;
    href: string;
    ariaLabel?: string;
  };
  badge?: string;
};

type ActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  meta?: string;
};

const formatCount = (value: number) => value.toLocaleString();

const getCreatedAt = (request: CertificateRequest): Date => {
  const created = (request.createdAt as any)?.toDate?.();
  return created instanceof Date ? created : new Date();
};

const statusVariant = (status: CertificateRequest['status']) => {
  return getStatusVariant(status);
};

function HeroCard({ summary }: { summary: HeroSummary }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="space-y-2">
        {summary.badge ? (
          <Badge variant="outline" className="w-fit border-primary text-primary">
            {summary.badge}
          </Badge>
        ) : null}
        <CardTitle className="text-3xl font-bold tracking-tight md:text-4xl">
          {summary.value}
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {summary.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{summary.title}</h2>
          <p className="text-sm text-muted-foreground">
            Stay focused on the work that drives delivery forward.
          </p>
        </div>
        {summary.cta ? (
          <Button asChild className="w-full sm:w-auto" aria-label={summary.cta.ariaLabel ?? summary.cta.label}>
            <Link href={summary.cta.href}>
              {summary.cta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NextActionsList({ actions }: { actions: ActionItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">Next actions</CardTitle>
          <CardDescription>Prioritized items that keep your queue moving.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {actions.length > 0 ? (
          <ul className="space-y-3">
            {actions.map((action) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className="group flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Open ${action.title}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary">
                      {action.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    {action.meta ? (
                      <Badge variant="outline" className="text-xs font-medium">
                        {action.meta}
                      </Badge>
                    ) : null}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Nothing urgent right now. You’ll see upcoming work here as soon as it needs attention.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricsGrid({
  metrics,
}: {
  metrics: { title: string; value: string; description: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{metric.title}</CardTitle>
            <CardDescription>{metric.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{metric.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentActivityList({ items }: { items: CertificateRequest[] }) {
  if (items.length === 0) {
        return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Activity will appear here as soon as work starts flowing through the system.
      </div>
    );
    }

    return (
    <div className="space-y-3">
      {items.map((request) => (
        <Link
          key={request.id}
          href={`/dashboard/requests/${request.id}`}
          className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Open request ${request.taskTitle}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold leading-tight text-foreground">{request.taskTitle}</p>
            <Badge variant={statusVariant(request.status)} className="capitalize">
              {request.status}
            </Badge>
        </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {request.associatedProject || 'No project'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(getCreatedAt(request), { addSuffix: true })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {request.requesterName}
            </span>
        </div>
        </Link>
      ))}
        </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const requestsQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(25));
  }, []);

  const {
    data: requests,
    loading: requestsLoading,
    error: requestsError,
  } = useCollection<CertificateRequest>('requests', requestsQuery);
  const { data: projects, loading: projectsLoading } = useCollection<Project>('projects');
  const { data: teams, loading: teamsLoading } = useCollection<Team>('teams');
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: invoices, loading: invoicesLoading } = useCollection<Invoice>('invoices');

  const loading = requestsLoading || projectsLoading || teamsLoading || usersLoading || invoicesLoading;

  // All hooks must be called before any conditional returns
  const pendingRequests = React.useMemo(
    () => (requests ?? []).filter((request) => request.status === 'pending'),
    [requests]
  );

  const overdueRequests = React.useMemo(
    () =>
      pendingRequests.filter((request) => {
        const created = getCreatedAt(request);
        const diff = Date.now() - created.getTime();
        return diff > 3 * 24 * 60 * 60 * 1000;
      }),
    [pendingRequests]
  );

  const myRequests = React.useMemo(
    () => (requests ?? []).filter((request) => request.requesterId === user?.id),
    [requests, user?.id]
  );

  const managedProjects = React.useMemo(
    () => (projects ?? []).filter((project) => project.leadId === user?.id),
    [projects, user?.id]
  );

  const managedProjectNames = React.useMemo(
    () => new Set(managedProjects.map((project) => project.name)),
    [managedProjects]
  );

  const managedPending = React.useMemo(
    () => pendingRequests.filter((request) => managedProjectNames.has(request.associatedProject || '')),
    [pendingRequests, managedProjectNames]
  );

  const myPending = React.useMemo(
    () => myRequests.filter((request) => request.status === 'pending'),
    [myRequests]
  );

  const isQA = hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE);
  const isProjectManager = hasPermission(ALL_PERMISSIONS.PROJECTS.UPDATE) || Boolean(user?.isProjectManager);
  const isAdmin = Boolean(user?.isAdmin);
  const canManageInvoices = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE);

  // Invoice metrics - must be defined before useMemo hooks that use it
  const invoiceMetrics = React.useMemo(() => {
    if (!invoices || !canManageInvoices) return null;

    const pendingInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft');
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status !== 'sent' && inv.status !== 'partially_paid') return false;
      const dueDate = inv.dueDate?.toDate?.();
      return dueDate && dueDate < new Date() && inv.outstandingAmount > 0;
    });
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0);
    const recentInvoices = invoices
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    return {
      pending: pendingInvoices.length,
      overdue: overdueInvoices.length,
      totalOutstanding,
      recent: recentInvoices,
    };
  }, [invoices, canManageInvoices]);

  const heroSummary: HeroSummary = React.useMemo(() => {
    if (isQA) {
      return {
        title: 'Pending approvals',
        value: formatCount(pendingRequests.length),
        description:
          pendingRequests.length > 0
            ? 'Requests waiting on QA sign-off. Start with the most overdue items to keep delivery on track.'
            : 'All requests are up to date—nice work staying ahead of the queue.',
        cta: {
          label: 'Open approval queue',
          href: '/dashboard/requests?status=pending',
          ariaLabel: 'Open the list of pending requests awaiting QA approval',
        },
        badge: overdueRequests.length ? `${formatCount(overdueRequests.length)} overdue` : undefined,
      };
    }

    if (isProjectManager) {
      return {
        title: 'Requests from your projects',
        value: formatCount(managedPending.length),
        description:
          managedPending.length > 0
            ? 'Coordinate with QA to keep these project deliverables moving.'
            : 'No pending approvals tied to the projects you lead.',
        cta: {
          label: 'Review project work',
          href: '/dashboard/my-work',
        },
        badge: managedProjects.length ? `${formatCount(managedProjects.length)} active projects` : undefined,
      };
    }

    if (isAdmin) {
      // Show invoice metrics if user can manage invoices
      if (canManageInvoices && invoiceMetrics && invoiceMetrics.overdue > 0) {
        return {
          title: 'Overdue invoices',
          value: formatCount(invoiceMetrics.overdue),
          description:
            invoiceMetrics.overdue > 0
              ? 'These invoices are past their due date and require immediate attention.'
              : 'No invoices are currently overdue.',
          cta: {
            label: 'View invoices',
            href: '/dashboard/admin/invoices?status=overdue',
          },
        };
      }
      
      return {
        title: 'Overdue approvals',
        value: formatCount(overdueRequests.length),
        description:
          overdueRequests.length > 0
            ? 'These requests have been waiting more than three days. Consider nudging approvers.'
            : 'No approvals are currently overdue.',
        cta: {
          label: 'Open requests dashboard',
          href: '/dashboard/requests',
        },
      };
    }

    return {
      title: 'My pending requests',
      value: formatCount(myPending.length),
      description:
        myPending.length > 0
          ? 'Track the work awaiting QA review and add more context if needed.'
          : 'You have no work in review. Submit a new request when you are ready.',
      cta: {
        label: 'Submit new request',
        href: '/dashboard/requests/new',
      },
    };
  }, [
    isQA,
    isProjectManager,
    isAdmin,
    canManageInvoices,
    invoiceMetrics,
    pendingRequests.length,
    overdueRequests.length,
    managedPending.length,
    managedProjects.length,
    myPending.length,
  ]);

  const nextActions = React.useMemo<ActionItem[]>(() => {
    const buildDescription = (request: CertificateRequest) =>
      `${request.requesterName} • ${formatDistanceToNow(getCreatedAt(request), { addSuffix: true })}`;

    const actions: ActionItem[] = [];

    // Add invoice actions if user can manage invoices
    if (canManageInvoices && invoiceMetrics) {
      if (invoiceMetrics.overdue > 0) {
        actions.push({
          id: 'overdue-invoices',
          title: `${invoiceMetrics.overdue} Overdue Invoice${invoiceMetrics.overdue > 1 ? 's' : ''}`,
          description: 'Invoices past their due date requiring attention',
          meta: 'Urgent',
          href: '/dashboard/admin/invoices?status=overdue',
        });
      }
      if (invoiceMetrics.recent.length > 0) {
        const recentInvoice = invoiceMetrics.recent[0];
        const createdDate = recentInvoice.createdAt?.toDate?.() || new Date();
        actions.push({
          id: recentInvoice.id,
          title: `Invoice ${recentInvoice.invoiceNumber}`,
          description: `${recentInvoice.clientName} • ${formatDistanceToNow(createdDate, { addSuffix: true })}`,
          meta: recentInvoice.status,
          href: `/dashboard/admin/invoices/${recentInvoice.id}`,
                });
            }
          }

    // Add request actions based on role
    if (isQA) {
      actions.push(...pendingRequests.slice(0, 4 - actions.length).map((request) => ({
        id: request.id,
        title: request.taskTitle,
        description: buildDescription(request),
        meta: request.certificateRequired !== false ? 'Certificate' : 'QA sign-off',
        href: `/dashboard/requests/${request.id}`,
      })));
    } else if (isProjectManager) {
      actions.push(...managedPending.slice(0, 4 - actions.length).map((request) => ({
        id: request.id,
        title: request.taskTitle,
        description: `${request.associatedTeam || 'No team'} • ${formatDistanceToNow(getCreatedAt(request), {
          addSuffix: true,
        })}`,
        meta: request.certificateRequired !== false ? 'Certificate' : 'QA sign-off',
        href: `/dashboard/requests/${request.id}`,
      })));
    } else if (isAdmin) {
      actions.push(...overdueRequests.slice(0, 4 - actions.length).map((request) => ({
        id: request.id,
        title: request.taskTitle,
        description: `${request.associatedProject || 'No project'} • ${formatDistanceToNow(
          getCreatedAt(request),
          { addSuffix: true }
        )}`,
        meta: request.requesterName,
        href: `/dashboard/requests/${request.id}`,
      })));
    } else {
      actions.push(...myPending.slice(0, 4 - actions.length).map((request) => ({
        id: request.id,
        title: request.taskTitle,
        description: `${request.associatedProject || 'No project'} • ${formatDistanceToNow(
          getCreatedAt(request),
          { addSuffix: true }
        )}`,
        meta: request.certificateRequired !== false ? 'Certificate' : 'QA sign-off',
        href: `/dashboard/requests/${request.id}`,
      })));
    }

    return actions.slice(0, 4);
  }, [isQA, isProjectManager, isAdmin, canManageInvoices, invoiceMetrics, pendingRequests, managedPending, overdueRequests, myPending]);

  const secondaryMetrics = React.useMemo(
    () => {
      const metrics: { title: string; value: string; description: string }[] = [
        {
          title: 'Total requests',
          value: formatCount((requests ?? []).length),
          description: 'All certificate and QA sign-off submissions',
        },
        {
          title: 'Pending approvals',
          value: formatCount(pendingRequests.length),
          description: 'Awaiting a QA or manager decision',
        },
      ];

      metrics.push({
        title: 'Overdue (>3 days)',
        value: formatCount(overdueRequests.length),
        description: 'Requests that should be prioritised next',
      });

      metrics.push({
        title: 'In-flight projects',
        value: formatCount((projects ?? []).filter((project) => project.status !== 'Completed').length),
        description: 'Projects currently moving through delivery',
      });

      if (isProjectManager) {
        metrics.push({
          title: 'Projects you lead',
          value: formatCount(managedProjects.length),
          description: 'Active engagements where you are responsible',
        });
      }

      if (isAdmin) {
        metrics.push({
          title: 'Active users',
          value: formatCount((users ?? []).filter((account) => !account.disabled).length),
          description: 'Enabled accounts across the organisation',
        });
      }

      if (canManageInvoices && invoiceMetrics) {
        metrics.push({
          title: 'Pending invoices',
          value: formatCount(invoiceMetrics.pending),
          description: 'Invoices awaiting payment or action',
        });
        metrics.push({
          title: 'Overdue invoices',
          value: formatCount(invoiceMetrics.overdue),
          description: 'Invoices past due date',
        });
        metrics.push({
          title: 'Total outstanding',
          value: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(invoiceMetrics.totalOutstanding),
          description: 'Total amount outstanding across all invoices',
        });
      }

      metrics.push({
        title: 'Teams',
        value: formatCount((teams ?? []).length),
        description: 'Teams collaborating in Dev2QA',
      });

      return metrics;
    },
    [
      (requests ?? []).length,
      pendingRequests.length,
      overdueRequests.length,
      projects,
      isProjectManager,
      managedProjects.length,
      isAdmin,
      users,
      teams,
      canManageInvoices,
      invoiceMetrics,
    ]
  );

  const recentActivity = React.useMemo(
    () => (requests ?? []).slice(0, 6),
    [requests]
  );

  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const [tableOpen, setTableOpen] = React.useState(false);

  // Now we can do conditional returns after all hooks are called
  // Note: AuthProvider handles the case when user is null, so we don't need to check here
  
  if (requestsError) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Dashboard unavailable</AlertTitle>
                <AlertDescription>
          We couldn't load your dashboard data. Please refresh or contact support if the problem persists.
                </AlertDescription>
            </Alert>
    );
    }

  // Show loading state with actual layout structure using skeletons
  const isLoading = loading || !requests || !user;

     return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="space-y-8 opacity-100 transition-opacity duration-300">
          <PageHeader
            title={`Welcome${user?.name ? `, ${user.name}` : ''}!`}
            description="Stay focused on the metrics and actions that matter to your role."
          >
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" disabled>
                <Link href="/dashboard/requests">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View requests
                </Link>
              </Button>
              <Button asChild disabled>
                <Link href="/dashboard/requests/new">
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  New request
                </Link>
              </Button>
            </div>
          </PageHeader>

          {/* Hero Card Skeleton */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-5 w-full max-w-md" />
                    </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-full sm:w-40" />
                    </CardContent>
                </Card>

          {/* Next Actions Skeleton */}
                <Card>
                    <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-full max-w-md" />
                      <Skeleton className="h-4 w-full max-w-xs" />
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </div>
                ))}
                        </div>
                    </CardContent>
                </Card>
        </div>
      ) : (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-in-out_forwards]">
          <PageHeader
            title={`Welcome${user.name ? `, ${user.name}` : ''}!`}
            description="Stay focused on the metrics and actions that matter to your role."
          >
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/requests">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View requests
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/requests/new">
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  New request
                </Link>
              </Button>
            </div>
          </PageHeader>

          <HeroCard summary={heroSummary} />

          <NextActionsList actions={nextActions} />

          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={metricsOpen}
              >
                <Activity className="h-4 w-4" />
                Secondary metrics
                <ArrowRight className={cn('h-4 w-4 transition-transform', metricsOpen ? 'rotate-90' : 'rotate-0')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <MetricsGrid metrics={secondaryMetrics} />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={activityOpen}
              >
                <Clock className="h-4 w-4" />
                Recent activity
                <ArrowRight className={cn('h-4 w-4 transition-transform', activityOpen ? 'rotate-90' : 'rotate-0')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <RecentActivityList items={recentActivity} />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={tableOpen}
              >
                <CheckCircle2 className="h-4 w-4" />
                Pending approval table
                <ArrowRight className={cn('h-4 w-4 transition-transform', tableOpen ? 'rotate-90' : 'rotate-0')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <CertificateRequestsTable
                requests={isQA ? pendingRequests : pendingRequests.slice(0, 10)}
                isLoading={false}
              />
            </CollapsibleContent>
          </Collapsible>

          {canManageInvoices && invoiceMetrics && invoiceMetrics.recent.length > 0 && (
            <Collapsible open={false} onOpenChange={() => {}}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/dashboard/admin/invoices">
                    <Receipt className="h-4 w-4" />
                    Recent invoices
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
