'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { addDoc, collection, Timestamp, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState, useMemo } from 'react';
import { uploadFile } from '@/lib/storage';
import { useCollection } from '@/hooks/use-collection';
import type { Project } from '@/lib/types';

const EXPENSE_CATEGORIES = [
  'Salary & Wages',
  'Office Supplies',
  'Equipment',
  'Software & Subscriptions',
  'Utilities',
  'Rent',
  'Marketing & Advertising',
  'Travel & Transportation',
  'Training & Education',
  'Legal & Professional Services',
  'Maintenance & Repairs',
  'Insurance',
  'Food & Catering',
  'Other',
];

const INCOME_CATEGORIES = [
  'Client Payments',
  'Service Revenue',
  'Investment Income',
  'Grants & Funding',
  'Interest Income',
  'Other Income',
];

const formSchema = z.object({
  type: z.enum(['expense', 'income'], { required_error: 'Please select transaction type.' }),
  category: z.string({ required_error: 'Please select a category.' }),
  description: z.string().min(5, 'Description must be at least 5 characters.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  currency: z.enum(['NGN', 'USD', 'EUR'], { required_error: 'Please select currency.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  notes: z.string().optional(),
  projectId: z.string().optional(),
}).refine((data) => {
  // If category is "Client Payments", projectId is required
  if (data.type === 'income' && data.category === 'Client Payments') {
    return !!data.projectId;
  }
  return true;
}, {
  message: 'Please select a project for client payments.',
  path: ['projectId'],
});

interface TransactionFormProps {
  onSuccess: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Fetch projects for project association
  const projectsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'projects'));
  }, []);
  const { data: projects } = useCollection<Project>('projects', projectsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      currency: 'NGN',
      date: new Date(),
      description: '',
      notes: '',
      projectId: '',
    }
  });

  const transactionType = form.watch('type');
  const category = form.watch('category');
  const categories = transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const showProjectSelector = transactionType === 'income' && category === 'Client Payments';

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload an image or PDF file.',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File must be less than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      setReceiptFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser || !db) {
      toast({ title: 'Not Authenticated or Database not available', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl: string | undefined;

      // Upload receipt if provided
      if (receiptFile) {
        const receiptPath = `transactions/${Date.now()}_${receiptFile.name}`;
        receiptUrl = await uploadFile(receiptFile, receiptPath);
      }

      // Convert date to Firestore Timestamp
      const transactionDate = new Date(values.date);
      transactionDate.setHours(0, 0, 0, 0);

      // Get project name if projectId is provided
      const projectName = values.projectId 
        ? projects?.find(p => p.id === values.projectId)?.name 
        : undefined;

      const transactionData: any = {
        type: values.type,
        category: values.category,
        description: values.description,
        amount: values.amount,
        currency: values.currency,
        date: Timestamp.fromDate(transactionDate),
        createdById: currentUser.id,
        createdByName: currentUser.name,
      };

      // Only include optional fields if they have values (Firebase doesn't accept undefined)
      if (receiptUrl) {
        transactionData.receiptUrl = receiptUrl;
      }
      
      if (values.notes && values.notes.trim()) {
        transactionData.notes = values.notes;
      }
      
      if (values.projectId) {
        transactionData.projectId = values.projectId;
      }
      
      if (projectName) {
        transactionData.projectName = projectName;
      }

      await addDoc(collection(db, 'transactions'), transactionData);

      toast({
        title: transactionType === 'expense' ? 'Expense Recorded' : 'Income Recorded',
        description: `The ${transactionType} has been successfully recorded.`,
      });

      form.reset({
        type: 'expense',
        amount: 0,
        currency: 'NGN',
        date: new Date(),
        description: '',
        notes: '',
        projectId: '',
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      onSuccess();
    } catch (err) {
      const error = err as Error;
      console.error('Error recording transaction:', error);
      toast({ title: 'Operation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  // Clear projectId when type changes
                  form.setValue('projectId', '');
                  // Also clear category to trigger re-validation
                  if (value === 'expense') {
                    form.setValue('category', '');
                  }
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  // Clear projectId when category changes away from Client Payments
                  if (value !== 'Client Payments') {
                    form.setValue('projectId', '');
                  }
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${transactionType} category`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {showProjectSelector && (
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Associated Project</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects && projects.length > 0 ? (
                      projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>Select the project this client payment is associated with.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the transaction" {...field} />
              </FormControl>
              <FormDescription>Provide a clear description of what this transaction is for.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => {
            const dateValue = field.value instanceof Date 
              ? field.value.toISOString().split('T')[0] 
              : field.value 
                ? new Date(field.value).toISOString().split('T')[0] 
                : '';
            
            return (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={dateValue}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : new Date();
                      field.onChange(date);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information about this transaction"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Receipt/Document (Optional)</FormLabel>
          {receiptPreview ? (
            <div className="relative">
              <img src={receiptPreview} alt="Receipt preview" className="max-h-48 rounded-md border" />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemoveReceipt}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptChange}
            />
          )}
          <FormDescription>Upload a receipt or document for this transaction (Image or PDF, max 10MB)</FormDescription>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Recording...' : transactionType === 'expense' ? 'Record Expense' : 'Record Income'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

