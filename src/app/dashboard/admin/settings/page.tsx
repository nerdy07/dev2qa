'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDocument } from '@/hooks/use-collection';
import type { CompanySettings, BankAccount } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, Plus, Trash2, Building2, CreditCard } from 'lucide-react';
import { ProtectedRoute } from '@/components/common/protected-route';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'ZAR'];

const companyFormSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  logoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  taxId: z.string().optional(),
  defaultCurrency: z.string().min(3).max(3),
  paymentTerms: z.string().optional(),
  invoiceNotes: z.string().optional(),
});

const accountFormSchema = z.object({
  accountName: z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  currency: z.string().min(3).max(3),
  isDefault: z.boolean().default(false),
  notes: z.string().optional(),
});

export default function SettingsPage() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canManage = hasPermission(ALL_PERMISSIONS.INVOICES.MANAGE) || hasPermission(ALL_PERMISSIONS.ADMIN_SECTION.READ);
  
  const { data: settings, loading } = useDocument<CompanySettings>('companySettings', 'company');
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const companyForm = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: settings?.companyName || '',
      email: settings?.email || '',
      phone: settings?.phone || '',
      website: settings?.website || '',
      logoUrl: settings?.logoUrl || '',
      address: {
        street: settings?.address?.street || '',
        city: settings?.address?.city || '',
        state: settings?.address?.state || '',
        country: settings?.address?.country || '',
        postalCode: settings?.address?.postalCode || '',
      },
      taxId: settings?.taxId || '',
      defaultCurrency: settings?.defaultCurrency || 'USD',
      paymentTerms: settings?.paymentTerms || '',
      invoiceNotes: settings?.invoiceNotes || '',
    },
  });

  const accountForm = useForm<z.infer<typeof accountFormSchema>>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      routingNumber: '',
      swiftCode: '',
      iban: '',
      currency: 'USD',
      isDefault: false,
      notes: '',
    },
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      companyForm.reset({
        companyName: settings.companyName || '',
        email: settings.email || '',
        phone: settings.phone || '',
        website: settings.website || '',
        logoUrl: settings.logoUrl || '',
        address: {
          street: settings.address?.street || '',
          city: settings.address?.city || '',
          state: settings.address?.state || '',
          country: settings.address?.country || '',
          postalCode: settings.address?.postalCode || '',
        },
        taxId: settings.taxId || '',
        defaultCurrency: settings.defaultCurrency || 'USD',
        paymentTerms: settings.paymentTerms || '',
        invoiceNotes: settings.invoiceNotes || '',
      });
    }
  }, [settings, companyForm]);

  const handleCompanySubmit = async (values: z.infer<typeof companyFormSchema>) => {
    if (!db) {
      toast({
        title: 'Error',
        description: 'Database not initialized',
        variant: 'destructive',
      });
      return;
    }

    try {
      const settingsRef = doc(db, 'companySettings', 'company');
      await setDoc(settingsRef, {
        ...values,
        updatedAt: serverTimestamp(),
        createdAt: settings?.createdAt || serverTimestamp(),
      }, { merge: true });

      toast({
        title: 'Settings saved',
        description: 'Company settings have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving company settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAccountSubmit = async (values: z.infer<typeof accountFormSchema>) => {
    if (!db || !settings) {
      toast({
        title: 'Error',
        description: 'Database not initialized or settings not loaded',
        variant: 'destructive',
      });
      return;
    }

    try {
      const accounts = settings.bankAccounts || [];
      let updatedAccounts: BankAccount[];

      // Helper function to remove undefined values
      const removeUndefined = (obj: any) => {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          if (obj[key] !== undefined) {
            cleaned[key] = obj[key];
          }
        });
        return cleaned;
      };

      const now = Timestamp.now();

      if (editingAccount) {
        // Update existing account
        updatedAccounts = accounts.map(acc =>
          acc.id === editingAccount.id
            ? removeUndefined({
                ...acc,
                accountName: values.accountName,
                accountNumber: values.accountNumber,
                bankName: values.bankName,
                routingNumber: values.routingNumber || undefined,
                swiftCode: values.swiftCode || undefined,
                iban: values.iban || undefined,
                currency: values.currency,
                isDefault: values.isDefault || false,
                notes: values.notes || undefined,
                updatedAt: now,
              })
            : acc
        );
      } else {
        // Add new account - generate ID
        const newAccount = removeUndefined({
          id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          accountName: values.accountName,
          accountNumber: values.accountNumber,
          bankName: values.bankName,
          routingNumber: values.routingNumber || undefined,
          swiftCode: values.swiftCode || undefined,
          iban: values.iban || undefined,
          currency: values.currency,
          isDefault: values.isDefault || false,
          notes: values.notes || undefined,
          createdAt: now,
          updatedAt: now,
        });
        updatedAccounts = [...accounts, newAccount as BankAccount];
      }

      // If setting as default, unset other defaults
      if (values.isDefault) {
        updatedAccounts = updatedAccounts.map(acc =>
          acc.id === editingAccount?.id ? acc : { ...acc, isDefault: false }
        );
      }

      // Clean all accounts to remove undefined values
      const cleanedAccounts = updatedAccounts.map(acc => removeUndefined(acc));

      const settingsRef = doc(db, 'companySettings', 'company');
      await setDoc(settingsRef, {
        bankAccounts: cleanedAccounts,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: editingAccount ? 'Account updated' : 'Account added',
        description: 'Bank account has been saved successfully.',
      });

      setIsAccountDialogOpen(false);
      setEditingAccount(null);
      accountForm.reset();
    } catch (error: any) {
      console.error('Error saving bank account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save account. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!db || !settings) return;

    try {
      const accounts = settings.bankAccounts || [];
      const updatedAccounts = accounts.filter(acc => acc.id !== accountId);

      const settingsRef = doc(db, 'companySettings', 'company');
      await setDoc(settingsRef, {
        bankAccounts: updatedAccounts,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: 'Account deleted',
        description: 'Bank account has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account.',
        variant: 'destructive',
      });
    }
  };

  const openEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    accountForm.reset({
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      routingNumber: account.routingNumber || '',
      swiftCode: account.swiftCode || '',
      iban: account.iban || '',
      currency: account.currency,
      isDefault: account.isDefault || false,
      notes: account.notes || '',
    });
    setIsAccountDialogOpen(true);
  };

  if (!canManage) {
    return (
      <ProtectedRoute requiredPermission={ALL_PERMISSIONS.ADMIN_SECTION.READ}>
        <div>You don't have permission to view settings.</div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Company Settings" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Manage your company information and bank accounts for invoicing"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            This information will appear on your invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...companyForm}>
            <form onSubmit={companyForm.handleSubmit(handleCompanySubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={companyForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to your company logo image (will appear on invoices)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Currency *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / VAT Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={companyForm.control}
                    name="address.street"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="address.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={companyForm.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Payment Terms</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Payment is due within 30 days of invoice date..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={companyForm.control}
                name="invoiceNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Invoice Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Default notes to include on invoices..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={companyForm.formState.isSubmitting}>
                  {companyForm.formState.isSubmitting ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Accounts
              </CardTitle>
              <CardDescription>
                Manage bank accounts that appear on invoices for payment
              </CardDescription>
            </div>
            <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingAccount(null); accountForm.reset(); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAccount ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
                  <DialogDescription>
                    Add bank account details that will appear on invoices
                  </DialogDescription>
                </DialogHeader>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={accountForm.control}
                        name="accountName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Main Business Account" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Chase Bank" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
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
                                {CURRENCIES.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="routingNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Routing Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="swiftCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SWIFT Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="iban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="isDefault"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Set as Default</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                This account will be pre-selected when creating invoices
                              </p>
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
                    </div>

                    <FormField
                      control={accountForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes about this account..."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAccountDialogOpen(false);
                          setEditingAccount(null);
                          accountForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={accountForm.formState.isSubmitting}>
                        {accountForm.formState.isSubmitting ? 'Saving...' : (editingAccount ? 'Update Account' : 'Add Account')}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {settings?.bankAccounts && settings.bankAccounts.length > 0 ? (
            <div className="space-y-4">
              {settings.bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{account.accountName}</p>
                      {account.isDefault && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.bankName} • {account.accountNumber} • {account.currency}
                    </p>
                    {account.routingNumber && (
                      <p className="text-xs text-muted-foreground">
                        Routing: {account.routingNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditAccount(account)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No bank accounts added yet.</p>
              <Button onClick={() => setIsAccountDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

