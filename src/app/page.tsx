'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { TriangleAlert, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function LoginPage() {
  const { login, sendPasswordReset, user, loading } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      // Use window.location for a hard redirect to ensure it works even if router.push fails
      if (window.location.pathname !== '/dashboard') {
        window.location.href = '/dashboard';
      }
    }
  }, [user, loading]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated (will redirect)
  if (user) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting login with email:', values.email);
      }
      await login(values.email, values.password);
      if (process.env.NODE_ENV === 'development') {
        console.log('Login successful, redirecting to dashboard...');
      }

      // Redirect immediately after successful login
      // Use window.location for a hard redirect to ensure it works in production
      window.location.href = '/dashboard';
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', err);
      }
      if (err.code === 'auth/user-disabled') {
        setError('This account has been deactivated. Please contact an administrator.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check and try again.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (err.message?.includes('Firebase not initialized')) {
        setError('Application configuration error. Please contact support.');
      } else {
        setError(err.message || err.code || 'An unexpected error occurred. Please try again.');
      }
    }
  }

  const handlePasswordReset = async () => {
    const emailToReset = resetEmail || form.getValues('email');

    if (!emailToReset) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToReset)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setIsResetting(true);
    try {
      await sendPasswordReset(emailToReset);
      toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${emailToReset}, a password reset link has been sent. Please check your inbox.`
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send password reset email. Please try again.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 dark:from-background dark:via-background dark:to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 font-semibold text-primary mb-8">
          <Image src="/logo.jpg" alt="Dev2QA Logo" width={32} height={32} priority />
          <span className="text-3xl">Dev2QA</span>
        </div>
        <Card className="w-full shadow-lg" id="login-form">
            <div>
              <CardHeader>
                <CardTitle className="text-2xl">Sign in to Dev2QA</CardTitle>
                <CardDescription>
                  Access your projects, QA queues, and company dashboards.
                </CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Login Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} autoComplete="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => {
                        const { type: _, ...fieldProps } = field;
                        return (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Password</FormLabel>
                              <Dialog open={isResetDialogOpen} onOpenChange={(open) => {
                                setIsResetDialogOpen(open);
                                if (open) {
                                  // Auto-fill with email from form if available
                                  const formEmail = form.getValues('email');
                                  if (formEmail) {
                                    setResetEmail(formEmail);
                                  }
                                } else {
                                  setResetEmail('');
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="link" type="button" className="p-0 h-auto text-sm font-medium text-primary hover:underline">
                                    Forgot Password?
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Reset Password</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <p className="text-sm text-muted-foreground">
                                      Enter your email address below and we'll send you a link to reset your password.
                                      The link will expire in 1 hour.
                                    </p>
                                    <div className="space-y-2">
                                      <Label htmlFor="reset-email">Email Address</Label>
                                      <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handlePasswordReset();
                                          }
                                        }}
                                        disabled={isResetting}
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button type="button" variant="outline" disabled={isResetting}>
                                        Cancel
                                      </Button>
                                    </DialogClose>
                                    <Button
                                      type="button"
                                      onClick={handlePasswordReset}
                                      disabled={isResetting || !resetEmail}
                                    >
                                      {isResetting ? 'Sending...' : 'Send Reset Link'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...fieldProps}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  autoComplete="current-password"
                                  className="pr-10"
                                  value={field.value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowPassword((prev) => !prev);
                                  }}
                                  onMouseDown={(e) => {
                                    // Prevent form submission when clicking the button
                                    e.preventDefault();
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none z-10 cursor-pointer"
                                  tabIndex={-1}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </CardContent>
                  <CardFooter className="flex-col items-center gap-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </div>
          </Card>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Need access?{' '}
              <Link href="/request-access" className="font-medium text-primary underline-offset-4 hover:underline">
                Request access
              </Link>
            </p>
          </div>
      </div>
    </main>
  );
}
