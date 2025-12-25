'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import type { BonusType } from '@/lib/types';
import { BonusTypeForm } from '@/components/admin/bonus-type-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collection as firestoreCollection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

export default function BonusTypesPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<BonusType | undefined>();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [typeToDelete, setTypeToDelete] = React.useState<BonusType | undefined>();

  const { data: types, loading, error } = useCollection<BonusType>('bonusTypes');

  const handleEdit = (type: BonusType) => {
    setSelectedType(type);
    setIsFormOpen(true);
  };

  const handleDelete = (type: BonusType) => {
    setTypeToDelete(type);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!typeToDelete || !db) return;
    
    try {
      await deleteDoc(doc(db, 'bonusTypes', typeToDelete.id));
      toast({
        title: 'Bonus Type Deleted',
        description: `The bonus type "${typeToDelete.name}" has been deleted.`,
      });
      setIsAlertOpen(false);
      setTypeToDelete(undefined);
    } catch (e) {
      const error = e as Error;
      console.error("Error deleting bonus type: ", error);
      toast({
        title: 'Error Deleting Bonus Type',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setIsFormOpen(false);
    setSelectedType(undefined);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title="Bonus Types"
        description="Manage bonus types that can be awarded to employees."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedType(undefined)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Bonus Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedType ? 'Edit Bonus Type' : 'Add Bonus Type'}</DialogTitle>
            </DialogHeader>
            <BonusTypeForm
              type={selectedType}
              onSuccess={handleSave}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedType(undefined);
              }}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bonus Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types && types.length > 0 ? (
                  types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        {type.currency === 'PERCENTAGE' ? (
                          <Badge variant="secondary">{type.amount}%</Badge>
                        ) : type.amount === 0 ? (
                          <Badge variant="outline">Variable</Badge>
                        ) : (
                          <Badge variant="secondary">₦{type.amount.toLocaleString()}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.currency === 'PERCENTAGE' ? 'default' : 'outline'}>
                          {type.currency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(type)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(type)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No bonus types found. Click "Add Bonus Type" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bonus Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.name}"? This action cannot be undone.
              Note: This will not affect existing bonuses that have already been recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

