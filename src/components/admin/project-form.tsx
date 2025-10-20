
'use client';

import { useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
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
import { CalendarIcon, Trash, PlusCircle, ChevronsUpDown, Sparkles, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import React from 'react';
import { uploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { getTaskTimelines } from '@/app/actions';

interface ProjectFormProps {
  project?: Project;
  projectId: string; // Always expect a project ID
  onSave: (values: Omit<Project, 'id'>, id: string) => Promise<boolean>;
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
    doc: z.instanceof(File).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
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

export function ProjectForm({ project, projectId, onSave, onCancel }: ProjectFormProps) {
  const isEditing = !!project;
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { toast } = useToast();

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
              id: t.id,
              name: t.name,
              description: t.description || '',
              docUrl: t.docUrl || '',
              startDate: t.startDate ? t.startDate.toDate() : undefined,
              endDate: t.endDate ? t.endDate.toDate() : undefined,
          })) || [] 
      })) || [],
      resources: project?.resources || [],
    },
  });

  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone, update: updateMilestone } = useFieldArray({
    control: form.control,
    name: "milestones",
  });

  const { fields: resourceFields, append: appendResource, remove: removeResource } = useFieldArray({
    control: form.control,
    name: "resources",
  });
  
  const [isPlanning, setIsPlanning] = React.useState<Record<number, boolean>>({});

  const handleGenerateTimelines = async (milestoneIndex: number) => {
    const milestone = form.getValues(`milestones.${milestoneIndex}`);
    if (!milestone.dates?.from || !milestone.dates?.to) {
        toast({ title: 'Milestone Dates Required', description: 'Please set a start and end date for the milestone first.', variant: 'destructive'});
        return;
    }
    if (!milestone.tasks || milestone.tasks.length === 0) {
        toast({ title: 'No Tasks', description: 'Please add at least one task to the milestone.', variant: 'destructive'});
        return;
    }
    
    setIsPlanning(prev => ({...prev, [milestoneIndex]: true}));

    const input = {
        milestoneStartDate: milestone.dates.from.toISOString(),
        milestoneEndDate: milestone.dates.to.toISOString(),
        tasks: milestone.tasks.map(t => ({ id: t.id!, description: t.description || t.name }))
    };

    const result = await getTaskTimelines(input);

    if (result.success) {
        const updatedTasks = milestone.tasks.map(originalTask => {
            const plannedTask = result.data.tasks.find(pt => pt.id === originalTask.id);
            if (plannedTask) {
                return {
                    ...originalTask,
                    startDate: new Date(plannedTask.startDate),
                    endDate: new Date(plannedTask.endDate),
                };
            }
            return originalTask;
        });

        // Use update from useFieldArray to properly trigger re-render
        updateMilestone(milestoneIndex, { ...milestone, tasks: updatedTasks });
        
        toast({ title: 'Timelines Generated', description: 'AI has scheduled the tasks for this milestone.' });
    } else {
        toast({ title: 'AI Planning Failed', description: result.error, variant: 'destructive' });
    }

    setIsPlanning(prev => ({...prev, [milestoneIndex]: false}));
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedUser = users?.find(u => u.id === values.leadId);
    
    for (const milestone of values.milestones || []) {
      for (const task of milestone.tasks || []) {
        if (task.doc) {
          try {
            const path = `projects/${projectId}/tasks/${task.id}`;
            task.docUrl = await uploadFile(task.doc, path);
          } catch (error) {
            console.error("File upload failed for task:", task.name, error);
            toast({
                title: 'File Upload Failed',
                description: `Could not upload document for task "${task.name}".`,
                variant: 'destructive',
            })
            return;
          }
        }
      }
    }

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
                id: t.id!,
                name: t.name,
                description: t.description || null,
                docUrl: t.docUrl || null,
                startDate: t.startDate || null,
                endDate: t.endDate || null,
                status: project?.milestones?.flatMap(pm => pm.tasks).find(pt => pt.id === t.id)?.status || 'To Do',
                assigneeId: project?.milestones?.flatMap(pm => pm.tasks).find(pt => pt.id === t.id)?.assigneeId || null,
                assigneeName: project?.milestones?.flatMap(pm => pm.tasks).find(pt => pt.id === t.id)?.assigneeName || null,
            })) || [],
        })) || [],
        resources: values.resources?.map(r => ({
            id: r.id || crypto.randomUUID(),
            name: r.name,
            url: r.url,
        })) || [],
    };
    await onSave(submissionValues, projectId);
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
                        <Textarea placeholder="Describe the project's goals and scope." {...field} value={field.value ?? ''} />
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
                                        <Textarea placeholder="Describe the goals of this milestone." {...field} value={field.value ?? ''} />
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
                        
                        <div className="pl-4 border-l-2 ml-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-md font-medium">Tasks</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleGenerateTimelines(index)} disabled={isPlanning[index]}>
                                    {isPlanning[index] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate Task Timelines
                                </Button>
                            </div>
                            <NestedTaskArray milestoneIndex={index} control={form.control} />
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendMilestone({ id: crypto.randomUUID(), name: '', description: '', status: 'Pending', tasks: [] })}
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

function NestedTaskArray({ milestoneIndex, control }: { milestoneIndex: number, control: any }) {
    const { fields, append, remove } = useFieldArray({
      control,
      name: `milestones.${milestoneIndex}.tasks`,
    });

    const taskDates = useWatch({
      control,
      name: `milestones.${milestoneIndex}.tasks`
    });
  
    return (
      <div className='space-y-3'>
        {fields.map((field, taskIndex) => {
            const currentTask = taskDates?.[taskIndex];
          return (
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
                <CollapsibleContent className="space-y-4 pt-4">
                    <FormField
                        control={control}
                        name={`milestones.${milestoneIndex}.tasks.${taskIndex}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Task Description</FormLabel>
                                <FormControl><Textarea placeholder="Describe what this task entails..." {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={control}
                            name={`milestones.${milestoneIndex}.tasks.${taskIndex}.startDate`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Start Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild><FormControl>
                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name={`milestones.${milestoneIndex}.tasks.${taskIndex}.endDate`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">End Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild><FormControl>
                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={{ before: currentTask?.startDate }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                      control={control}
                      name={`milestones.${milestoneIndex}.tasks.${taskIndex}.doc`}
                      render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Document Upload</FormLabel>
                            <FormControl>
                                <Input 
                                    type="file"
                                    onChange={(e) => onChange(e.target.files?.[0])}
                                    {...rest}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                      )}
                    />
                </CollapsibleContent>
             </Collapsible>
          </div>
        )})}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ id: crypto.randomUUID(), name: '', description: '', docUrl: '' })}
          className="mt-2"
        >
          Add Task
        </Button>
      </div>
    );
  }
