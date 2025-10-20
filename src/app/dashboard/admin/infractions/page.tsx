
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, TriangleAlert } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import type { Infraction } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfractionForm } from '@/components/admin/infraction-form';
import { format } from 'date-fns';

export default function InfractionsPage() {
  const { data: infractions, loading, error } = useCollection<Infraction>('infractions');
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5}>
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Infractions</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {infractions?.map((infraction) => (
          <TableRow key={infraction.id}>
            <TableCell className="font-medium">{infraction.userName}</TableCell>
            <TableCell>{infraction.infractionType}</TableCell>
            <TableCell className="text-destructive font-semibold">{infraction.deductionPercentage > 0 ? `${infraction.deductionPercentage}%` : 'N/A'}</TableCell>
            <TableCell>{infraction.dateIssued ? format(infraction.dateIssued.toDate(), 'PPP') : 'Processing...'}</TableCell>
            <TableCell>{infraction.issuedByName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };

  return (
    <>
      <PageHeader
        title="Infraction Management"
        description="Issue and track employee infractions."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Issue Infraction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Infraction</DialogTitle>
            </DialogHeader>
            <InfractionForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Infraction Type</TableHead>
              <TableHead>Deduction</TableHead>
              <TableHead>Date Issued</TableHead>
              <TableHead>Issued By</TableHead>
            </TableRow>
          </TableHeader>
          {renderContent()}
        </Table>
      </Card>
    </>
  );
}
