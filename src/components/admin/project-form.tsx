
'use client';

import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
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
import type { Project, User, Milestone, Task, ProjectResource } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { CalendarIcon, Trash, PlusCircle, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import React from 'react';

interface ProjectFormProps {
  project?: Project;
  onSave: (values: Omit<Project, 'id'>) => Promise<boolean>;
  onCancel: () => void;
}

const resourceSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Resource name is required.'),
    url: z.string().url('Must be a valid URL.'),
});

const taskSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Task name is required.'),
    description: z.string().optional(),
    docUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const milestoneSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Milestone name is required.'),
    description: z.string().optional(),
    status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
    dates: z.object({
      from: z.date().optional(),
      to: z.date().optional(),
    }).optional(),
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
  resources: z.array(resourceSchema).optional(),
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
      milestones: project?.milestones?.map(m => ({ 
          ...m, 
          description: m.description || '',
          dates: {
            from: m.startDate ? m.startDate.toDate() : undefined,
            to: m.endDate ? m.endDate.toDate() : undefined,
          },
          tasks: m.tasks?.map(t => ({
              ...t,
              description: t.description || '',
              docUrl: t.docUrl || '',
          })) || [] 
      })) || [],
      resources: project?.resources || [],
    },
  });

  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({
    control: form.control,
    name: "milestones",
  });

  const { fields: resourceFields, append: appendResource, remove: removeResource } = useFieldArray({
    control: form.control,
    name: "resources",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedUser = users?.find(u => u.id === values.leadId);
    
    const submissionValues: Omit<Project, 'id'> = {
        name: values.name,
        description: values.description || null,
        leadId: values.leadId || null,
        leadName: selectedUser?.name || null,
        status: values.status,
        startDate: values.dates?.from || null,
        endDate: values.dates?.to || null,
        milestones: values.milestones?.map(m => ({
            id: m.id || crypto.randomUUID(),
            name: m.name,
            description: m.description || null,
            status: m.status,
            startDate: m.dates?.from || null,
            endDate: m.dates?.to || null,
            tasks: m.tasks?.map(t => ({
                id: t.id || crypto.randomUUID(),
                name: t.name,
                description: t.description || null,
                docUrl: t.docUrl || null,
                status: 'To Do',
                assigneeId: null,
                assigneeName: null,
            })) || [],
        })) || [],
        resources: values.resources?.map(r => ({
            id: r.id || crypto.randomUUID(),
            name: r.name,
            url: r.url,
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
                <Select onValueChange={field.onChange} value={field.value} disabled={usersLoading}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Assign a project lead" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            <h3 className="text-lg font-medium">Project Resources</h3>
            <FormDescription>Attach relevant documents like BRDs, charters, or concept notes.</FormDescription>
            <div className="space-y-4 mt-4">
                {resourceFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md bg-muted/20">
                        <div className='flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3'>
                            <FormField
                                control={form.control}
                                name={`resources.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Resource Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., Business Requirement Doc" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`resources.${index}.url`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Resource URL</FormLabel>
                                        <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive mt-6" onClick={() => removeResource(index)}>
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => appendResource({ name: '', url: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Resource
                </Button>
            </div>
        </div>

        <Separator />

        <div>
            <h3 className="text-lg font-medium">Project Milestones</h3>
            <FormDescription>Break the project down into manageable milestones and tasks.</FormDescription>
            <div className="space-y-4 mt-4">
                {milestoneFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/20">
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMilestone(index)}
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
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name={`milestones.${index}.status`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Milestone Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
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
                             <FormField
                                control={form.control}
                                name={`milestones.${index}.dates`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Milestone Timeline</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value?.from && "text-muted-foreground")}>
                                                    {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={{from: field.value?.from || undefined, to: field.value?.to}} onSelect={field.onChange} numberOfMonths={1} />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </div>
                        
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
                    onClick={() => appendMilestone({ name: '', description: '', status: 'Pending', tasks: [] })}
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
      <div className='space-y-3'>
        {fields.map((field, taskIndex) => (
          <div key={field.id} className="p-3 border rounded-md bg-background/50 relative">
             <Collapsible>
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <button type="button" className='flex items-center gap-2 text-sm font-medium flex-1 text-left p-1'>
                           <ChevronsUpDown className="h-4 w-4" />
                           <FormField
                                control={control}
                                name={`milestones.${milestoneIndex}.tasks.${taskIndex}.name`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder={`Task ${taskIndex + 1}`} {...field} onClick={(e) => e.stopPropagation()} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </button>
                    </CollapsibleTrigger>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(taskIndex)}>
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
                <CollapsibleContent className="space-y-3 pt-4">
                    <FormField
                    control={control}
                    name={`milestones.${milestoneIndex}.tasks.${taskIndex}.description`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Task Description</FormLabel>
                            <FormControl><Textarea placeholder="Describe what this task entails..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name={`milestones.${milestoneIndex}.tasks.${taskIndex}.docUrl`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Document URL</FormLabel>
                            <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                </CollapsibleContent>
             </Collapsible>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ name: '', description: '', docUrl: '' })}
          className="mt-2"
        >
          Add Task
        </Button>
      </div>
    );
  }


    