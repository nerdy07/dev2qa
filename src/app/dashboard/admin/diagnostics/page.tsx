'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { checkMyRole } from '@/app/requests/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Fingerprint, Loader2, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';

type CheckResult = {
  success: boolean;
  role?: string;
  error?: string;
};

export default function DiagnosticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const handleCheckRole = async () => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "Cannot perform check because user is not logged in.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult(null);
    const checkResult = await checkMyRole(user.id);
    setResult(checkResult);
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        title="Admin Diagnostics"
        description="Tools to help diagnose and troubleshoot application issues."
      />
      <Card>
        <CardHeader>
          <CardTitle>Permission & Role Check</CardTitle>
          <CardDescription>
            This tool will ask the server to check your user document in Firestore and return the role it finds.
            It's a direct way to test if your security rules are allowing access and if your role is set correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCheckRole} disabled={loading || !user}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="mr-2 h-4 w-4" />
            )}
            Check My Role on Server
          </Button>

          {result && (
            <div className="mt-4">
              {result.success ? (
                <Alert>
                  <AlertTitle className="text-primary">Success!</AlertTitle>
                  <AlertDescription>
                    The server has successfully read your user document. Your role is: <strong className="font-bold text-lg">{result.role}</strong>.
                    If this says 'admin' and your actions are still failing, there may be an issue with the security rules for the specific action you're trying to perform.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>Check Failed</AlertTitle>
                  <AlertDescription>
                    <p>The server could not verify your role. Here is the error message:</p>
                    <p className="font-mono bg-destructive/20 p-2 rounded-md mt-2">{result.error}</p>
                    <p className="mt-2">This most likely means there is a "Missing or insufficient permissions" error. Check that your security rules for the `/users` collection allow you to read your own document.</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
