'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { migrateTypesToFirestore } from '@/lib/migrate-types';
import { useCollection } from '@/hooks/use-collection';
import type { InfractionType, BonusType } from '@/lib/types';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';

function MigrateTypesPageContent() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; message?: string } | null>(null);

  // Check if types already exist
  const { data: infractionTypes, loading: infractionLoading } = useCollection<InfractionType>('infractionTypes');
  const { data: bonusTypes, loading: bonusLoading } = useCollection<BonusType>('bonusTypes');

  const hasInfractionTypes = infractionTypes && infractionTypes.length > 0;
  const hasBonusTypes = bonusTypes && bonusTypes.length > 0;
  const alreadyMigrated = hasInfractionTypes || hasBonusTypes;

  const handleMigration = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const migrationResult = await migrateTypesToFirestore();
      
      if (migrationResult.success) {
        const message = migrationResult.message || 'Migration completed successfully!';
        setResult({ success: true, message });
        toast({
          title: 'Migration Successful',
          description: message,
        });
        // Refresh the page after a moment to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({ success: false, message: migrationResult.error || 'Migration failed' });
        toast({
          title: 'Migration Failed',
          description: migrationResult.error || 'An error occurred during migration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setResult({ success: false, message: errorMessage });
      toast({
        title: 'Migration Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Migrate Type Data"
        description="Migrate infraction and bonus types from constants to Firestore."
      />

      <Card>
        <CardHeader>
          <CardTitle>Type Migration</CardTitle>
          <CardDescription>
            This utility will migrate the existing infraction and bonus types from the codebase constants
            to Firestore collections. This is a one-time operation that should be run after deploying
            the new type management system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Check */}
          <div className="space-y-2">
            <h3 className="font-semibold">Current Status</h3>
            <div className="space-y-2">
              {infractionLoading || bonusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking existing types...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {hasInfractionTypes ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Infraction Types: {infractionTypes?.length || 0} types found in Firestore
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Infraction Types: Not found in Firestore</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasBonusTypes ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Bonus Types: {bonusTypes?.length || 0} types found in Firestore
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Bonus Types: Not found in Firestore</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Migration Result */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          {/* Already Migrated Warning */}
          {alreadyMigrated && !result && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Types Already Exist</AlertTitle>
              <AlertDescription>
                Some types already exist in Firestore. The migration will only add types that don't already exist.
                This is safe to run multiple times.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleMigration}
              disabled={isRunning || infractionLoading || bonusLoading}
              className="w-full sm:w-auto"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                'Run Migration'
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">What This Does</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Reads infraction types from <code className="bg-background px-1 rounded">src/lib/constants.ts</code></li>
              <li>Reads bonus types from <code className="bg-background px-1 rounded">src/lib/constants.ts</code></li>
              <li>Creates Firestore documents in <code className="bg-background px-1 rounded">infractionTypes</code> collection</li>
              <li>Creates Firestore documents in <code className="bg-background px-1 rounded">bonusTypes</code> collection</li>
              <li>Only adds types that don't already exist (safe to run multiple times)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function MigrateTypesPage() {
  return (
    <ProtectedRoute requiredPermission={ALL_PERMISSIONS.INFRACTIONS.MANAGE}>
      <MigrateTypesPageContent />
    </ProtectedRoute>
  );
}

