'use client';

import React from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { EmailGroup, User } from '@/lib/types';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/use-collection';
import { useAuth } from '@/providers/auth-provider';
import { ChevronsUpDown, Search, X, ChevronDown, ChevronRight, FileText, Calendar, Users, Award, Palette, DollarSign, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NOTIFICATION_EVENTS, NOTIFICATION_EVENTS_BY_CATEGORY } from '@/lib/notification-events';
import { Mail } from 'lucide-react';

const emailGroupFormSchema = z.object({
  name: z.string().min(2, {
    message: "Group name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  memberIds: z.array(z.string()).min(1, {
    message: "At least one member is required.",
  }),
  notificationEvents: z.array(z.string()).optional(),
});

type EmailGroupFormValues = z.infer<typeof emailGroupFormSchema>;

interface EmailGroupFormProps {
  emailGroup?: EmailGroup;
  onSuccess?: () => void;
}

export function EmailGroupForm({ emailGroup, onSuccess }: EmailGroupFormProps) {
  const { toast } = useToast();
  const { data: users } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [openCategories, setOpenCategories] = React.useState<Set<string>>(new Set(['requests']));

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);
  
  const form = useForm<EmailGroupFormValues>({
    resolver: zodResolver(emailGroupFormSchema),
    defaultValues: {
      name: emailGroup?.name || '',
      description: emailGroup?.description || '',
      memberIds: emailGroup?.memberIds || [],
      notificationEvents: emailGroup?.notificationEvents || [],
    },
  });

  // Reset form when emailGroup prop changes (important for editing)
  React.useEffect(() => {
    if (emailGroup) {
      form.reset({
        name: emailGroup.name || '',
        description: emailGroup.description || '',
        memberIds: emailGroup.memberIds || [],
        notificationEvents: emailGroup.notificationEvents || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        memberIds: [],
        notificationEvents: [],
      });
    }
  }, [emailGroup, form]);

  const toggleNotificationEvent = (eventValue: string) => {
    const current = form.getValues('notificationEvents') || [];
    if (current.includes(eventValue)) {
      form.setValue('notificationEvents', current.filter(e => e !== eventValue));
    } else {
      form.setValue('notificationEvents', [...current, eventValue]);
    }
  };

  const onSubmit = async (values: EmailGroupFormValues) => {
    try {
      const groupData: any = {
        name: values.name,
        description: values.description || null,
        memberIds: values.memberIds,
        notificationEvents: values.notificationEvents && values.notificationEvents.length > 0 ? values.notificationEvents : null,
        updatedAt: new Date().toISOString(),
      };

      if (emailGroup) {
        // Update existing group
        await updateDoc(doc(db!, 'emailGroups', emailGroup.id), groupData);
        toast({
          title: "Email group updated",
          description: `Email group "${values.name}" has been updated successfully.`,
        });
      } else {
        // Create new group
        await addDoc(collection(db!, 'emailGroups'), {
          ...groupData,
          createdById: currentUser?.id || null,
          createdByName: currentUser?.name || null,
          createdAt: new Date().toISOString(),
        });
        toast({
          title: "Email group created",
          description: `Email group "${values.name}" has been created successfully.`,
        });
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving email group:', error);
      toast({
        title: "Error",
        description: "Failed to save email group. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedMembers = React.useMemo(() => {
    const memberIds = form.watch('memberIds');
    return users?.filter(user => memberIds.includes(user.id)) || [];
  }, [form.watch('memberIds'), users]);

  const availableUsers = users?.filter(user => user.email && !user.disabled) || [];

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.email?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const removeMember = (memberId: string) => {
    const currentMembers = form.getValues('memberIds');
    form.setValue('memberIds', currentMembers.filter(id => id !== memberId));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter group name (e.g., QA Team, All Admins)" {...field} />
              </FormControl>
              <FormDescription>
                This is the display name for the email group.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter group description"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description of what this email group is used for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memberIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Members *</FormLabel>
              <div className="relative" ref={dropdownRef}>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-between",
                    !field.value || field.value.length === 0 && "text-muted-foreground"
                  )}
                  onClick={() => setOpen(!open)}
                >
                  {field.value && field.value.length > 0
                    ? `${field.value.length} member${field.value.length > 1 ? 's' : ''} selected`
                    : "Select members..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                {open && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {filteredUsers.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No users found.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredUsers.map((user) => {
                            const isSelected = field.value?.includes(user.id);
                            return (
                              <div
                                key={user.id}
                                className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const currentMembers = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentMembers, user.id]);
                                    } else {
                                      field.onChange(currentMembers.filter(id => id !== user.id));
                                    }
                                  }}
                                />
                                <div 
                                  className="flex flex-col flex-1 min-w-0 cursor-pointer"
                                  onClick={() => {
                                    const currentMembers = field.value || [];
                                    if (isSelected) {
                                      field.onChange(currentMembers.filter(id => id !== user.id));
                                    } else {
                                      field.onChange([...currentMembers, user.id]);
                                    }
                                  }}
                                >
                                  <span className="text-sm font-medium leading-none">{user.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMembers.map((member) => (
                  <Badge key={member.id} variant="secondary" className="gap-1">
                    {member.name}
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
              </div>
              <FormDescription>
                Select users to include in this email group.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notificationEvents"
          render={({ field }) => {
            const selectedEvents = field.value || [];
            
            const toggleCategory = (category: string) => {
              setOpenCategories(prev => {
                const newSet = new Set(prev);
                if (newSet.has(category)) {
                  newSet.delete(category);
                } else {
                  newSet.add(category);
                }
                return newSet;
              });
            };

            const categoryIcons: Record<string, React.ReactNode> = {
              requests: <FileText className="h-4 w-4" />,
              tasks: <FileText className="h-4 w-4" />,
              leave: <Calendar className="h-4 w-4" />,
              hr: <Users className="h-4 w-4" />,
              design: <Palette className="h-4 w-4" />,
              finance: <DollarSign className="h-4 w-4" />,
              system: <Settings className="h-4 w-4" />,
            };

            const categoryLabels: Record<string, string> = {
              requests: 'Requests',
              tasks: 'Tasks & Projects',
              leave: 'Leave Management',
              hr: 'HR & Performance',
              design: 'Design Requests',
              finance: 'Finance',
              system: 'System',
            };

            return (
              <FormItem>
                <FormLabel>Notification Events</FormLabel>
                <FormControl>
                  <div className="rounded-md border p-4 space-y-2 max-h-[500px] overflow-y-auto">
                    <p className="text-sm text-muted-foreground mb-4">
                      Select which notification events should CC this email group. Members will receive copies of emails sent for these events.
                    </p>
                    {Object.entries(NOTIFICATION_EVENTS_BY_CATEGORY).map(([category, events]) => {
                      const isOpen = openCategories.has(category);
                      const categoryEvents = events.map(e => e.value);
                      const selectedCount = categoryEvents.filter(e => selectedEvents.includes(e)).length;
                      const allSelected = selectedCount === categoryEvents.length && categoryEvents.length > 0;
                      const someSelected = selectedCount > 0 && selectedCount < categoryEvents.length;

                      return (
                        <Collapsible
                          key={category}
                          open={isOpen}
                          onOpenChange={() => toggleCategory(category)}
                        >
                          <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                            <CollapsibleTrigger className="flex items-center justify-between flex-1 gap-2">
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {categoryIcons[category]}
                                <span className="font-medium">{categoryLabels[category]}</span>
                                {selectedCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {selectedCount}/{categoryEvents.length}
                                  </Badge>
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Select all in this category
                                  const newEvents = [...new Set([...selectedEvents, ...categoryEvents])];
                                  field.onChange(newEvents);
                                } else {
                                  // Deselect all in this category
                                  const newEvents = selectedEvents.filter(e => !categoryEvents.includes(e));
                                  field.onChange(newEvents);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <CollapsibleContent>
                            <div className="pl-6 space-y-2 py-2">
                              {events.map((event) => {
                                const isSelected = selectedEvents.includes(event.value);
                                return (
                                  <div
                                    key={event.value}
                                    className="flex items-start gap-2 py-1"
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleNotificationEvent(event.value)}
                                      className="mt-1"
                                    />
                                    <label
                                      className="text-sm cursor-pointer flex-1"
                                      onClick={() => toggleNotificationEvent(event.value)}
                                    >
                                      <div className="font-medium">{event.label}</div>
                                      <div className="text-xs text-muted-foreground">{event.description}</div>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </FormControl>
                <FormDescription>
                  When these notification events occur, this email group will be CC'd on the emails. Leave empty if you don't want this group to receive automatic CCs.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : emailGroup ? 'Update Group' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
