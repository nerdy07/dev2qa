
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/hooks/use-collection';
import type { Bonus, Infraction, User } from '@/lib/types';
import { TriangleAlert, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { startOfMonth, endOfMonth, getYear, getMonth, format as formatDate } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

type PayrollEntry = {
  user: User;
  baseSalary: number;
  totalDeductions: number;
  totalBonuses: number;
  netSalary: number;
  infractions: Infraction[];
  bonuses: Bonus[];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

export default function PayrollPage() {
  const { data: users, loading: usersLoading, error: usersError } = useCollection<User>('users');
  const { data: infractions, loading: infractionsLoading, error: infractionsError } = useCollection<Infraction>('infractions');
  const { data: bonuses, loading: bonusesLoading, error: bonusesError } = useCollection<Bonus>('bonuses');
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  const loading = usersLoading || infractionsLoading || bonusesLoading;
  const error = usersError || infractionsError || bonusesError;

  const payrollData = useMemo<PayrollEntry[]>(() => {
    if (loading || error || !users || !infractions || !bonuses || !selectedDate) return [];

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    return users.map(user => {
      const baseSalary = user.baseSalary || 0;
      
      const userInfractions = infractions.filter(i => 
        i.userId === user.id &&
        i.dateIssued &&
        i.dateIssued.toDate() >= monthStart &&
        i.dateIssued.toDate() <= monthEnd
      );

      const userBonuses = bonuses.filter(b =>
        b.userId === user.id &&
        b.dateIssued &&
        b.dateIssued.toDate() >= monthStart &&
        b.dateIssued.toDate() <= monthEnd
      );

      const totalDeductions = userInfractions.reduce((acc, i) => {
        return acc + (baseSalary * (i.deductionPercentage / 100));
      }, 0);
      
      const totalBonuses = userBonuses.reduce((acc, b) => {
        if (b.currency === 'PERCENTAGE') {
          return acc + (baseSalary * (b.amount / 100));
        }
        return acc + b.amount;
      }, 0);

      const netSalary = baseSalary - totalDeductions + totalBonuses;

      return {
        user,
        baseSalary,
        totalDeductions,
        totalBonuses,
        netSalary,
        infractions: userInfractions,
        bonuses: userBonuses,
      };
    });
  }, [users, infractions, bonuses, selectedDate, loading, error]);

  const handleMonthChange = (month: string) => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setMonth(parseInt(month));
    setSelectedDate(newDate);
  }

  const handleYearChange = (year: string) => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setFullYear(parseInt(year));
    setSelectedDate(newDate);
  }

  const renderContent = () => {
    if (loading || !selectedDate) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }
    
    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {payrollData?.map((entry) => (
          <TableRow key={entry.user.id}>
            <TableCell className="font-medium">{entry.user.name}</TableCell>
            <TableCell>{formatCurrency(entry.baseSalary)}</TableCell>
            <TableCell className="text-destructive">{formatCurrency(entry.totalDeductions)}</TableCell>
            <TableCell className="text-primary">{formatCurrency(entry.totalBonuses)}</TableCell>
            <TableCell className="font-semibold">{formatCurrency(entry.netSalary)}</TableCell>
            <TableCell className="text-right">
              {selectedDate && <PayrollDetailsDialog entry={entry} selectedDate={selectedDate} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  }
  
  const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i.toString(), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

  return (
    <>
      <PageHeader
        title="Monthly Payroll"
        description="Calculate monthly salaries with deductions and bonuses."
      />
      <Card>
        <CardHeader>
            <CardTitle>Payroll Report</CardTitle>
            <CardDescription>Select a month and year to generate the report.</CardDescription>
            <div className="flex items-center gap-4 pt-4">
                {selectedDate ? (
                  <>
                    <Select value={getMonth(selectedDate).toString()} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={getYear(selectedDate).toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-10 w-[180px]" />
                    <Skeleton className="h-10 w-[120px]" />
                  </>
                )}
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Bonuses</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead className="text-right">Details</TableHead>
                </TableRow>
            </TableHeader>
            {renderContent()}
            </Table>
        </CardContent>
      </Card>
    </>
  );
}


function PayrollDetailsDialog({ entry, selectedDate }: { entry: PayrollEntry, selectedDate: Date }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payroll Details: {entry.user.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedDate, "MMMM yyyy")}</p>
                </DialogHeader>
                <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <h3 className="font-semibold mb-2">Bonuses ({formatCurrency(entry.totalBonuses)})</h3>
                        {entry.bonuses.length > 0 ? (
                            <ul className="space-y-2 text-sm">
                                {entry.bonuses.map(b => (
                                    <li key={b.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                                        <div>
                                            <p>{b.bonusType}</p>
                                            <p className="text-xs text-muted-foreground">{b.description}</p>
                                        </div>
                                        <span className="font-medium text-primary">{b.currency === 'NGN' ? formatCurrency(b.amount) : `${b.amount}%`}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">No bonuses this month.</p>}
                    </div>
                    <Separator />
                     <div>
                        <h3 className="font-semibold mb-2">Infractions ({formatCurrency(entry.totalDeductions)})</h3>
                        {entry.infractions.length > 0 ? (
                            <ul className="space-y-2 text-sm">
                                {entry.infractions.map(i => (
                                    <li key={i.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                                        <div>
                                            <p>{i.infractionType}</p>
                                            <p className="text-xs text-muted-foreground">{i.description}</p>
                                        </div>
                                        <span className="font-medium text-destructive">{i.deductionPercentage}%</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">No infractions this month.</p>}
                    </div>
                    <Separator />
                    <div className="text-lg font-bold flex justify-between p-2 bg-muted rounded-md">
                        <span>Net Salary:</span>
                        <span>{formatCurrency(entry.netSalary)}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
