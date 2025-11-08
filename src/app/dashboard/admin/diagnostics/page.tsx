'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection } from '@/hooks/use-collection';
import { Project, CertificateRequest, Transaction, User, LeaveRequest, Certificate, Comment } from '@/lib/types';
import { Stethoscope, TriangleAlert, Bot, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getProjectDiagnoses, getExpenseDiagnoses, getUserDiagnoses } from '@/app/actions';
import { DiagnoseProjectsOutput } from '@/ai/flows/diagnose-projects-flow';
import { DiagnoseExpensesOutput } from '@/ai/flows/diagnose-expenses-flow';
import { DiagnoseUsersOutput } from '@/ai/flows/diagnose-users-flow';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo } from 'react';
import Link from 'next/link';

export default function DiagnosticsPage() {
  const { data: projects, loading: projectsLoading, error: projectsError } = useCollection<Project>('projects');
  const { data: requests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>('requests');
  const { data: transactions, loading: transactionsLoading, error: transactionsError } = useCollection<Transaction>('transactions');
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>('users');
  const { data: certificates, loading: certificatesLoading } = useCollection<Certificate>('certificates');
  const { data: comments, loading: commentsLoading } = useCollection<Comment>('comments');
  const { data: leaveRequests, loading: leaveRequestsLoading } = useCollection<LeaveRequest>('leaveRequests');

  const [activeTab, setActiveTab] = React.useState<'projects' | 'expenses' | 'users'>('projects');
  const [isRunning, setIsRunning] = React.useState(false);
  const [projectDiagnoses, setProjectDiagnoses] = React.useState<DiagnoseProjectsOutput | null>(null);
  const [expenseDiagnoses, setExpenseDiagnoses] = React.useState<DiagnoseExpensesOutput | null>(null);
  const [userDiagnoses, setUserDiagnoses] = React.useState<DiagnoseUsersOutput | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const loading = projectsLoading || requestsLoading || transactionsLoading || usersLoading || certificatesLoading || commentsLoading || leaveRequestsLoading;
  const error = projectsError || requestsError || transactionsError || usersError;

  // Calculate user activity metrics
  const userActivityData = useMemo(() => {
    if (!users || !requests || !comments || !certificates || !leaveRequests) return [];

    return users.map(user => {
      const userRequests = requests.filter(r => r.requesterId === user.id);
      const userComments = comments.filter(c => c.userId === user.id);
      const userCertificates = certificates.filter(c => c.requesterName === user.name);
      const userApprovals = requests.filter(r => r.qaTesterId === user.id);
      const userLeaveRequests = leaveRequests.filter(l => l.userId === user.id);
      
      // Calculate recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRequests = userRequests.filter(r => {
        const date = (r.createdAt as any)?.toDate?.();
        return date && date >= thirtyDaysAgo;
      }).length;
      
      const recentComments = userComments.filter(c => {
        const date = (c.createdAt as any)?.toDate?.();
        return date && date >= thirtyDaysAgo;
      }).length;
      
      const recentActivity = recentRequests + recentComments;

      // Find last activity date
      const allDates = [
        ...userRequests.map(r => (r.createdAt as any)?.toDate?.()).filter(Boolean),
        ...userComments.map(c => (c.createdAt as any)?.toDate?.()).filter(Boolean),
        ...userApprovals.map(r => (r.updatedAt as any)?.toDate?.()).filter(Boolean),
      ].filter(Boolean) as Date[];
      
      const lastActivity = allDates.length > 0 
        ? allDates.sort((a, b) => b.getTime() - a.getTime())[0] 
        : undefined;

      return {
        userId: user.id,
        userName: user.name,
        role: user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : ''),
        email: user.email,
        startDate: user.startDate ? ((user.startDate as any)?.toDate?.()?.toISOString() || (typeof user.startDate === 'string' ? user.startDate : undefined)) : undefined,
        requestsCreated: userRequests.length,
        requestsApproved: userApprovals.length,
        commentsPosted: userComments.length,
        certificatesEarned: userCertificates.length,
        leaveRequests: userLeaveRequests.length,
        lastActivityDate: lastActivity?.toISOString(),
        recentActivityCount: recentActivity,
      };
    });
  }, [users, requests, comments, certificates, leaveRequests]);

  const handleRunProjectDiagnostics = async () => {
    setIsRunning(true);
    setAiError(null);
    setProjectDiagnoses(null);

    const activeProjects = projects?.filter(p => p.status === 'In Progress' || p.status === 'On Hold') || [];

    if (activeProjects.length === 0) {
        setAiError("No active projects available to diagnose.");
        setIsRunning(false);
        return;
    }

    const input = {
        projects: activeProjects.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            startDate: p.startDate?.toDate().toISOString(),
            endDate: p.endDate?.toDate().toISOString(),
            leadName: p.leadName || undefined,
            requests: requests?.filter(r => r.associatedProject === p.name).map(r => ({ id: r.id, status: r.status, taskTitle: r.taskTitle })) || [],
        }))
    };

    const result = await getProjectDiagnoses(input);

    if (result.success) {
        setProjectDiagnoses(result.data);
    } else {
        setAiError(result.error);
    }

    setIsRunning(false);
  };

  const handleRunExpenseDiagnostics = async () => {
    setIsRunning(true);
    setAiError(null);
    setExpenseDiagnoses(null);

    if (!transactions || transactions.length === 0) {
        setAiError("No transactions available to analyze.");
        setIsRunning(false);
        return;
    }

    const input = {
        transactions: transactions.map(t => ({
            id: t.id,
            type: t.type,
            category: t.category,
            amount: t.amount,
            currency: t.currency,
            date: (t.date as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
            description: t.description,
            projectName: t.projectName,
        }))
    };

    const result = await getExpenseDiagnoses(input);

    if (result.success) {
        setExpenseDiagnoses(result.data);
    } else {
        setAiError(result.error);
    }

    setIsRunning(false);
  };

  const handleRunUserDiagnostics = async () => {
    setIsRunning(true);
    setAiError(null);
    setUserDiagnoses(null);

    if (!userActivityData || userActivityData.length === 0) {
        setAiError("No user activity data available to analyze.");
        setIsRunning(false);
        return;
    }

    const input = {
        users: userActivityData,
    };

    const result = await getUserDiagnoses(input);

    if (result.success) {
        setUserDiagnoses(result.data);
    } else {
        setAiError(result.error);
    }

    setIsRunning(false);
  };
  
  const riskVariant = (level: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch(level) {
        case 'Critical':
        case 'High':
            return 'destructive';
        case 'Medium':
            return 'secondary';
        case 'Low':
        default:
            return 'outline';
    }
  };

  const renderProjectResults = () => {
    if (isRunning && activeTab === 'projects') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>AI is analyzing your projects. This may take a moment...</p>
                </div>
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
        );
    }

    if (aiError && activeTab === 'projects') {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Diagnostics Failed</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
            </Alert>
        );
    }

    if (projectDiagnoses) {
        if (projectDiagnoses.diagnoses.length === 0) {
            return (
                <Alert>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>All Clear!</AlertTitle>
                    <AlertDescription>The AI analysis did not detect any significant risks in your active projects.</AlertDescription>
                </Alert>
            );
        }
        return (
            <Accordion type="single" collapsible className="w-full">
                {projectDiagnoses.diagnoses.sort((a,b) => {
                    const order = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                    return order[b.riskLevel] - order[a.riskLevel];
                }).map(d => (
                    <AccordionItem value={d.projectId} key={d.projectId}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-4">
                                <Badge variant={riskVariant(d.riskLevel)}>{d.riskLevel} Risk</Badge>
                                <span className="font-semibold">{d.projectName}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 px-2">
                            <div>
                                <h4 className="font-semibold text-sm">Diagnosis</h4>
                                <p className="text-muted-foreground">{d.diagnosis}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Recommendation</h4>
                                <p className="text-muted-foreground">{d.recommendation}</p>
                            </div>
                            <Button asChild variant="link" className="p-0 h-auto">
                                <Link href={`/dashboard/admin/projects/${d.projectId}`}>View Project</Link>
                            </Button>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    return null;
  };

  const renderExpenseResults = () => {
    if (isRunning && activeTab === 'expenses') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>AI is analyzing your expenses. This may take a moment...</p>
                </div>
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
        );
    }

    if (aiError && activeTab === 'expenses') {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Diagnostics Failed</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
            </Alert>
        );
    }

    if (expenseDiagnoses) {
        return (
            <div className="space-y-6">
                {/* Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Expenses</p>
                                <p className="text-2xl font-bold">₦{expenseDiagnoses.summary.totalExpenses.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Income</p>
                                <p className="text-2xl font-bold">₦{expenseDiagnoses.summary.totalIncome.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Net Balance</p>
                                <p className={`text-2xl font-bold ${expenseDiagnoses.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₦{expenseDiagnoses.summary.netBalance.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {expenseDiagnoses.summary.trends.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-semibold mb-2">Key Trends:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {expenseDiagnoses.summary.trends.map((trend, i) => (
                                        <li key={i}>{trend}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Diagnoses */}
                {expenseDiagnoses.diagnoses.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {expenseDiagnoses.diagnoses.sort((a,b) => {
                            const order = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                            return order[b.riskLevel] - order[a.riskLevel];
                        }).map((d, i) => (
                            <AccordionItem value={`expense-${i}`} key={i}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-4">
                                        <Badge variant={riskVariant(d.riskLevel)}>{d.riskLevel} Risk</Badge>
                                        <span className="font-semibold">{d.category}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 px-2">
                                    <div>
                                        <h4 className="font-semibold text-sm">Diagnosis</h4>
                                        <p className="text-muted-foreground">{d.diagnosis}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">Recommendation</h4>
                                        <p className="text-muted-foreground">{d.recommendation}</p>
                                    </div>
                                    {d.metrics && (
                                        <div className="text-sm text-muted-foreground">
                                            {d.metrics.totalAmount && <p>Total: ₦{d.metrics.totalAmount.toLocaleString()}</p>}
                                            {d.metrics.trend && <p>Trend: {d.metrics.trend}</p>}
                                            {d.metrics.percentageOfTotal && <p>Percentage of Total: {d.metrics.percentageOfTotal.toFixed(1)}%</p>}
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <Alert>
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>All Clear!</AlertTitle>
                        <AlertDescription>No significant expense concerns detected.</AlertDescription>
                    </Alert>
                )}
            </div>
        );
    }

    return null;
  };

  const renderUserResults = () => {
    if (isRunning && activeTab === 'users') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>AI is analyzing user activity. This may take a moment...</p>
                </div>
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
        );
    }

    if (aiError && activeTab === 'users') {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Diagnostics Failed</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
            </Alert>
        );
    }

    if (userDiagnoses) {
        return (
            <div className="space-y-6">
                {/* Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">User Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <p className="text-2xl font-bold">{userDiagnoses.summary.totalUsers}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Users</p>
                                <p className="text-2xl font-bold text-green-600">{userDiagnoses.summary.activeUsers}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Inactive Users</p>
                                <p className="text-2xl font-bold text-red-600">{userDiagnoses.summary.inactiveUsers}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Activity Score</p>
                                <p className="text-2xl font-bold">{userDiagnoses.summary.averageActivityScore.toFixed(1)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-muted-foreground">High Engagement</p>
                                <p className="text-xl font-semibold text-green-600">{userDiagnoses.summary.engagementLevels.high}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Medium Engagement</p>
                                <p className="text-xl font-semibold text-yellow-600">{userDiagnoses.summary.engagementLevels.medium}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Low Engagement</p>
                                <p className="text-xl font-semibold text-red-600">{userDiagnoses.summary.engagementLevels.low}</p>
                            </div>
                        </div>
                        {userDiagnoses.summary.topPerformers.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-semibold mb-2">Top Performers:</p>
                                <p className="text-sm text-muted-foreground">{userDiagnoses.summary.topPerformers.join(', ')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Diagnoses */}
                {userDiagnoses.diagnoses.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {userDiagnoses.diagnoses.sort((a,b) => {
                            const order = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                            return order[b.riskLevel] - order[a.riskLevel];
                        }).map((d, i) => (
                            <AccordionItem value={`user-${d.userId}`} key={d.userId}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-4">
                                        <Badge variant={riskVariant(d.riskLevel)}>{d.riskLevel} Risk</Badge>
                                        <span className="font-semibold">{d.userName}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 px-2">
                                    <div>
                                        <h4 className="font-semibold text-sm">Diagnosis</h4>
                                        <p className="text-muted-foreground">{d.diagnosis}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">Recommendation</h4>
                                        <p className="text-muted-foreground">{d.recommendation}</p>
                                    </div>
                                    {d.metrics && (
                                        <div className="text-sm text-muted-foreground">
                                            {d.metrics.activityScore !== undefined && <p>Activity Score: {d.metrics.activityScore}</p>}
                                            {d.metrics.engagementLevel && <p>Engagement Level: {d.metrics.engagementLevel}</p>}
                                            {d.metrics.peakActivityHours && <p>Peak Activity: {d.metrics.peakActivityHours}</p>}
                                        </div>
                                    )}
                                    <Button asChild variant="link" className="p-0 h-auto">
                                        <Link href={`/dashboard/admin/users`}>View User</Link>
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <Alert>
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>All Clear!</AlertTitle>
                        <AlertDescription>No significant user engagement concerns detected.</AlertDescription>
                    </Alert>
                )}
            </div>
        );
    }

    return null;
  };

  const getRunButton = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <Button onClick={handleRunProjectDiagnostics} disabled={isRunning || loading}>
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            {isRunning ? 'Analyzing...' : 'Run Project Diagnostics'}
          </Button>
        );
      case 'expenses':
        return (
          <Button onClick={handleRunExpenseDiagnostics} disabled={isRunning || loading}>
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            {isRunning ? 'Analyzing...' : 'Run Expense Diagnostics'}
          </Button>
        );
      case 'users':
        return (
          <Button onClick={handleRunUserDiagnostics} disabled={isRunning || loading}>
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            {isRunning ? 'Analyzing...' : 'Run User Diagnostics'}
          </Button>
        );
    }
  };

  return (
    <>
      <PageHeader
        title="AI Diagnostics"
        description="Analyze projects, expenses, and user activity to identify risks and opportunities."
      >
        {getRunButton()}
      </PageHeader>
      
      {error && (
         <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>Could not load data needed for diagnostics. {error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bot />
                Analysis Results
            </CardTitle>
            <CardDescription>
                Select a category and click "Run Diagnostics" to analyze your data.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'projects' | 'expenses' | 'users')}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                </TabsList>
                <TabsContent value="projects" className="mt-6">
                    {renderProjectResults()}
                </TabsContent>
                <TabsContent value="expenses" className="mt-6">
                    {renderExpenseResults()}
                </TabsContent>
                <TabsContent value="users" className="mt-6">
                    {renderUserResults()}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
