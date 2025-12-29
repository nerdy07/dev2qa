'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Requisition, RequisitionItem } from '@/lib/types';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateShortId } from '@/lib/id-generator';

const itemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required'),
  estimatedUnitPrice: z.number().optional(),
  estimatedTotal: z.number().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  supplier: z.string().optional(),
  specifications: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  department: z.string().optional(),
  requisitionType: z.enum(['money', 'items', 'both']).default('items'),
  directAmount: z.number().min(0.01, 'Amount must be greater than 0').optional(),
  items: z.array(itemSchema).optional(),
  currency: z.enum(['NGN', 'USD', 'EUR']).default('NGN'),
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  priority: z.enum(['normal', 'urgent', 'critical']).default('normal'),
  justification: z.string().min(10, 'Justification must be at least 10 characters'),
  requiredByDate: z.date().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
}).refine((data) => {
  // Must have either items OR direct amount OR both
  const hasItems = data.items && data.items.length > 0;
  const hasDirectAmount = data.directAmount && data.directAmount > 0;
  
  if (data.requisitionType === 'money') {
    return hasDirectAmount || false;
  } else if (data.requisitionType === 'items') {
    return hasItems || false;
  } else { // both
    return hasItems || hasDirectAmount || false;
  }
}, {
  message: 'You must provide either items or a direct amount (or both)',
  path: ['requisitionType'],
}).refine((data) => {
  // If there's a direct amount, account number and bank name should be provided
  const hasDirectAmount = data.directAmount && data.directAmount > 0;
  if (hasDirectAmount) {
    const hasAccountNumber = data.accountNumber && data.accountNumber.trim().length > 0;
    const hasBankName = data.bankName && data.bankName.trim().length > 0;
    return hasAccountNumber && hasBankName;
  }
  return true;
}, {
  message: 'Bank name and account number are required when requesting money',
  path: ['accountNumber'],
});

interface RequisitionFormProps {
  onSuccess: () => void;
  initialData?: Partial<Requisition>;
}

export function RequisitionForm({ onSuccess, initialData }: RequisitionFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      department: initialData?.department || currentUser?.teamId || '',
      requisitionType: initialData?.totalEstimatedAmount && (!initialData?.items || initialData.items.length === 0)
        ? 'money'
        : initialData?.items && initialData.items.length > 0 && !initialData?.totalEstimatedAmount
        ? 'items'
        : initialData?.items && initialData.items.length > 0 && initialData?.totalEstimatedAmount
        ? 'both'
        : 'items',
      directAmount: initialData?.totalEstimatedAmount && (!initialData?.items || initialData.items.length === 0)
        ? initialData.totalEstimatedAmount
        : undefined,
      items: initialData?.items && initialData.items.length > 0 
        ? initialData.items.map(item => ({
            ...item,
            estimatedUnitPrice: item.estimatedUnitPrice || undefined,
            estimatedTotal: item.estimatedTotal || undefined,
          }))
        : undefined,
      currency: initialData?.currency || 'NGN',
      urgency: initialData?.urgency || 'medium',
      priority: initialData?.priority || 'normal',
      justification: initialData?.justification || '',
      requiredByDate: initialData?.requiredByDate?.toDate?.() || undefined,
      accountNumber: initialData?.accountNumber || '',
      bankName: initialData?.bankName || '',
    },
  });

  const requisitionType = form.watch('requisitionType');

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchDirectAmount = form.watch('directAmount');

  // Calculate total estimated amount
  const totalEstimatedAmount = React.useMemo(() => {
    let itemsTotal = 0;
    if (watchItems && watchItems.length > 0) {
      itemsTotal = watchItems.reduce((sum, item) => {
        if (item.estimatedTotal) return sum + item.estimatedTotal;
        if (item.estimatedUnitPrice && item.quantity) {
          return sum + (item.estimatedUnitPrice * item.quantity);
        }
        return sum;
      }, 0);
    }
    const directTotal = watchDirectAmount || 0;
    return itemsTotal + directTotal;
  }, [watchItems, watchDirectAmount]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser || !db) {
      toast({ title: 'Not Authenticated or Database not available', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const items: RequisitionItem[] = values.items && values.items.length > 0
        ? values.items.map((item, index) => ({
            id: `item-${index}-${Date.now()}`,
            itemName: item.itemName,
            description: item.description || undefined,
            quantity: item.quantity,
            unit: item.unit,
            estimatedUnitPrice: item.estimatedUnitPrice || undefined,
            estimatedTotal: item.estimatedTotal || (item.estimatedUnitPrice && item.quantity 
              ? item.estimatedUnitPrice * item.quantity 
              : undefined),
            category: item.category || undefined,
            priority: item.priority || undefined,
            supplier: item.supplier || undefined,
            specifications: item.specifications || undefined,
          }))
        : [];

      // Build requisition data, omitting undefined fields (Firestore doesn't accept undefined)
      const requisitionData: any = {
        title: values.title,
        currency: values.currency,
        urgency: values.urgency,
        priority: values.priority,
        justification: values.justification,
        status: 'draft', // Start as draft, user can submit later
        requesterId: currentUser.id,
        requesterName: currentUser.name,
        requesterEmail: currentUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only include optional fields if they have values
      if (values.description) {
        requisitionData.description = values.description;
      }
      if (values.department) {
        requisitionData.department = values.department;
        requisitionData.requesterDepartment = values.department;
      }
      if (items.length > 0) {
        requisitionData.items = items;
      }
      if (totalEstimatedAmount > 0) {
        requisitionData.totalEstimatedAmount = totalEstimatedAmount;
      }
      if (values.requiredByDate) {
        requisitionData.requiredByDate = (await import('firebase/firestore')).Timestamp.fromDate(values.requiredByDate) as any;
      }
      if (values.accountNumber && values.accountNumber.trim()) {
        requisitionData.accountNumber = values.accountNumber.trim();
      }
      if (values.bankName && values.bankName.trim()) {
        requisitionData.bankName = values.bankName.trim();
      }

      const shortId = generateShortId('requisition');
      await addDoc(collection(db, 'requisitions'), {
        ...requisitionData,
        shortId,
      });

      toast({
        title: 'Requisition Created',
        description: 'Your requisition has been saved as draft. You can submit it when ready.',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating requisition:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create requisition',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const addItem = () => {
    append({
      itemName: '',
      quantity: 1,
      unit: 'pieces',
      estimatedUnitPrice: undefined,
      estimatedTotal: undefined,
      description: undefined,
      category: undefined,
      priority: undefined,
      supplier: undefined,
      specifications: undefined,
    });
  };

  const calculateItemTotal = (index: number) => {
    const item = watchItems[index];
    if (item.estimatedTotal) return item.estimatedTotal;
    if (item.estimatedUnitPrice && item.quantity) {
      return item.estimatedUnitPrice * item.quantity;
    }
    return 0;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requisition Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Office Supplies for Q1 2024" {...field} />
                </FormControl>
                <FormDescription>
                  A brief title describing this requisition
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Engineering, Marketing" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional details about this requisition..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requisitionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requisition Type *</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                // Reset items or directAmount based on type
                if (value === 'money') {
                  // Clear all items using remove
                  const currentLength = fields.length;
                  for (let i = currentLength - 1; i >= 0; i--) {
                    remove(i);
                  }
                  form.setValue('items', undefined);
                } else if (value === 'items') {
                  form.setValue('directAmount', undefined);
                  // Ensure at least one item exists
                  if (fields.length === 0) {
                    append({ itemName: '', quantity: 1, unit: 'pieces' });
                  }
                } else { // both
                  // Ensure at least one item exists
                  if (fields.length === 0) {
                    append({ itemName: '', quantity: 1, unit: 'pieces' });
                  }
                }
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="money">Money Only</SelectItem>
                  <SelectItem value="items">Items Only</SelectItem>
                  <SelectItem value="both">Both Money and Items</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select whether you need money, items, or both
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {(requisitionType === 'money' || requisitionType === 'both') && (
          <>
            <FormField
              control={form.control}
              name="directAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({form.watch('currency')}) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {requisitionType === 'money' 
                      ? 'Enter the total amount you are requesting'
                      : 'Enter any additional amount beyond item costs'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Access Bank, GTBank, First Bank"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Name of your bank
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 0123456789"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your bank account number for payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        {(requisitionType === 'items' || requisitionType === 'both') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>Items *</FormLabel>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Item {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.itemName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Laptop, Printer Paper" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.category`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Software">Software</SelectItem>
                          <SelectItem value="Services">Services</SelectItem>
                          <SelectItem value="Furniture">Furniture</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`items.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about this item..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.unit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., pieces, boxes, kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.estimatedUnitPrice`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price ({form.watch('currency')})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <div className="w-full">
                    <FormLabel>Estimated Total</FormLabel>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                      <span className="text-sm font-medium">
                        {form.watch('currency')} {calculateItemTotal(index).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.supplier`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.priority`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`items.${index}.specifications`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specifications</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Technical specifications or requirements..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

            {(fields.length === 0 || !fields) && (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground">No items added yet</p>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            )}
          </div>
        )}

        {totalEstimatedAmount > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Estimated Amount:</span>
              <span className="text-lg font-bold">
                {form.watch('currency')} {totalEstimatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Urgency *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="requiredByDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Required By Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 pr-3 text-left font-normal justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <span className="flex-1 text-left">
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          "Pick a date (optional)"
                        )}
                      </span>
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When do you need these items by?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="justification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Justification *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain why these items are needed and how they will be used..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a clear justification for this requisition (minimum 10 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

