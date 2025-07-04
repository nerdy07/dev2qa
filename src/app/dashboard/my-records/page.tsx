'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/hooks/use-collection';
import type { Infraction, Bonus } from '@/lib/types';
import { TriangleAlert, Sparkles, ShieldX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/providers/auth-provider';
import { query, where, collection, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default function MyRecordsPage() {
    const { user } = useAuth();

    const infractionsQuery = React.useMemo(() => {
        if (!user?.id) return undefined;
        return query(
            collection(db!, 'infractions'), 
            where('userId', '==', user.id),
            orderBy('dateIssued', 'desc')
        );
    }, [user?.id]);
    
    const bonusesQuery = React.useMemo(() => {
        if (!user?.id) return undefined;
        return query(
            collection(db!, 'bonuses'), 
            where('userId', '==', user.id),
            orderBy('dateIssued', 'desc')
        );
    }, [user?.id]);

    const { data: infractions, loading: infractionsLoading, error: infractionsError } = useCollection<Infraction>('infractions', infractionsQuery);
    const { data: bonuses, loading: bonusesLoading, error: bonusesError } = useCollection<Bonus>('bonuses', bonusesQuery);

    const loading = infractionsLoading || bonusesLoading;
    const error = infractionsError || bonusesError;

    const formatAmount = (amount: number, currency: 'NGN' | 'PERCENTAGE') => {
        if (currency === 'NGN') {
          return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
        }
        return `${amount}%`;
      };

    if (error) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Error Loading Records</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    return (
        <>
            <PageHeader title="My Performance Records" description="A history of your infractions and bonuses." />
            <Tabs defaultValue="infractions" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:w-[400px] md:grid-cols-2">
                    <TabsTrigger value="infractions">
                        <ShieldX /> Infractions ({loading ? '...' : infractions?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="bonuses">
                        <Sparkles /> Bonuses ({loading ? '...' : bonuses?.length || 0})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="infractions" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Infraction History</CardTitle>
                            <CardDescription>This is a log of all recorded infractions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Deduction</TableHead>
                                        <TableHead>Issued By</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading && [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && infractions?.map(infraction => (
                                        <TableRow key={infraction.id}>
                                            <TableCell>{infraction.dateIssued ? format(infraction.dateIssued.toDate(), 'PPP') : 'Processing...'}</TableCell>
                                            <TableCell className="font-medium">{infraction.infractionType}</TableCell>
                                            <TableCell className="text-destructive font-semibold">{infraction.deductionPercentage > 0 ? `${infraction.deductionPercentage}%` : 'N/A'}</TableCell>
                                            <TableCell>{infraction.issuedByName}</TableCell>
                                            <TableCell className="text-muted-foreground">{infraction.description}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && infractions?.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No infractions found. Keep up the good work!</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="bonuses" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bonus & Reward History</CardTitle>
                            <CardDescription>This is a log of all your achievements and rewards.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                     <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Issued By</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading && [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && bonuses?.map(bonus => (
                                        <TableRow key={bonus.id}>
                                            <TableCell>{bonus.dateIssued ? format(bonus.dateIssued.toDate(), 'PPP') : 'Processing...'}</TableCell>
                                            <TableCell className="font-medium">{bonus.bonusType}</TableCell>
                                            <TableCell className="text-primary font-semibold">{formatAmount(bonus.amount, bonus.currency)}</TableCell>
                                            <TableCell>{bonus.issuedByName}</TableCell>
                                            <TableCell className="text-muted-foreground">{bonus.description}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && bonuses?.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No bonuses found yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}
