
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Team, Project, User, Role } from '@/lib/types';
import { query, collection, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { notifyOnNewRequest } from '@/app/requests/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ALL_PERMISSIONS, PERMISSIONS_BY_ROLE, ROLES } from '@/lib/roles';

const formSchema = z.object({
  taskTitle: z.string().min(5, 'Title must be at least 5 characters.').max(200, 'Title must be less than 200 characters.'),
  associatedTeam: z.string({ required_error: 'Please select a team.' }),
  associatedProject: z.string({ required_error: 'Please select a project.' }),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(5000, 'Description must be less than 5000 characters.'),
  taskLink: z.string().url('Please enter a valid URL.').max(2000, 'URL must be less than 2000 characters.').optional().or(z.literal('')),
});

export default function NewRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  // Make queries stable to prevent unnecessary re-subscriptions
  const teamsQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'teams'));
  }, []);

  const projectsQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'projects'));
  }, []);

  // Fetch all users and roles to filter by permissions
  const allUsersQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'));
  }, []);

  const rolesQuery = React.useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'roles'));
  }, []);

  const { data: teams } = useCollection<Team>('teams', teamsQuery);
  const { data: projects } = useCollection<Project>('projects', projectsQuery);
  const { data: allUsers } = useCollection<User>('users', allUsersQuery);
  const { data: allRoles } = useCollection<Role>('roles', rolesQuery);

  // Filter users who have requests:approve permission
  const qaUsers = React.useMemo(() => {
    if (!allUsers || !allRoles) return [];
    
    // Build roles map for quick lookup
    const rolesMap = new Map<string, Role>();
    allRoles.forEach(role => {
      rolesMap.set(role.name.toLowerCase(), role);
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskTitle: '',
      associatedTeam: '',
      associatedProject: '',
      description: '',
      taskLink: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) {
        toast({ title: "Not Authenticated or DB not available", description: "You must be logged in to create a request.", variant: "destructive"});
        return;
    }

    // Validate team and project selection
    const selectedTeam = teams?.find(t => t.id === values.associatedTeam);
    const selectedProject = projects?.find(p => p.id === values.associatedProject);
    
    if (!selectedTeam) {
      toast({ 
        title: "Invalid Team", 
        description: "The selected team does not exist. Please select a valid team.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!selectedProject) {
      toast({ 
        title: "Invalid Project", 
        description: "The selected project does not exist. Please select a valid project.", 
        variant: "destructive" 
      });
      return;
    }
    
    const teamName = selectedTeam.name;
    const projectName = selectedProject.name;

    const requestsCollectionRef = collection(db, 'requests');
    const docRef = doc(requestsCollectionRef);
    const requestId = docRef.id;
    
    // Generate friendly ID before creating document
    const { generateShortId } = await import('@/lib/id-generator');
    const shortId = generateShortId('request');
    
    const requestData = {
        ...values,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        associatedTeam: teamName, // Save the name, not the ID
        associatedProject: projectName, // Save the name, not the ID
        status: 'pending' as const,
        shortId: shortId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        certificateRequired: true,
    };

    try {
        await setDoc(docRef, requestData);

        toast({
            title: 'Request Submitted!',
            description: 'Your certificate request has been sent for QA review.',
        });

        // Notify users with requests:approve permission
        const qaEmails = qaUsers.map(u => u.email);
        const qaUserIds = qaUsers.map(u => u.id);

        // Create in-app notifications for QA testers
        if (qaUserIds.length > 0) {
            const { createInAppNotificationsForUsers } = await import('@/lib/notifications');
            await createInAppNotificationsForUsers(qaUserIds, {
                type: 'general',
                title: 'New Certificate Request',
                message: `${user.name} submitted a new certificate request: "${values.taskTitle}"`,
                read: false,
                data: {
                    requestId: requestId,
                },
            });
        }

        const emailResult = await notifyOnNewRequest({
            qaEmails: qaEmails,
            taskTitle: values.taskTitle,
            requesterName: user.name,
            associatedProject: projectName,
            associatedTeam: teamName,
            certificateRequired: true,
        });

        if (!emailResult.success) {
            toast({ title: 'QA Notification Failed', description: emailResult.error, variant: 'destructive' });
        }

        router.push('/dashboard');
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: requestsCollectionRef.path,
                operation: 'create',
                requestResourceData: requestData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error('Error submitting request:', serverError);
            toast({
                title: 'Submission Failed',
                description: serverError.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    }
  }

  return (
    <>
      <PageHeader
        title="New Certificate Request"
        description="Fill out the form below to request a certificate for a completed task."
      >
        <BackButton />
      </PageHeader>
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="taskTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., User Profile Page Implementation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taskLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Task/Work (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jira, Figma, or GitHub link" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="associatedTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Team</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams && teams.length > 0 ? (
                            teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)
                          ) : (
                            <SelectItem value="loading" disabled>Loading teams...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="associatedProject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects && projects.length > 0 ? (
                            projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)
                          ) : (
                            <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Description/Context</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain what was done and its impact..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
