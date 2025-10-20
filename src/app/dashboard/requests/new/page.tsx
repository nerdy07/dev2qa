
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/common/page-header';
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
import { getQATesterSuggestion } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import { Team, Project, User } from '@/lib/types';
import { query, where, collection, addDoc, serverTimestamp, getDocs, FirebaseError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import { notifyOnNewRequest } from '@/app/requests/actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  taskTitle: z.string().min(5, 'Title must be at least 5 characters.'),
  associatedTeam: z.string({ required_error: 'Please select a team.' }),
  associatedProject: z.string({ required_error: 'Please select a project.' }),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  taskLink: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
});

type Suggestion = { suggestedQATester: string; reason: string };

export default function NewRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const { data: teams } = useCollection<Team>('teams');
  const { data: projects } = useCollection<Project>('projects');
  const { data: qaUsers } = useCollection<User>('users', query(collection(db!, 'users'), where('role', '==', 'qa_tester')));

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

  const handleSuggestQATester = async () => {
    const { taskTitle, description, associatedTeam, associatedProject } = form.getValues();
    if (!taskTitle || !description || !associatedTeam || !associatedProject) {
        toast({
            title: 'Missing Information',
            description: 'Please fill out Title, Team, Project, and Description before getting a suggestion.',
            variant: 'destructive',
        });
        return;
    }

    if (!qaUsers || qaUsers.length === 0) {
        toast({
            title: 'No QA Testers',
            description: 'There are no QA testers available to assign.',
            variant: 'destructive',
        });
        return;
    }

    setIsSuggesting(true);
    setSuggestion(null);

    const qaTesterList = qaUsers.map(u => ({ name: u.name, expertise: u.expertise }));

    const result = await getQATesterSuggestion({
      taskTitle,
      taskDescription: description,
      associatedTeam,
      associatedProject,
      qaTesterList,
    });

    if (result.success) {
      setSuggestion(result.data);
    } else {
      toast({
        title: 'Suggestion Failed',
        description: result.error,
        variant: 'destructive',
      });
    }

    setIsSuggesting(false);
  };
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) {
        toast({ title: "Not Authenticated or DB not available", description: "You must be logged in to create a request.", variant: "destructive"});
        return;
    }

    const requestData = {
        ...values,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    const requestsCollectionRef = collection(db, 'requests');

    try {
        const docRef = await addDoc(requestsCollectionRef, requestData);
        
        toast({
          title: 'Request Submitted!',
          description: 'Your certificate request has been sent for QA review.',
        });

        // Notify QA Testers
        const qaQuery = query(collection(db!, 'users'), where('role', '==', 'qa_tester'));
        const qaSnapshot = await getDocs(qaQuery);
        const qaEmails = qaSnapshot.docs.map(doc => (doc.data() as User).email);

        const emailResult = await notifyOnNewRequest({ 
            qaEmails: qaEmails,
            taskTitle: values.taskTitle,
            requesterName: user.name,
            associatedProject: values.associatedProject,
            associatedTeam: values.associatedTeam
        });

        if (!emailResult.success) {
            toast({ title: 'QA Notification Failed', description: emailResult.error, variant: 'destructive' });
        }
        
        router.push('/dashboard');
    } catch (err: any) {
        if (err instanceof FirebaseError && err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: requestsCollectionRef.path,
                operation: 'create',
                requestResourceData: requestData,
            });
            errorEmitter.emit('permission-error', permissionError);
            // Show a generic message to the user
            toast({
                title: 'Permission Denied',
                description: 'You do not have permission to create a certificate request.',
                variant: 'destructive',
            });
        } else {
            console.error('Error submitting request:', err);
            toast({
                title: 'Submission Failed',
                description: err.message || 'An unexpected error occurred.',
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
      />
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
                          {teams?.map(team => <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>)}
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
                          {projects?.map(project => <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>)}
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
              
              <div className="space-y-4 rounded-lg border bg-secondary/50 p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Smart QA Assignment</h3>
                        <p className="text-sm text-muted-foreground">Let AI suggest the best QA Tester for this request.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={handleSuggestQATester} disabled={isSuggesting}>
                          {isSuggesting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <Lightbulb className="mr-2 h-4 w-4" />
                          )}
                          Suggest QA Tester
                      </Button>
                  </div>
                  {isSuggesting &&
                    <div className="flex items-center justify-center rounded-md border border-dashed p-4">
                        <p className="text-sm text-muted-foreground">Analyzing request details...</p>
                    </div>
                  }
                  {suggestion &&
                     <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Suggestion: {suggestion.suggestedQATester}</AlertTitle>
                        <AlertDescription>
                          <strong>Reason:</strong> {suggestion.reason}
                        </AlertDescription>
                    </Alert>
                  }
              </div>

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
