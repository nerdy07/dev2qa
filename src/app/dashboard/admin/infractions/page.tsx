
'use client';

import React, { useMemo } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, TriangleAlert, Calendar } from 'lucide-react';
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
import type { Infraction } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfractionForm } from '@/components/admin/infraction-form';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationWrapper } from '@/components/common/pagination-wrapper';

export default function InfractionsPage() {
  const { data: infractions, loading, error } = useCollection<Infraction>('infractions');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [filterType, setFilterType] = React.useState<'month' | 'all'>('month');

  // Filter infractions by selected month or all time
  const filteredInfractions = useMemo(() => {
    if (!infractions) return [];
    
    if (filterType === 'all') {
      return infractions;
    }
    
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    
    return infractions.filter(infraction => {
      if (!infraction.dateIssued) return false;
      const date = infraction.dateIssued.toDate();
      return date >= monthStart && date <= monthEnd;
    });
  }, [infractions, selectedDate, filterType]);

  // Calculate totals (monthly or all time)
  const totals = useMemo(() => {
    const totalDeduction = filteredInfractions.reduce((sum, infraction) => {
      return sum + infraction.deductionPercentage;
    }, 0);
    
    return {
      count: filteredInfractions.length,
      totalDeductionPercentage: totalDeduction,
      averageDeduction: filteredInfractions.length > 0 
        ? totalDeduction / filteredInfractions.length 
        : 0,
    };
  }, [filteredInfractions]);

  // Pagination
  const {
    currentPage,
    totalPages,
    currentData: paginatedInfractions,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
  } = usePagination({
    data: filteredInfractions,
    itemsPerPage: 20,
    initialPage: 1,
  });

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

    if (filteredInfractions.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              {filterType === 'all' 
                ? 'No infractions found.' 
                : `No infractions found for ${format(selectedDate, 'MMMM yyyy')}.`}
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {paginatedInfractions.map((infraction) => (
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
        description="Issue and track employee infractions by month."
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
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filter</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as 'month' | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              {filterType === 'month' && (
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <Select value={selectedDate.getMonth().toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-full sm:w-[140px]">
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
                    <SelectTrigger className="w-full sm:w-[100px]">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
            <p className="text-xs text-muted-foreground">{filterType === 'all' ? 'total infractions' : 'infractions this month'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totals.totalDeductionPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">cumulative percentage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totals.averageDeduction.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">per infraction</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">User</TableHead>
                <TableHead className="min-w-[120px]">Infraction Type</TableHead>
                <TableHead className="min-w-[100px]">Deduction</TableHead>
                <TableHead className="min-w-[120px]">Date Issued</TableHead>
                <TableHead className="min-w-[120px]">Issued By</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </div>
        {filteredInfractions.length > 0 && (
          <div className="p-4 border-t">
            <PaginationWrapper
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredInfractions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </Card>
    </>
  );
}
