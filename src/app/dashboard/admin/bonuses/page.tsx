
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
import type { Bonus } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BonusForm } from '@/components/admin/bonus-form';
import { format } from 'date-fns';

export default function BonusesPage() {
  const { data: bonuses, loading, error } = useCollection<Bonus>('bonuses');
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const formatAmount = (amount: number, currency: 'NGN' | 'PERCENTAGE') => {
    if (currency === 'NGN') {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    }
    return `${amount}%`;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                <AlertTitle>Error Loading Bonuses</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {bonuses?.map((bonus) => (
          <TableRow key={bonus.id}>
            <TableCell className="font-medium">{bonus.userName}</TableCell>
            <TableCell>{bonus.bonusType}</TableCell>
            <TableCell className="text-primary font-semibold">{formatAmount(bonus.amount, bonus.currency)}</TableCell>
            <TableCell>{bonus.dateIssued ? format(bonus.dateIssued.toDate(), 'PPP') : 'Processing...'}</TableCell>
            <TableCell>{bonus.issuedByName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };

  return (
    <>
      <PageHeader
        title="Bonus Management"
        description="Issue and track employee bonuses and rewards."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Issue Bonus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Bonus</DialogTitle>
            </DialogHeader>
            <BonusForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Bonus Type</TableHead>
              <TableHead>Amount</TableHead>
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
