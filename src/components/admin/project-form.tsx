
'use client';

import { useFieldArray, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Project, User, Milestone } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { CalendarIcon, Trash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Separator } from '../ui/separator';

interface ProjectFormProps {
  project?: Project;
  onSave: (values: Omit<Project, 'id'>) => Promise<boolean>;
  onCancel: () => void;
}

const taskSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Task name is required.'),
});

const milestoneSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Milestone name is required.'),
    description: z.string().optional(),
    status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
    tasks: z.array(taskSchema).optional().default([]),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().optional(),
  leadId: z.string().optional(),
  status: z.enum(['Not Started', 'In Progress', 'On Hold', 'Completed']).default('Not Started'),
  dates: z.object({
      from: z.date().optional(),
      to: z.date().optional(),
  }).optional(),
  milestones: z.array(milestoneSchema).optional(),
});

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const isEditing = !!project;
  const { data: users, loading: usersLoading } = useCollection<User>('users');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      leadId: project?.leadId || undefined,
      status: project?.status || 'Not Started',
      dates: {
        from: project?.startDate ? project.startDate.toDate() : undefined,
        to: project?.endDate ? project.endDate.toDate() : undefined,
      },
      milestones: project?.milestones?.map(m => ({ ...m, tasks: m.tasks || [] })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "milestones",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedUser = users?.find(u => u.id === values.leadId);
    
    const submissionValues: Omit<Project, 'id'> = {
        name: values.name,
        description: values.description,
        leadId: values.leadId,
        leadName: selectedUser?.name || '',
        status: values.status,
        startDate: values.dates?.from,
        endDate: values.dates?.to,
        milestones: values.milestones?.map(m => ({
            id: m.id || crypto.randomUUID(),
            name: m.name,
            description: m.description,
            status: m.status,
            tasks: m.tasks?.map(t => ({
                id: t.id || crypto.randomUUID(),
                name: t.name,
                status: project?.milestones?.find(pm => pm.id === m.id)?.tasks?.find(pt => pt.id === t.id)?.status || 'To Do',
            })) || [],
        })) || [],
    };
    await onSave(submissionValues);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Q3 Marketing Campaign" {...field} />
              </FormControl>
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
                        <Textarea placeholder="Describe the project's goals and scope." {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="leadId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Project Lead</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={usersLoading}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Assign a project lead" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="no-lead" disabled>Select a user</SelectItem>
                        {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="On Hold">On Hold</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="dates"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Project Timeline</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value?.from && "text-muted-foreground"
                      )}
                    >
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "LLL dd, y")} -{" "}
                            {format(field.value.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(field.value.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={field.value?.from}
                    selected={{from: field.value?.from || undefined, to: field.value?.to}}
                    onSelect={field.onChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Optional: Select a start and end date for the project.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />

        <div>
            <h3 className="text-lg font-medium">Project Milestones</h3>
            <FormDescription>Break the project down into manageable milestones and tasks.</FormDescription>
            <div className="space-y-4 mt-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/20">
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                        <FormField
                            control={form.control}
                            name={`milestones.${index}.name`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Milestone Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Phase 1: Design & Prototyping" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`milestones.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Milestone Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the goals of this milestone." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`milestones.${index}.status`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Milestone Status</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a status" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Nested Task Field Array */}
                        <div className="pl-4 border-l-2 ml-2 space-y-3">
                            <h4 className="text-md font-medium">Tasks</h4>
                            <NestedTaskArray milestoneIndex={index} />
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ name: '', description: '', status: 'Pending', tasks: [] })}
                >
                    Add Milestone
                </Button>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background/95 py-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Project')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper component for nested task array
function NestedTaskArray({ milestoneIndex }: { milestoneIndex: number }) {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
      control,
      name: `milestones.${milestoneIndex}.tasks`,
    });
  
    return (
      <div>
        {fields.map((field, taskIndex) => (
          <div key={field.id} className="flex items-center gap-2 mb-2">
            <FormField
              control={control}
              name={`milestones.${milestoneIndex}.tasks.${taskIndex}.name`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder={`Task ${taskIndex + 1}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove(taskIndex)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ name: '' })}
          className="mt-2"
        >
          Add Task
        </Button>
      </div>
    );
  }

    