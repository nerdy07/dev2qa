'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useCollection } from '@/hooks/use-collection';
import { CertificateRequest, DesignRequest, Project, Task, User, Team, Role } from '@/lib/types';
import { query, where, collection, orderBy, doc, updateDoc, serverTimestamp, setDoc, getDocs, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  PlusCircle,
  Filter,
  Search,
  Calendar,
  FolderKanban,
  Users as UsersIcon,
  AlertCircle,
  MessageSquare,
  Target,
  ExternalLink,
  Loader2,
  CircleDot,
  TriangleAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getQATesterSuggestion } from '@/app/actions';
import { notifyOnNewRequest } from '@/app/requests/actions';
import { TaskCompletionDialog } from '@/components/tasks/task-completion-dialog';
import { ALL_PERMISSIONS, PERMISSIONS_BY_ROLE, ROLES } from '@/lib/roles';

type WorkItem = {
  id: string;
  type: 'request' | 'design';
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  project?: string;
  team?: string;
  date: Date;
  request?: CertificateRequest;
  design?: DesignRequest;
  hasComments?: boolean;
  actionRequired?: boolean;
};

export default function MyWorkPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [completionDialogOpen, setCompletionDialogOpen] = React.useState(false);
  const [pendingTask, setPendingTask] = React.useState<{ task: Task; project: Project } | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(new Date());

  // Fetch user's requests
  const myRequestsQuery = React.useMemo(() => {
    if (!user?.id) return null;
    return query(
      collection(db!, 'requests'),
      where('requesterId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
  }, [user?.id]);

  const { data: myRequests, loading: requestsLoading, error: requestsError } = useCollection<CertificateRequest>(
    'requests',
    myRequestsQuery
  );

  // Fetch user's design requests (if collection exists)
  const myDesignsQuery = React.useMemo(() => {
    if (!user?.id || !db) return null;
    try {
      return query(
        collection(db, 'designs'),
        where('designerId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
    } catch {
      return null;
    }
  }, [user?.id]);

  const { data: myDesigns, loading: designsLoading, error: designsError } = useCollection<DesignRequest>(
    'designs',
    myDesignsQuery
  );

  // Fetch all projects to find assigned tasks
  // Make this query non-blocking - don't let errors here block the page
  const projectsQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'projects'));
  }, []);
  
  const { data: allProjects, loading: projectsLoading, error: projectsError } = useCollection<Project>('projects', projectsQuery);
  
  // Fetch teams and users for certificate request creation
  const teamsQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'teams'));
  }, []);
  
  // Fetch all users - we'll filter by permissions instead of role
  const allUsersQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'));
  }, []);
  
  // Fetch all roles to check permissions
  const rolesQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'roles'));
  }, []);
  
  const { data: teams } = useCollection<Team>('teams', teamsQuery);
  const { data: allUsers } = useCollection<User>('users', allUsersQuery);
  const { data: allRoles } = useCollection<Role>('roles', rolesQuery);
  
  // Filter users who have requests:approve permission
  const qaUsers = React.useMemo(() => {
    if (!allUsers || !allRoles) return [];
    
    // Build roles map for quick lookup
    const rolesMap = new Map<string, Role>();
    allRoles.forEach(role => {
      rolesMap.set(role.name.toLowerCase(), role);
      // Also add variations
      rolesMap.set(role.name.toLowerCase().replace(/_/g, ''), role);
      rolesMap.set(role.name.toLowerCase().replace(/\s+/g, '_'), role);
    });
    
    return allUsers.filter(user => {
      const userRoles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
      
      for (const roleName of userRoles) {
        if (!roleName) continue;
        const normalizedRole = roleName.toLowerCase();
        
        // Check custom roles first
        const customRole = rolesMap.get(normalizedRole) || rolesMap.get(normalizedRole.replace(/_/g, ''));
        if (customRole?.permissions?.includes(ALL_PERMISSIONS.REQUESTS.APPROVE)) {
          return true;
        }
        
        // Check hardcoded roles as fallback
        const roleKey = Object.keys(ROLES).find(key => 
          ROLES[key as keyof typeof ROLES].toLowerCase() === normalizedRole
        ) as keyof typeof ROLES | undefined;
        
        if (roleKey) {
          const roleValue = ROLES[roleKey];
          const hardcodedPermissions = PERMISSIONS_BY_ROLE[roleValue as keyof typeof PERMISSIONS_BY_ROLE];
          if (hardcodedPermissions?.includes(ALL_PERMISSIONS.REQUESTS.APPROVE)) {
            return true;
          }
        }
      }
      
      return false;
    });
  }, [allUsers, allRoles]);

  // Handle projects errors gracefully - don't block the page
  React.useEffect(() => {
    if (projectsError) {
      console.error('[My Work] Error loading projects:', projectsError);
      // Don't block navigation - just log the error
    }
  }, [projectsError]);

  // Handle designs errors gracefully - designs collection is optional
  React.useEffect(() => {
    if (designsError && designsError.message?.includes('permission')) {
      // Silently ignore permission errors for designs - it's an optional feature
      console.debug('Designs collection not accessible:', designsError.message);
    }
  }, [designsError]);

  // Month filter boundaries
  const monthStart = React.useMemo(() => startOfMonth(selectedMonth), [selectedMonth]);
  const monthEnd = React.useMemo(() => endOfMonth(selectedMonth), [selectedMonth]);

  // Extract tasks assigned to current user from all projects (with month filtering for Done tasks)
  const myTasks = React.useMemo(() => {
    if (!allProjects || !user?.id) {
      return [];
    }
    
    const tasks: Array<{task: Task, project: Project, milestoneName: string}> = [];
    
    allProjects.forEach(project => {
      project.milestones?.forEach(milestone => {
        milestone.tasks?.forEach(task => {
          if (task.assigneeId === user.id) {
            // For Done tasks, filter by when certificate request was created (if available)
            if (task.status === 'Done' && task.certificateRequestId && myRequests) {
              const relatedRequest = myRequests.find(r => r.id === task.certificateRequestId);
              if (relatedRequest) {
                const requestDate = (relatedRequest.createdAt as any)?.toDate() || new Date();
                // Only include if certificate request was created in selected month
                if (requestDate < monthStart || requestDate > monthEnd) {
                  return; // Skip this Done task if not in selected month
                }
              }
            }
            // For In Progress and To Do tasks, show all current tasks (not filtered by month)
            tasks.push({ task, project, milestoneName: milestone.name });
          }
        });
      });
    });
    
    return tasks.sort((a, b) => {
      // Sort by status: To Do -> In Progress -> Done, then by project name
      const statusOrder = { 'To Do': 0, 'In Progress': 1, 'Done': 2 };
      const statusDiff = (statusOrder[a.task.status] || 0) - (statusOrder[b.task.status] || 0);
      if (statusDiff !== 0) return statusDiff;
      return a.project.name.localeCompare(b.project.name);
    });
  }, [allProjects, user?.id, myRequests, monthStart, monthEnd]);

  // Combine and format work items (filtered by month)
  const workItems = React.useMemo(() => {
    const items: WorkItem[] = [];
    
    if (myRequests) {
      myRequests.forEach(req => {
        const requestDate = (req.createdAt as any)?.toDate() || new Date();
        // Only include requests created in the selected month
        if (requestDate >= monthStart && requestDate <= monthEnd) {
          items.push({
            id: req.id,
            type: 'request',
            title: req.taskTitle,
            status: req.status,
            project: req.associatedProject,
            team: req.associatedTeam,
            date: requestDate,
            request: req,
            actionRequired: req.status === 'rejected' && !req.qaProcessRating // Needs feedback
          });
        }
      });
    }

    if (myDesigns) {
      myDesigns.forEach(design => {
        const designDate = (design.createdAt as any)?.toDate() || new Date();
        // Only include designs created in the selected month
        if (designDate >= monthStart && designDate <= monthEnd) {
          items.push({
            id: design.id,
            type: 'design',
            title: design.designTitle,
            status: design.status,
            date: designDate,
            design: design,
            actionRequired: design.status === 'rejected' && !design.reviewComments
          });
        }
      });
    }

    // Sort by date (newest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [myRequests, myDesigns, monthStart, monthEnd]);

  // Filter work items
  const filteredItems = React.useMemo(() => {
    return workItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.team?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workItems, searchTerm, statusFilter, typeFilter]);

  // Group items by status
  const pendingItems = filteredItems.filter(item => item.status === 'pending');
  const approvedItems = filteredItems.filter(item => item.status === 'approved');
  const rejectedItems = filteredItems.filter(item => item.status === 'rejected');
  const actionRequiredItems = filteredItems.filter(item => item.actionRequired);

  // Filter tasks by status
  const todoTasks = myTasks.filter(t => t.task.status === 'To Do');
  const inProgressTasks = myTasks.filter(t => t.task.status === 'In Progress');
  const doneTasks = myTasks.filter(t => t.task.status === 'Done');

  // Don't block navigation on loading states - allow page to render even while loading
  // Only show loading skeleton on initial load when we have no data at all
  const isInitialLoad = requestsLoading && myRequests === null;
  const error = requestsError; // Only show requests error, designs and projects are optional

  // Handle task status update
  const handleUpdateTaskStatus = async (task: Task, project: Project, newStatus: 'To Do' | 'In Progress' | 'Done') => {
    if (!db || !user) return;

    const previousStatus = task.status;
    const isMarkingDone = newStatus === 'Done' && previousStatus !== 'Done';

    // If marking as Done, show dialog to collect test links
    if (isMarkingDone) {
      setPendingTask({ task, project });
      setCompletionDialogOpen(true);
      return;
    }

    // For other status changes, update directly
    await updateTaskStatus(task, project, newStatus, task.testLinks || []);
  };

  // Actually update the task status (called after dialog confirmation or for non-Done status)
  const updateTaskStatus = async (task: Task, project: Project, newStatus: 'To Do' | 'In Progress' | 'Done', testLinks: string[] = []) => {
    if (!db || !user) {
      toast({
        title: 'Update Failed',
        description: 'Database connection or user authentication failed. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that the task is assigned to the current user
    if (task.assigneeId !== user.id) {
      toast({
        title: 'Permission Denied',
        description: 'You can only update tasks assigned to you.',
        variant: 'destructive',
      });
      return;
    }

    const isMarkingDone = newStatus === 'Done';

    try {
      // Find the task in the project structure and update it
      const updatedMilestones = project.milestones?.map(milestone => {
        const updatedTasks = milestone.tasks?.map(t => 
          t.id === task.id ? { 
            ...t, 
            status: newStatus,
            // Always update testLinks when marking as Done (even if empty array to clear old links)
            ...(isMarkingDone ? { testLinks: testLinks.length > 0 ? testLinks : [] } : {})
          } : t
        );
        return { ...milestone, tasks: updatedTasks };
      }) || [];

      const projectRef = doc(db, 'projects', project.id);
      
      // If marking task as Done and no certificate request exists, use transaction to ensure atomicity
      if (isMarkingDone && !task.certificateRequestId) {
        // Use transaction to ensure both task update and request creation succeed or fail together
        await runTransaction(db, async (transaction) => {
          // Read current project state
          const projectSnap = await transaction.get(projectRef);
          if (!projectSnap.exists()) {
            throw new Error('Project not found');
          }
          
          // Update task status in transaction
          transaction.update(projectRef, {
            milestones: updatedMilestones,
            updatedAt: serverTimestamp()
          });
        });
        
        // After transaction succeeds, create certificate request (non-critical operation)
        // If this fails, task is already updated, but we show error message
        try {
          await createCertificateRequestFromTask({ ...task, testLinks }, project);
        } catch (requestError) {
          // Task is already updated, but request creation failed
          toast({
            title: 'Task Updated, but Request Creation Failed',
            description: `Task status updated to Done, but failed to create certificate request. You may need to create it manually.`,
            variant: 'destructive',
          });
          return; // Exit early, don't show success message
        }
      } else {
        // For non-Done status updates or when request already exists, just update project
        await updateDoc(projectRef, { 
          milestones: updatedMilestones,
          updatedAt: serverTimestamp()
        });
        
        toast({
          title: 'Task Updated',
          description: `Task "${task.name}" status updated to ${newStatus}.`,
        });
      }
      
      // The useCollection hook with real-time listener will automatically update the UI
      // No need to manually refresh - Firestore will push the update via onSnapshot
    } catch (err) {
      const error = err as Error;
      console.error('Error updating task:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        errorMessage = 'You do not have permission to update this task. The Firestore rules may need to be deployed.';
      } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('Missing or insufficient permissions')) {
        errorMessage = 'Permission denied. Please ensure Firestore rules allow authenticated users to update projects.';
      }
      
      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Handle task completion with links
  const handleTaskComplete = (links: string[]) => {
    if (!pendingTask) return;
    updateTaskStatus(pendingTask.task, pendingTask.project, 'Done', links);
    setPendingTask(null);
  };

  // Automatically create certificate request when task is marked as Done
  const createCertificateRequestFromTask = async (task: Task, project: Project) => {
    if (!db || !user || !teams || !qaUsers) {
      toast({
        title: 'Cannot Create Request',
        description: 'Missing required data. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const requiresCertificate = task.certificateRequired !== false;
      // Find the team - try to match by project or use a default
      const associatedTeam = project.name || 'General';
      
      // Get AI suggestion for QA tester
      let suggestedQATester = '';
      if (qaUsers.length > 0) {
        const qaTesterList = qaUsers.map(u => ({ name: u.name, expertise: u.expertise || '' }));
        const suggestionResult = await getQATesterSuggestion({
          taskTitle: task.name,
          taskDescription: task.description || task.name,
          associatedTeam: associatedTeam,
          associatedProject: project.name,
          qaTesterList,
        });

        if (suggestionResult.success) {
          suggestedQATester = suggestionResult.data.suggestedQATester;
        }
      }

      // Create certificate request
      // Include first test link as taskLink for backward compatibility, or combine all links
      const taskLink = task.testLinks && task.testLinks.length > 0 
        ? task.testLinks[0] 
        : undefined;

      // Build request data - only include taskLink if it's defined (Firestore doesn't allow undefined)
      const requestDescription = task.description || (requiresCertificate
        ? `Certificate request for completed task: ${task.name}`
        : `QA review request for completed task: ${task.name}`);

      const requestDataBase: Omit<CertificateRequest, 'id' | 'taskLink'> = {
        taskTitle: task.name,
        associatedTeam: associatedTeam,
        associatedProject: project.name || '',
        description: requestDescription,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        certificateRequired: requiresCertificate,
      };

      // Only add taskLink if it exists (avoid undefined values in Firestore)
      const requestData: Omit<CertificateRequest, 'id'> = taskLink 
        ? { ...requestDataBase, taskLink }
        : requestDataBase;

      const requestsCollectionRef = collection(db, 'requests');
      const requestDocRef = doc(requestsCollectionRef);
      
      // Generate friendly ID for request
      const { generateShortId } = await import('@/lib/id-generator');
      const shortId = generateShortId('request');
      
      await setDoc(requestDocRef, {
        ...requestData,
        shortId: shortId,
      });
      const requestId = requestDocRef.id;

      // Link the certificate request back to the task using batch write for atomicity
      const projectRef = doc(db, 'projects', project.id);
      const batch = writeBatch(db);
      
      // Update project to link certificate request ID
      const updatedMilestones = project.milestones?.map(milestone => {
        const updatedTasks = milestone.tasks?.map(t => 
          t.id === task.id ? { ...t, certificateRequestId: requestId } : t
        );
        return { ...milestone, tasks: updatedTasks };
      }) || [];

      batch.update(projectRef, { 
        milestones: updatedMilestones,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();

      // Notify QA testers
      const qaEmails = qaUsers.map(u => u.email);
      await notifyOnNewRequest({
        qaEmails: qaEmails,
        taskTitle: task.name,
        requesterName: user.name,
        associatedProject: project.name || '',
        associatedTeam: associatedTeam,
        certificateRequired: requiresCertificate,
      });

      const toastDescription = requiresCertificate
        ? `Task "${task.name}" marked as Done. Certificate request ${shortId} has been created and sent to QA for approval.${suggestedQATester ? ` Suggested QA tester: ${suggestedQATester}` : ''}`
        : `Task "${task.name}" marked as Done. QA sign-off request ${shortId} has been created (no completion certificate required).${suggestedQATester ? ` Suggested QA tester: ${suggestedQATester}` : ''}`;

      toast({
        title: 'Task Completed',
        description: toastDescription,
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error creating certificate request:', error);
      toast({
        title: 'Task Updated, but Request Creation Failed',
        description: `Task status updated, but failed to create certificate request: ${error.message}. You may need to create it manually.`,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'request' ? <FileText className="h-4 w-4" /> : <FolderKanban className="h-4 w-4" />;
  };

  const getItemHref = (item: WorkItem) =>
    item.type === 'request'
      ? `/dashboard/requests/${item.id}`
      : `/dashboard/designs/${item.id}`;

  // Only show loading skeleton on true initial load - don't block navigation
  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Work" description="View and manage all your assigned tasks and work items." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Error Loading Work Items</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader 
        title="My Work" 
        description="View and manage all your assigned tasks, requests, and design submissions."
      >
        <div className="flex items-center gap-2">
          {/* Month Filter */}
          <div className="flex items-center gap-2 border rounded-md px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="h-8 w-8 p-0"
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
              <SelectTrigger className="w-[160px] h-8 border-0 shadow-none">
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
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              disabled={startOfMonth(selectedMonth) >= startOfMonth(new Date())}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {startOfMonth(selectedMonth).getTime() !== startOfMonth(new Date()).getTime() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(new Date())}
                className="h-8 text-xs"
              >
                Current
              </Button>
            )}
          </div>
          <Button asChild>
            <Link href="/dashboard/requests/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Request
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.length}</div>
            <p className="text-xs text-muted-foreground">{inProgressTasks.length} in progress, {todoTasks.length} to do</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{actionRequiredItems.length}</div>
            <p className="text-xs text-muted-foreground">Items need your attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Work</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks.length + pendingItems.length}</div>
            <p className="text-xs text-muted-foreground">{inProgressTasks.length} tasks in progress, {pendingItems.length} requests pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{doneTasks.length + approvedItems.length}</div>
            <p className="text-xs text-muted-foreground">{doneTasks.length} task{doneTasks.length !== 1 ? 's' : ''} done, {approvedItems.length} request{approvedItems.length !== 1 ? 's' : ''} approved by QA/PM</p>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>My Assigned Tasks</CardTitle>
          <CardDescription>
            Tasks assigned to you across all projects. Update status as you progress.
            {!projectsLoading && myTasks.length === 0 && (
              <span className="block mt-2 text-sm text-muted-foreground">
                No tasks assigned yet. Contact your project lead to get tasks assigned to you.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading projects...</span>
            </div>
          ) : myTasks.length > 0 ? (
            <Tabs defaultValue="todo" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="todo">
                  To Do ({todoTasks.length})
                </TabsTrigger>
                <TabsTrigger value="inprogress">
                  In Progress ({inProgressTasks.length})
                </TabsTrigger>
                <TabsTrigger value="done">
                  Done ({doneTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todo" className="mt-4">
                <TasksList tasks={todoTasks} onStatusUpdate={handleUpdateTaskStatus} />
              </TabsContent>

              <TabsContent value="inprogress" className="mt-4">
                <TasksList tasks={inProgressTasks} onStatusUpdate={handleUpdateTaskStatus} />
              </TabsContent>

              <TabsContent value="done" className="mt-4">
                <TasksList tasks={doneTasks} onStatusUpdate={handleUpdateTaskStatus} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <CardTitle className="text-lg mb-2">No Tasks Assigned</CardTitle>
              <CardDescription className="max-w-md">
                You don't have any tasks assigned to you yet. Tasks need to be assigned by a project lead or admin in the project details page.
                <br /><br />
                Once tasks are assigned to you with your user ID as the assignee, they will appear here automatically.
              </CardDescription>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, project, or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="request">Requests</SelectItem>
                <SelectItem value="design">Designs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Required Section */}
      {actionRequiredItems.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Action Required ({actionRequiredItems.length})
            </CardTitle>
            <CardDescription>These items need your attention or feedback.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {actionRequiredItems.map(item => (
                <Link
                  key={item.id}
                  href={getItemHref(item)}
                  className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                >
                  <Card className="border-l-4 border-l-orange-500 transition-shadow group-hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <CardTitle className="text-base text-foreground group-hover:text-primary">
                            {item.title}
                          </CardTitle>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        {item.project && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FolderKanban className="h-3 w-3" />
                            <span>{item.project}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(item.date, 'MMM d, yyyy')}</span>
                        </div>
                        {item.status === 'rejected' && item.type === 'request' && (
                          <div className="flex items-center gap-2 text-orange-600 text-xs font-medium">
                            <MessageSquare className="h-3 w-3" />
                            <span>Please provide feedback</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests & Designs Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>My Requests & Designs</CardTitle>
          <CardDescription>
            Certificate requests and design submissions you've created. Track their review status here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({filteredItems.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingItems.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Completed ({approvedItems.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedItems.length})
              </TabsTrigger>
            </TabsList>

        <TabsContent value="all" className="mt-6">
          <WorkItemsGrid items={filteredItems} getStatusBadge={getStatusBadge} getTypeIcon={getTypeIcon} />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <WorkItemsGrid items={pendingItems} getStatusBadge={getStatusBadge} getTypeIcon={getTypeIcon} />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <WorkItemsGrid items={approvedItems} getStatusBadge={getStatusBadge} getTypeIcon={getTypeIcon} />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <WorkItemsGrid items={rejectedItems} getStatusBadge={getStatusBadge} getTypeIcon={getTypeIcon} />
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No work items found</CardTitle>
            <CardDescription className="text-center mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by creating your first certificate request or design submission.'}
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/requests/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Request
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task Completion Dialog */}
      <TaskCompletionDialog
        open={completionDialogOpen}
        onOpenChange={(open) => {
          setCompletionDialogOpen(open);
          if (!open) {
            setPendingTask(null);
          }
        }}
        taskName={pendingTask?.task.name || ''}
        onComplete={handleTaskComplete}
        existingLinks={pendingTask?.task.testLinks || []}
      />
    </>
  );
}

function TasksList({ 
  tasks, 
  onStatusUpdate 
}: { 
  tasks: Array<{task: Task, project: Project, milestoneName: string}>;
  onStatusUpdate: (task: Task, project: Project, status: 'To Do' | 'In Progress' | 'Done') => void;
}) {
  const router = useRouter();
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No tasks in this category</p>
      </div>
    );
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'Done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <CircleDot className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-3">
      {tasks.map(({ task, project, milestoneName }) => (
        <Card key={task.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(task.status)}
                  <CardTitle className="text-base">{task.name}</CardTitle>
                  <Badge variant={task.certificateRequired === false ? 'secondary' : 'outline'} className="text-xs font-medium">
                    {task.certificateRequired === false ? 'QA Sign-off' : 'Certificate'}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                )}
                {task.testLinks && task.testLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {task.testLinks.map((link, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[150px]">
                          {link}
                        </a>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    <span>{project.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>{milestoneName}</span>
                  </div>
                  {task.startDate && task.endDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format((task.startDate as any)?.toDate() || new Date(), 'MMM d')} - {format((task.endDate as any)?.toDate() || new Date(), 'MMM d')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={task.status}
                  onValueChange={(value: 'To Do' | 'In Progress' | 'Done') => 
                    onStatusUpdate(task, project, value)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-3 w-3" />
                        To Do
                      </div>
                    </SelectItem>
                    <SelectItem value="In Progress">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3" />
                        In Progress
                      </div>
                    </SelectItem>
                    <SelectItem value="Done">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" />
                        Done
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/admin/projects/${project.id}`)}
                  title="View Project"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorkItemsGrid({
  items,
  getStatusBadge,
  getTypeIcon,
}: {
  items: WorkItem[];
  getStatusBadge: (status: string) => React.ReactNode;
  getTypeIcon: (type: string) => React.ReactNode;
}) {
  const [visibleCount, setVisibleCount] = React.useState(9);
  const visibleItems = React.useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = items.length > visibleCount;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No items in this category</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
        <Link
          key={item.id}
          href={getItemHref(item)}
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Card className="transition-all group-hover:border-primary/50 group-hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-muted-foreground flex-shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <CardTitle className="text-base truncate text-foreground group-hover:text-primary">
                    {item.title}
                  </CardTitle>
                </div>
                {getStatusBadge(item.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-1.5 text-sm">
                {item.project && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.project}</span>
                  </div>
                )}
                {item.team && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UsersIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.team}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{format(item.date, 'MMM d, yyyy')}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatDistanceToNow(item.date, { addSuffix: true })})
                  </span>
                </div>
              </div>
              {item.type === 'request' && item.request && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Certificate Request</span>
                    {item.request.certificateId && (
                      <Badge variant="outline" className="text-xs">
                        Certificate Issued
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((count) => Math.min(count + 6, items.length))}
            className="px-lg"
          >
            Load more work items
          </Button>
        </div>
      )}
    </div>
  );
}

