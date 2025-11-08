
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { BackButton } from '@/components/common/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/auth-provider';
import type { User } from '@/lib/types';
import { notifyOnNewDesignRequest } from '@/app/requests/actions';

const formSchema = z.object({
  designTitle: z.string().min(5, 'Title must be at least 5 characters.'),
  figmaUrl: z.string().url('Please enter a valid Figma URL.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
});

export default function NewDesignRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      designTitle: '',
      figmaUrl: '',
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) {
        toast({ title: "Not Authenticated or DB not available", description: "You must be logged in to create a request.", variant: "destructive"});
        return;
    }

    try {
        const requestData = {
            ...values,
            designerId: user.id,
            designerName: user.name,
            designerEmail: user.email,
            status: 'pending' as const,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'designRequests'), requestData);

        toast({
            title: 'Design Request Submitted!',
            description: 'Your design has been sent for management review.',
        });

        // Notify Admins
        const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminSnapshot = await getDocs(adminQuery);
        const adminEmails = adminSnapshot.docs.map(doc => (doc.data() as User).email);
        
        const emailResult = await notifyOnNewDesignRequest({ 
            adminEmails,
            designTitle: values.designTitle,
            designerName: user.name,
        });

        if (!emailResult.success) {
            toast({ title: 'Admin Notification Failed', description: emailResult.error, variant: 'destructive' });
        }
        
        router.push('/dashboard');
    } catch (error) {
        console.error('Error submitting design request:', error);
        toast({
            title: 'Submission Failed',
            description: (error as Error).message || 'An unexpected error occurred.',
            variant: 'destructive',
        });
    }
  }

  return (
    <>
      <PageHeader
        title="New Design Request"
        description="Fill out the form below to submit a design for approval."
      >
        <BackButton />
      </PageHeader>
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="designTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Design Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., New Onboarding Flow for Mobile App" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="figmaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Figma URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.figma.com/file/..." {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Description/Context</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain the design goals, what problems it solves, and any other relevant context for the reviewer."
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
                    {form.formState.isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
