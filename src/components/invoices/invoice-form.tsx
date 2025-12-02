'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, InvoiceLineItem, Client, Project, CompanySettings, BankAccount } from '@/lib/types';
import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateInvoiceTotals, generateInvoiceNumber } from '@/lib/invoice-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/invoice-utils';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or greater'),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discount: z.coerce.number().min(0).optional(),
});

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string().optional(),
  currency: z.string().min(3).max(3),
  exchangeRate: z.coerce.number().min(0.0001).optional(),
  bankAccountId: z.string().optional(),
  issueDate: z.date(),
  dueDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'semi-annually', 'annually', 'custom']).optional(),
  recurringInterval: z.coerce.number().min(1).optional(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded']).default('draft'),
});

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'ZAR'];

interface InvoiceFormProps {
  invoice?: Invoice;
  clients: Client[];
  projects?: Project[];
  companySettings?: CompanySettings;
  userId?: string;
  userName?: string;
  onSuccess: () => void;
}

export function InvoiceForm({ invoice, clients, projects = [], companySettings, userId, userName, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const isEditing = !!invoice;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: invoice?.clientId || '',
      projectId: invoice?.projectId || '',
      currency: invoice?.currency || 'USD',
      exchangeRate: invoice?.exchangeRate,
      bankAccountId: invoice?.bankAccountId || '',
      issueDate: invoice?.issueDate?.toDate() || new Date(),
      dueDate: invoice?.dueDate?.toDate() || (() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      })(),
      lineItems: invoice?.lineItems?.length ? invoice.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
      })) : [{
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        discount: 0,
      }],
      notes: invoice?.notes || companySettings?.invoiceNotes || '',
      terms: invoice?.terms || companySettings?.paymentTerms || '',
      isRecurring: invoice?.isRecurring || false,
      recurringFrequency: invoice?.recurringFrequency,
      recurringInterval: invoice?.recurringInterval || 1,
      status: invoice?.status || 'draft',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const selectedClient = form.watch('clientId');
  const lineItems = form.watch('lineItems');
  const currency = form.watch('currency');
  const bankAccountId = form.watch('bankAccountId');
  const client = clients.find(c => c.id === selectedClient);
  
  // Set default account if available and not editing
  React.useEffect(() => {
    if (!isEditing && companySettings?.bankAccounts && !bankAccountId) {
      const defaultAccount = companySettings.bankAccounts.find(acc => acc.isDefault);
      if (defaultAccount && currency && (defaultAccount.currency === currency || !defaultAccount.currency)) {
        form.setValue('bankAccountId', defaultAccount.id);
      }
    }
  }, [companySettings, currency, isEditing, bankAccountId, form]);

  // Filter accounts by currency
  const availableAccounts = React.useMemo(() => {
    if (!companySettings?.bankAccounts) return [];
    return companySettings.bankAccounts.filter(acc => 
      !currency || acc.currency === currency || !acc.currency
    );
  }, [companySettings, currency]);

  // Calculate totals whenever line items change
  const totals = useMemo(() => {
    const items = lineItems.map(item => ({
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      taxRate: item.taxRate || 0,
      discount: item.discount || 0,
    }));
    return calculateInvoiceTotals(items);
  }, [lineItems]);

  // Update client's default currency when client changes
  React.useEffect(() => {
    if (client && !isEditing) {
      form.setValue('currency', client.defaultCurrency);
    }
  }, [client, isEditing, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { addDoc, doc, setDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { useAuth } = await import('@/providers/auth-provider');
      
      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      if (!userId || !userName) {
        throw new Error('User information is required to create an invoice');
      }

      const selectedClientData = clients.find(c => c.id === values.clientId);
      if (!selectedClientData) {
        throw new Error('Selected client not found');
      }

      // Get selected bank account details
      let bankAccount: BankAccount | undefined;
      if (values.bankAccountId && companySettings?.bankAccounts) {
        bankAccount = companySettings.bankAccounts.find(acc => acc.id === values.bankAccountId);
      } else if (companySettings?.bankAccounts) {
        // Use default account if no account selected
        bankAccount = companySettings.bankAccounts.find(acc => acc.isDefault);
      }

      // Calculate line item totals - ensure all values are numbers
      const processedLineItems: InvoiceLineItem[] = values.lineItems.map(item => {
        // Coerce to numbers to handle string inputs from form
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const discount = Number(item.discount) || 0;
        
        const itemSubtotal = quantity * unitPrice;
        const itemSubtotalAfterDiscount = itemSubtotal - discount;
        const itemTax = taxRate ? (itemSubtotalAfterDiscount * taxRate) / 100 : 0;
        const itemTotal = itemSubtotalAfterDiscount + itemTax;

        // Build line item object, only including optional fields if they have values
        const lineItem: any = {
          description: item.description,
          quantity: quantity,
          unitPrice: unitPrice,
          total: Math.round(itemTotal * 100) / 100,
        };
        
        // Only add optional fields if they have values
        if (taxRate > 0) {
          lineItem.taxRate = taxRate;
        }
        if (discount > 0) {
          lineItem.discount = discount;
        }
        
        return lineItem;
      });

      // Recalculate totals from processed line items to ensure accuracy
      const recalculatedTotals = calculateInvoiceTotals(processedLineItems.map(item => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        discount: item.discount || 0,
      })));

      const selectedProject = values.projectId ? projects.find(p => p.id === values.projectId) : null;

      // Convert dates to Firestore Timestamps
      const { Timestamp } = await import('firebase/firestore');
      const issueDateTimestamp = Timestamp.fromDate(values.issueDate);
      const dueDateTimestamp = Timestamp.fromDate(values.dueDate);

      // Helper function to remove undefined values (recursive for nested objects and arrays)
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return undefined;
        }
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
        }
        if (typeof obj === 'object' && obj.constructor === Object) {
          const cleaned: any = {};
          Object.keys(obj).forEach(key => {
            const value = removeUndefined(obj[key]);
            if (value !== undefined) {
              cleaned[key] = value;
            }
          });
          return cleaned;
        }
        return obj;
      };

      const invoiceData = removeUndefined({
        clientId: values.clientId,
        clientName: selectedClientData.name,
        projectId: values.projectId || undefined,
        projectName: selectedProject?.name || undefined,
        lineItems: processedLineItems,
        subtotal: recalculatedTotals.subtotal,
        taxAmount: recalculatedTotals.taxAmount,
        discountAmount: recalculatedTotals.discountAmount,
        totalAmount: recalculatedTotals.totalAmount,
        currency: values.currency,
        exchangeRate: values.exchangeRate,
        bankAccountId: values.bankAccountId || bankAccount?.id || undefined,
        bankAccountName: bankAccount?.accountName || undefined,
        bankAccountNumber: bankAccount?.accountNumber || undefined,
        bankName: bankAccount?.bankName || undefined,
        issueDate: issueDateTimestamp,
        dueDate: dueDateTimestamp,
        notes: values.notes,
        terms: values.terms,
        isRecurring: values.isRecurring,
        recurringFrequency: values.recurringFrequency,
        recurringInterval: values.recurringInterval,
        status: values.status,
        paidAmount: invoice?.paidAmount || 0,
        outstandingAmount: recalculatedTotals.totalAmount - (invoice?.paidAmount || 0),
        payments: invoice?.payments || [],
        updatedAt: serverTimestamp(),
      });

      if (isEditing && invoice) {
        // Update existing invoice
        const invoiceRef = doc(db, 'invoices', invoice.id);
        await setDoc(invoiceRef, invoiceData, { merge: true });
        toast({
          title: 'Invoice updated',
          description: 'Invoice has been updated successfully.',
        });
      } else {
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();
        
        // Get user from auth - we'll need to handle this properly
        // For now, we'll require it to be passed or get from page
        const invoiceRef = collection(db, 'invoices');
        const newInvoiceData = removeUndefined({
          ...invoiceData,
          invoiceNumber,
          createdById: userId,
          createdByName: userName,
          createdAt: serverTimestamp(),
        });
        await addDoc(invoiceRef, newInvoiceData);
        toast({
          title: 'Invoice created',
          description: `Invoice ${invoiceNumber} has been created successfully.`,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save invoice. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.filter(c => c.status === 'active').map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.companyName && `(${client.companyName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project (Optional)</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                  value={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {client && `Client default: ${client.defaultCurrency}`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {availableAccounts.length > 0 && (
            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Account</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} {account.isDefault && '(Default)'} - {account.bankName} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Bank account details to display on invoice for payment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Date *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : new Date();
                      date.setHours(12, 0, 0, 0);
                      field.onChange(date);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : new Date();
                      date.setHours(12, 0, 0, 0);
                      field.onChange(date);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-4 md:grid-cols-12 border rounded-lg p-4">
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input placeholder="Item description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.unitPrice`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Unit Price *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.taxRate`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.discount`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Discount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-1 flex items-end">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: 0,
                discount: 0,
              })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal, currency)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-green-600">-{formatCurrency(totals.discountAmount, currency)}</span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">{formatCurrency(totals.taxAmount, currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(totals.totalAmount, currency)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Payment terms and conditions..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Invoice (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Recurring Invoice</FormLabel>
                    <FormDescription>
                      Automatically generate this invoice on a schedule
                    </FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('isRecurring') && (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="recurringFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi-annually">Semi-annually</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('recurringFrequency') === 'custom' && (
                  <FormField
                    control={form.control}
                    name="recurringInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interval (Days) *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} placeholder="30" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of days between invoices
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Update Invoice' : 'Create Invoice')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

