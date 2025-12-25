'use client';

import React, { useMemo } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, TriangleAlert, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TransactionForm } from '@/components/admin/transaction-form';
import { format, startOfMonth, endOfMonth, isLastDayOfMonth, isSameMonth, isSameYear } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { useAuth } from '@/providers/auth-provider';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ExpensesPage() {
  const { data: transactions, loading, error } = useCollection<Transaction>('transactions');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [filterType, setFilterType] = React.useState<'month' | 'all'>('month');
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessingSalaries, setIsProcessingSalaries] = React.useState(false);

  // Filter transactions by selected month or all time
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    if (filterType === 'all') {
      return transactions;
    }
    
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    return transactions.filter(transaction => {
      if (!transaction.date) return false;
      const date = (transaction.date as any)?.toDate?.();
      if (!date) return false;
      return date >= monthStart && date <= monthEnd;
    });
  }, [transactions, selectedDate, filterType]);

  // Calculate balance and totals
  const balanceData = useMemo(() => {
    if (!transactions) {
      return {
        totalBalance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      };
    }

    const allIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        // Convert to NGN for calculation (simplified - in production, use real exchange rates)
        const rate = t.currency === 'USD' ? 1500 : t.currency === 'EUR' ? 1600 : 1;
        return sum + (t.amount * rate);
      }, 0);

    const allExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const rate = t.currency === 'USD' ? 1500 : t.currency === 'EUR' ? 1600 : 1;
        return sum + (t.amount * rate);
      }, 0);

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    const monthlyTransactions = transactions.filter(t => {
      if (!t.date) return false;
      const date = (t.date as any)?.toDate?.();
      if (!date) return false;
      return date >= monthStart && date <= monthEnd;
    });

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const rate = t.currency === 'USD' ? 1500 : t.currency === 'EUR' ? 1600 : 1;
        return sum + (t.amount * rate);
      }, 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const rate = t.currency === 'USD' ? 1500 : t.currency === 'EUR' ? 1600 : 1;
        return sum + (t.amount * rate);
      }, 0);

    return {
      totalBalance: allIncome - allExpenses,
      totalIncome: allIncome,
      totalExpenses: allExpenses,
      monthlyIncome: monthlyIncome,
      monthlyExpenses: monthlyExpenses,
    };
  }, [transactions, selectedDate]);

  const handleMonthChange = (month: string) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(parseInt(month));
    setSelectedDate(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(parseInt(year));
    setSelectedDate(newDate);
  };

  const handleDelete = async (transactionId: string) => {
    if (!db || !user) return;
    
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
      toast({
        title: 'Transaction Deleted',
        description: 'The transaction has been successfully deleted.',
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const { hasPermission } = useAuth();
  
  const handleProcessMonthlySalaries = async () => {
    if (!user || !hasPermission(ALL_PERMISSIONS.PAYROLL.READ) || !auth) return;
    
    setIsProcessingSalaries(true);
    try {
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to process salaries.',
          variant: 'destructive',
        });
        setIsProcessingSalaries(false);
        return;
      }

      const response = await fetch('/api/process-monthly-salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const totals = data.calculatedTotals || {};
        const breakdown = data.breakdown || [];
        const summaryText = `Total Net: ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(data.totalAmount)} 
          ${totals.totalBase ? `(Base: ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totals.totalBase)})` : ''}
          ${totals.totalDeductions ? `- Deductions: ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totals.totalDeductions)}` : ''}
          ${totals.totalBonuses ? `+ Bonuses: ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totals.totalBonuses)}` : ''}
          for ${data.employeeCount} employees.`;
        
        toast({
          title: 'Salaries Processed',
          description: summaryText,
          duration: 8000,
        });
        
      } else {
        toast({
          title: 'Processing Failed',
          description: data.message || 'Failed to process monthly salaries.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error processing salaries:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'An error occurred while processing salaries.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingSalaries(false);
    }
  };

  // Check if salaries have been processed for the current month
  const salariesProcessed = useMemo(() => {
    if (!transactions) return false;
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    return transactions.some(t => {
      if (t.category === 'Salary & Wages' && t.type === 'expense') {
        const date = (t.date as any)?.toDate?.();
        if (date) {
          return date >= monthStart && date <= monthEnd;
        }
      }
      return false;
    });
  }, [transactions, selectedDate]);

  const isLastDay = isLastDayOfMonth(new Date());
  const showSalaryReminder = isLastDay && !salariesProcessed && filterType === 'month';

  const formatAmount = (amount: number, currency: 'NGN' | 'USD' | 'EUR') => {
    if (currency === 'NGN') {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2024, i, 1), 'MMMM'),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const renderContent = () => {
    if (loading) {
      return (
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={7}>
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Transactions</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    if (filteredTransactions.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              {filterType === 'all' 
                ? 'No transactions found.' 
                : `No transactions found for ${format(selectedDate, 'MMMM yyyy')}.`}
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {[...filteredTransactions]
          .sort((a, b) => {
            const dateA = (a.date as any)?.toDate?.()?.getTime() || 0;
            const dateB = (b.date as any)?.toDate?.()?.getTime() || 0;
            return dateB - dateA;
          })
          .map((transaction) => {
            const transactionDate = (transaction.date as any)?.toDate?.() || null;
            return (
              <TableRow key={transaction.id}>
                <TableCell>
                  <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                    {transaction.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{transaction.category}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  {transaction.projectName ? (
                    <Badge variant="outline" className="text-xs">
                      {transaction.projectName}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className={transaction.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatAmount(transaction.amount, transaction.currency)}
                </TableCell>
                <TableCell>
                  {transactionDate ? format(transactionDate, 'PPP') : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-sm">{transaction.createdByName}</span>
                    {hasPermission(ALL_PERMISSIONS.EXPENSES.DELETE) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0">
                            <span className="sr-only">Delete</span>
                            ×
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] sm:w-full">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this transaction from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(transaction.id)}
                              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    );
  };

  return (
    <ProtectedRoute 
      permission={ALL_PERMISSIONS.EXPENSES.READ}
    >
      <PageHeader
        title="Expenses & Income Management"
        description="Track company expenses, income, and financial balance."
      >
        <div className="flex flex-col sm:flex-row gap-2">
          {hasPermission(ALL_PERMISSIONS.PAYROLL.READ) && (
            <Button
              onClick={handleProcessMonthlySalaries}
              disabled={isProcessingSalaries || salariesProcessed}
              variant={salariesProcessed ? "outline" : "default"}
            >
              {isProcessingSalaries 
                ? 'Processing...' 
                : salariesProcessed 
                  ? 'Salaries Processed' 
                  : 'Process Monthly Salaries'}
            </Button>
          )}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Transaction</DialogTitle>
              </DialogHeader>
              <TransactionForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {showSalaryReminder && hasPermission(ALL_PERMISSIONS.PAYROLL.READ) && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950">
          <Calendar className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Monthly Salaries Reminder</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            It's the last day of the month. Don't forget to process monthly salaries! Click the "Process Monthly Salaries" button above.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Balance Overview Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-6">
        <Card className="sm:col-span-2 lg:col-span-1 xl:col-span-2 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">Company Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className={`text-2xl sm:text-3xl font-bold break-words overflow-wrap-anywhere ${balanceData.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(Math.abs(balanceData.totalBalance), 'NGN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {balanceData.totalBalance >= 0 ? 'Positive' : 'Negative'} balance
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">Filter</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="space-y-2 w-full">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as 'month' | 'all')}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              {filterType === 'month' && (
                <div className="flex flex-col gap-2 w-full">
                  <Select value={selectedDate.getMonth().toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedDate.getFullYear().toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">{filterType === 'all' ? 'Total Income' : 'Monthly Income'}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600 break-words overflow-wrap-anywhere">
              {formatAmount(filterType === 'all' ? balanceData.totalIncome : balanceData.monthlyIncome, 'NGN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filterType === 'all' ? 'all time' : 'this month'}</p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">{filterType === 'all' ? 'Total Expenses' : 'Monthly Expenses'}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 shrink-0 ml-2" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600 break-words overflow-wrap-anywhere">
              {formatAmount(filterType === 'all' ? balanceData.totalExpenses : balanceData.monthlyExpenses, 'NGN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filterType === 'all' ? 'all time' : 'this month'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[80px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Category</TableHead>
                <TableHead className="min-w-[150px]">Description</TableHead>
                <TableHead className="min-w-[120px]">Project</TableHead>
                <TableHead className="min-w-[100px]">Amount</TableHead>
                <TableHead className="min-w-[120px]">Date</TableHead>
                <TableHead className="min-w-[140px]">Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </div>
      </Card>
    </ProtectedRoute>
  );
}

