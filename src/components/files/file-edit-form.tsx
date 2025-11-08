'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyFile } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import type { Project } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  description: z.string().optional(),
  folderType: z.enum(['project', 'general'], {
    required_error: 'Please select folder type',
  }),
  projectId: z.string().optional(),
  category: z.string().optional(),
  visibility: z.enum(['all_staff', 'restricted'], {
    required_error: 'Please select visibility',
  }),
  tags: z.string().optional(), // Comma-separated tags
}).refine((data) => {
  // If folderType is 'project', projectId is required
  if (data.folderType === 'project' && !data.projectId) {
    return false;
  }
  return true;
}, {
  message: 'Please select a project',
  path: ['projectId'],
});

interface FileEditFormProps {
  file: CompanyFile;
  onSuccess: (file: CompanyFile, updates: {
    name?: string;
    description?: string;
    folderType?: 'project' | 'general';
    projectId?: string;
    projectName?: string;
    category?: string;
    visibility?: 'all_staff' | 'restricted';
    tags?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function FileEditForm({ file, onSuccess, onCancel }: FileEditFormProps) {
  const { hasPermission } = usePermissions();
  const [submitting, setSubmitting] = React.useState(false);
  
  const canReadAll = hasPermission(ALL_PERMISSIONS.FILES.READ_ALL);
  const { data: projects } = useCollection<Project>('projects');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: file.name || '',
      description: file.description || '',
      folderType: file.folderType || 'general', // Backward compatibility
      projectId: file.projectId || undefined,
      category: file.category || '',
      visibility: file.visibility || 'all_staff',
      tags: file.tags?.join(', ') || '',
    },
  });
  
  const folderType = form.watch('folderType');
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      // Parse tags
      const tags = values.tags
        ? values.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];
      
      // Get project name if project is selected
      const selectedProject = projects?.find(p => p.id === values.projectId);
      const projectName = selectedProject?.name;
      
      await onSuccess(file, {
        name: values.name,
        description: values.description || undefined,
        folderType: values.folderType,
        projectId: values.folderType === 'project' ? values.projectId : undefined,
        projectName: values.folderType === 'project' ? projectName : undefined,
        category: values.folderType === 'general' ? (values.category || undefined) : undefined,
        visibility: values.visibility,
        tags: tags.length > 0 ? tags : undefined,
      });
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error in edit form:', error);
    } finally {
      setSubmitting(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter file name" {...field} />
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
                <Textarea 
                  placeholder="Enter file description (optional)" 
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="folderType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Folder Type *</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                // Reset projectId when switching to general
                if (value === 'general') {
                  form.setValue('projectId', undefined);
                }
                // Reset category when switching to project
                if (value === 'project') {
                  form.setValue('category', '');
                }
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="project">Project Folder</SelectItem>
                  <SelectItem value="general">General (Company Files)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose whether this file belongs to a specific project or is a general company file
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {folderType === 'project' && (
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects && projects.length > 0 ? (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-projects" disabled>No projects available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the project this file belongs to
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {folderType === 'general' && (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Company Policies, HR Documents, Legal" {...field} />
                </FormControl>
                <FormDescription>
                  Optional category to organize general company files
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all_staff">All Staff</SelectItem>
                  {canReadAll && (
                    <SelectItem value="restricted">Restricted (Requires files:read_all permission)</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {canReadAll 
                  ? 'Choose who can view this file. "All Staff" means anyone with files:read_staff permission can see it, "Restricted" requires files:read_all permission.'
                  : 'Files are visible to all staff members (anyone with files:read_staff permission).'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter tags separated by commas (optional)" 
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Separate multiple tags with commas (e.g., "important, document, qa")
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {file.type === 'upload' && (
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <strong>Note:</strong> For uploaded files, you can only edit the metadata (name, description, category, visibility, tags). 
            The file itself cannot be changed. To replace the file, delete this one and upload a new file.
          </div>
        )}
        
        {file.type === 'link' && (
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <strong>Link URL:</strong> {file.fileUrl}
            <br />
            <span className="text-xs">The link URL cannot be changed. To change the URL, delete this link and create a new one.</span>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update File'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

