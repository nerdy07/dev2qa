'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Mail, Phone, Send } from 'lucide-react';

const accessFormSchema = z.object({
  fullName: z.string().min(2, { message: 'Please enter your full name.' }),
  workEmail: z
    .string()
    .email({ message: 'Enter a valid work email address.' })
    .min(5, { message: 'Email is required.' }),
  company: z.string().min(2, { message: 'Company name is required.' }),
  role: z.string().min(2, { message: 'Let us know your role.' }),
  message: z
    .string()
    .min(10, { message: 'Share a brief note about why you need access.' })
    .max(1000, { message: 'Message should be under 1000 characters.' }),
});

type AccessFormValues = z.infer<typeof accessFormSchema>;

export default function RequestAccessPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [didSubmit, setDidSubmit] = React.useState(false);

  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessFormSchema),
    defaultValues: {
      fullName: '',
      workEmail: '',
      company: '',
      role: '',
      message: '',
    },
  });

  const onSubmit = async (values: AccessFormValues) => {
    if (!db) {
      toast({
        title: 'Service unavailable',
        description: 'The database is not ready yet. Please try again soon.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'accessRequests'), {
        ...values,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setDidSubmit(true);
      toast({
        title: 'Request submitted',
        description: 'Our team will review your request and get back to you shortly.',
      });
      form.reset();
    } catch (error: any) {
      console.error('Failed to submit access request:', error);
      toast({
        title: 'Submission failed',
        description: error?.message || 'Please try again or email support@echobitstech.com.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-sm py-xl sm:px-md">
        <PageHeader
          title="Request Dev2QA access"
          description="Tell us a little about yourself so we can provision the right workspace and permissions."
        >
          <Button variant="ghost" asChild>
            <Link href="/">Back to sign in</Link>
          </Button>
        </PageHeader>

        <div className="grid gap-lg lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Request access</CardTitle>
              <CardDescription>
                We’ll review and reach out within one business day. Use your work email so we can authenticate
                your organisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-md"
                  noValidate
                >
                  <div className="grid gap-md md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Ada Lovelace" autoComplete="name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company or team</FormLabel>
                          <FormControl>
                            <Input placeholder="Your organisation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your role</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Project Manager, QA Lead" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How can we help?</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder="Share the team, project, and any deadline we should know about."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Send className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit request
                      </>
                    )}
                  </Button>
                  {didSubmit && (
                    <p className="text-sm text-muted-foreground">
                      Need to follow up? Email <a className="underline" href="mailto:support@echobitstech.com">support@echobitstech.com</a>.
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-md">
            <Card className="border-border/60 bg-surface shadow-soft">
              <CardHeader>
                <CardTitle>What happens next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-sm text-sm text-muted-foreground">
                <p>
                  Once we verify your details, we’ll provision an account with the right permissions for your team.
                  Approvers receive additional onboarding materials so they can start reviewing requests immediately.
                </p>
                <p>
                  Expect an email within one business day. If it’s urgent, drop us a note and include any deadlines.
                </p>
              </CardContent>
            </Card>

            <Card className="border-info/40 bg-info/5 shadow-soft">
              <CardHeader className="space-y-sm">
                <CardTitle className="flex items-center gap-xs text-info">
                  <Info className="h-4 w-4" />
                  Need a hand?
                </CardTitle>
                <CardDescription>
                  We’re happy to walk you through the platform or help migrate existing projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-xs text-sm text-muted-foreground">
                <div className="flex items-center gap-sm">
                  <Mail className="h-4 w-4 text-info" />
                  <a className="underline" href="mailto:support@echobitstech.com">
                    support@echobitstech.com
                  </a>
                </div>
                <div className="flex items-center gap-sm">
                  <Phone className="h-4 w-4 text-info" />
                  <span>+234 (0) 803 000 0000</span>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Already have an invite?</AlertTitle>
              <AlertDescription>
                Head back to the{' '}
                <Link className="font-semibold text-primary underline" href="/">
                  sign-in screen
                </Link>{' '}
                and use your work email to activate your account.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}






