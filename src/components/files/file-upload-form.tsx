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
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import type { Project } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  description: z.string().optional(),
  file: z.custom<File>((val) => {
    if (!val || !(val instanceof File)) {
      return false;
    }
    return true;
  }, { message: 'Please select a file to upload' }),
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

interface FileUploadFormProps {
  onSuccess: () => void;
}

export function FileUploadForm({ onSuccess }: FileUploadFormProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  
  const canReadAll = hasPermission(ALL_PERMISSIONS.FILES.READ_ALL);
  const { data: projects } = useCollection<Project>('projects');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      folderType: 'general',
      projectId: undefined,
      visibility: canReadAll ? 'restricted' : 'all_staff',
      category: '',
      tags: '',
    },
  });
  
  const folderType = form.watch('folderType');
  
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Manually set the file value in the form
      form.setValue('file', file, { 
        shouldValidate: true,
        shouldDirty: true,
      });
      
      // Trigger validation immediately
      form.trigger('file');
      
      // Auto-fill name from filename (without extension)
      const currentName = form.getValues('name');
      if (!currentName || currentName.trim() === '') {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        form.setValue('name', nameWithoutExt);
      }
    } else {
      setSelectedFile(null);
      form.setValue('file', undefined as any, { 
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  };
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db || !storage || !auth || !auth.currentUser) {
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
    
    setUploading(true);
    try {
      const file = values.file;
      
      // Double-check file exists
      if (!file || !(file instanceof File)) {
        toast({
          title: 'No File Selected',
          description: 'Please select a file to upload.',
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }
      
      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 100MB.',
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }
      
      // Validate file type by MIME type (more secure than extension)
      const allowedMimeTypes = [
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // Archives
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        // Videos
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
      ];
      
      if (!allowedMimeTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'This file type is not allowed. Please upload a document, image, archive, or video file.',
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }
      
      // Generate storage path
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `company-files/${authUid}/${fileName}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Parse tags
      const tags = values.tags
        ? values.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : undefined;
      
      // Get project name if project is selected
      const selectedProject = projects?.find(p => p.id === values.projectId);
      const projectName = selectedProject?.name;
      
      // Save file metadata to Firestore
      // Note: Firestore doesn't accept undefined values, so we use null or omit the field
      const fileData: any = {
        name: values.name,
        type: 'upload',
        fileUrl: downloadURL,
        fileSize: file.size,
        mimeType: file.type,
        folderType: values.folderType,
        visibility: values.visibility,
        uploadedBy: authUid, // Use Firebase Auth UID directly
        uploadedByName: userName,
        uploadedByEmail: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        downloadCount: 0,
      };
      
      // Only add optional fields if they have values (avoid undefined)
      if (values.description) fileData.description = values.description;
      if (values.folderType === 'project' && values.projectId) {
        fileData.projectId = values.projectId;
        if (projectName) fileData.projectName = projectName;
      }
      if (values.folderType === 'general' && values.category) {
        fileData.category = values.category;
      }
      if (tags && tags.length > 0) fileData.tags = tags;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Saving file to Firestore:', fileData);
      }
      
      const docRef = await addDoc(collection(db, 'files'), fileData);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('File saved successfully with ID:', docRef.id);
      }
      
      form.reset();
      setSelectedFile(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="file"
          render={() => (
            <FormItem>
              <FormLabel>File *</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept="*/*"
                  className="cursor-pointer"
                />
              </FormControl>
              <FormDescription>
                Select a file to upload. Maximum file size: 100MB
              </FormDescription>
              {selectedFile && (
                <div className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter file name" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this file
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
                  placeholder="Optional description of the file"
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
                Choose whether this file belongs to a specific project or is a general company file (policies, documents, etc.)
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
                    ? 'Choose who can view this file. "All Staff" means anyone with files:read_staff permission can see it, "Restricted" requires files:read_all permission.'
                    : 'Files are visible to all staff members (anyone with files:read_staff permission).'}
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
          <Button type="submit" disabled={uploading}>
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

