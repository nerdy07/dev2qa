'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link as LinkIcon } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import type { Project } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'Link name is required'),
  description: z.string().optional(),
  fileUrl: z.string().url('Please enter a valid URL'),
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

interface FileLinkFormProps {
  onSuccess: () => void;
}

export function FileLinkForm({ onSuccess }: FileLinkFormProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  
  const canReadAll = hasPermission(ALL_PERMISSIONS.FILES.READ_ALL);
  const { data: projects } = useCollection<Project>('projects');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      fileUrl: '',
      folderType: 'general',
      projectId: undefined,
      visibility: canReadAll ? 'restricted' : 'all_staff',
      category: '',
      tags: '',
    },
  });
  
  const folderType = form.watch('folderType');
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db || !auth || !auth.currentUser) {
      toast({
        title: 'Error',
        description: 'User not authenticated or Firebase not initialized.',
        variant: 'destructive',
      });
      return;
    }
    
    // Get the authenticated user's UID directly from Firebase Auth
    const authUid = auth.currentUser.uid;
    const userName = user.name || auth.currentUser.displayName || 'Unknown User';
    const userEmail = user.email || auth.currentUser.email || '';
    
    if (!authUid || !userEmail) {
      toast({
        title: 'Error',
        description: 'Unable to get user information. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    try {
      // Parse tags
      const tags = values.tags
        ? values.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : undefined;
      
      // Get project name if project is selected
      const selectedProject = projects?.find(p => p.id === values.projectId);
      const projectName = selectedProject?.name;
      
      // Save link metadata to Firestore
      // Note: Firestore doesn't accept undefined values, so we use null or omit the field
      const linkData: any = {
        name: values.name,
        type: 'link',
        fileUrl: values.fileUrl,
        folderType: values.folderType,
        visibility: values.visibility,
        uploadedBy: authUid, // Use Firebase Auth UID directly
        uploadedByName: userName,
        uploadedByEmail: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Only add optional fields if they have values (avoid undefined)
      if (values.description) linkData.description = values.description;
      if (values.folderType === 'project' && values.projectId) {
        linkData.projectId = values.projectId;
        if (projectName) linkData.projectName = projectName;
      }
      if (values.folderType === 'general' && values.category) {
        linkData.category = values.category;
      }
      if (tags && tags.length > 0) linkData.tags = tags;
      
      await addDoc(collection(db, 'files'), linkData);
      
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error('Error adding link:', error);
      toast({
        title: 'Add Link Failed',
        description: error.message || 'Failed to add link. Please try again.',
        variant: 'destructive',
      });
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
              <FormLabel>Link Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter link name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this link
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fileUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL *</FormLabel>
              <FormControl>
                <Input 
                  type="url"
                  placeholder="https://example.com/document" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                The full URL to the external resource
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
                  placeholder="Optional description of the link"
                  className="min-h-[80px]"
                  {...field}
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
                Choose whether this link belongs to a specific project or is a general company file (policies, documents, etc.)
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
                  Select the project this link belongs to
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
        
        <div className="grid grid-cols-1 gap-4">
          
          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all_staff">All Staff</SelectItem>
                    <SelectItem value="restricted">Restricted (Requires files:read_all permission)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {canReadAll 
                    ? 'Choose who can view this link. "All Staff" means anyone with files:read_staff permission can see it, "Restricted" requires files:read_all permission.'
                    : 'Links are visible to all staff members (anyone with files:read_staff permission).'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="tag1, tag2, tag3" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated tags for easier searching
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <LinkIcon className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Add Link
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

