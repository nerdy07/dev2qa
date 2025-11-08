'use client';

import React from 'react';
import { useAuth } from '@/providers/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, Link as LinkIcon, FileText, Download, Trash2, Edit, Filter, Search, Eye, EyeOff } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import { CompanyFile } from '@/lib/types';
import { db, storage, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { ref, deleteObject, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadForm } from '@/components/files/file-upload-form';
import { FileLinkForm } from '@/components/files/file-link-form';
import { FileEditForm } from '@/components/files/file-edit-form';
import { PermissionGuard } from '@/components/common/permission-guard';
import type { Project } from '@/lib/types';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function FilesPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const canCreate = hasPermission(ALL_PERMISSIONS.FILES.CREATE);
  const canReadAll = hasPermission(ALL_PERMISSIONS.FILES.READ_ALL);
  const canReadStaff = hasPermission(ALL_PERMISSIONS.FILES.READ_STAFF);
  const canUpdate = hasPermission(ALL_PERMISSIONS.FILES.UPDATE);
  const canDelete = hasPermission(ALL_PERMISSIONS.FILES.DELETE);
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [folderFilter, setFolderFilter] = React.useState<string>('all');
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [fileToEdit, setFileToEdit] = React.useState<CompanyFile | null>(null);
  
  // Query files based on permissions
  // Note: We fetch all files that the user has permission to list, then filter client-side
  // This is because Firestore security rules can't filter based on visibility in list queries
  // We don't use orderBy in the query because it requires Firestore to validate access to all documents
  // that would be returned, including admin-only files that non-admins can't read
  // IMPORTANT: Even if user doesn't have read permissions in the app, Firestore rules allow list
  // so we can still query (it will return empty or only files they can see)
  // We must ensure user is authenticated before creating the query
  // Also wait for auth state to be fully loaded
  const { loading: authLoading } = useAuth();
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = React.useState(false);
  
  // Check if Firebase Auth is ready
  React.useEffect(() => {
    if (!auth) {
      setIsFirebaseAuthReady(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setIsFirebaseAuthReady(firebaseUser != null);
    });
    
    return () => unsubscribe();
  }, [auth]);
  
  const filesQuery = React.useMemo(() => {
    // Don't create query if:
    // 1. Database isn't initialized
    // 2. User isn't authenticated in our context
    // 3. Firebase Auth isn't ready (user not authenticated in Firebase)
    // 4. Auth is still loading (to prevent race conditions)
    if (!db || !user?.id || !isFirebaseAuthReady || authLoading) {
      return null;
    }
    
    // Create a simple query without any constraints (no where, no orderBy)
    // This allows the collection-level 'allow list' rule to work properly
    // Firestore will return all documents the user can list (based on get rules), then we filter client-side
    // Even if user has no app-level permissions, Firestore rules allow list (returns empty if no get permissions)
    return query(collection(db, 'files'));
  }, [db, user?.id, isFirebaseAuthReady, authLoading]);
  
  const { data: files, loading: filesLoading, error: filesError } = useCollection<CompanyFile>('files', filesQuery);
  
  // Get current user's Firebase Auth UID for comparison
  const currentUserId = React.useMemo(() => {
    // Try to get UID from auth.currentUser first (most reliable)
    if (typeof window !== 'undefined' && auth?.currentUser?.uid) {
      return auth.currentUser.uid;
    }
    // Fallback to user.id from auth context
    return user?.id || null;
  }, [user?.id]);
  
  // Debug logging in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Files data:', files);
      console.log('Files loading:', filesLoading);
      console.log('Files error:', filesError);
      console.log('Current user ID:', currentUserId);
      console.log('User object:', user);
      console.log('Can read all:', canReadAll);
      console.log('Can read staff:', canReadStaff);
      if (files && files.length > 0) {
        console.log('Sample file uploadedBy:', files[0]?.uploadedBy);
        console.log('File visibility:', files[0]?.visibility);
      }
    }
  }, [files, filesLoading, filesError, currentUserId, user, canReadAll, canReadStaff]);
  
  // Filter and sort files based on permissions, search and filters
  const filteredFiles = React.useMemo(() => {
    if (!files) return [];
    
    const filtered = files.filter(file => {
      // ALWAYS show files the user created, regardless of visibility or permissions
      // This ensures users can see their own uploads
      // Compare with both user.id and auth.currentUser.uid to handle edge cases
      // Also check if uploadedBy matches any variation of the user ID
      const isOwnFile = currentUserId && (
        file.uploadedBy === currentUserId || 
        file.uploadedBy === user?.id ||
        (user?.id && file.uploadedBy === user.id)
      );
      
      // If it's the user's own file, always show it (skip all other filters except search/category/type)
      if (isOwnFile) {
        // Only apply search, category, and type filters for own files
        // Skip visibility and permission checks
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = 
            file.name.toLowerCase().includes(query) ||
            file.description?.toLowerCase().includes(query) ||
            file.category?.toLowerCase().includes(query) ||
            file.tags?.some(tag => tag.toLowerCase().includes(query));
          if (!matchesSearch) return false;
        }
        if (categoryFilter !== 'all' && file.category !== categoryFilter) {
          return false;
        }
        if (typeFilter !== 'all' && file.type !== typeFilter) {
          return false;
        }
        return true; // Always show own files that pass basic filters
      }
      
      // For files not owned by user, apply permission-based visibility filter
      // If user can only read staff files, hide admin-only files
      if (!canReadAll && canReadStaff && file.visibility === 'restricted') {
        return false;
      }
      
      // If user has no read permissions at all, hide all files (except own files, already handled above)
      if (!canReadAll && !canReadStaff) {
        return false;
      }
      
      // Search filter (only for non-own files, own files already handled above)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          file.name.toLowerCase().includes(query) ||
          file.description?.toLowerCase().includes(query) ||
          file.category?.toLowerCase().includes(query) ||
          file.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      // Category filter (only for non-own files, own files already handled above)
      if (categoryFilter !== 'all' && file.category !== categoryFilter) {
        return false;
      }
      
      // Visibility filter (only show files user has permission to see)
      if (visibilityFilter !== 'all') {
        if (file.visibility !== visibilityFilter) {
          return false;
        }
        // Also check permissions - don't show restricted files to users without files:read_all permission even if filter says so
        if (visibilityFilter === 'restricted' && !canReadAll) {
          return false;
        }
      }
      
      // Type filter (only for non-own files, own files already handled above)
      if (typeFilter !== 'all' && file.type !== typeFilter) {
        return false;
      }
      
      // Folder filter
      if (folderFilter !== 'all') {
        if (folderFilter === 'general' && file.folderType !== 'general') {
          return false;
        }
        if (folderFilter.startsWith('project:') && (file.folderType !== 'project' || file.projectId !== folderFilter.replace('project:', ''))) {
          return false;
        }
        if (folderFilter.startsWith('category:') && (file.folderType !== 'general' || file.category !== folderFilter.replace('category:', ''))) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort by createdAt (newest first) after filtering
    return filtered.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
      return bTime - aTime; // Descending order (newest first)
    });
  }, [files, searchQuery, categoryFilter, visibilityFilter, typeFilter, folderFilter, canReadAll, canReadStaff, currentUserId, user?.id]);
  
  // Group files by folders
  const groupedFiles = React.useMemo(() => {
    if (!filteredFiles) return {};
    
    const groups: Record<string, CompanyFile[]> = {};
    
    filteredFiles.forEach(file => {
      let folderKey: string;
      let folderLabel: string;
      
      // Handle backward compatibility: if folderType is missing, treat as general
      const folderType = file.folderType || 'general';
      
      if (folderType === 'project' && file.projectId) {
        folderKey = `project:${file.projectId}`;
        folderLabel = file.projectName || `Project: ${file.projectId}`;
      } else {
        // General files (or files without folderType for backward compatibility)
        folderKey = file.category ? `category:${file.category}` : 'category:Uncategorized';
        folderLabel = file.category || 'Uncategorized';
      }
      
      if (!groups[folderKey]) {
        groups[folderKey] = [];
      }
      groups[folderKey].push(file);
    });
    
    return groups;
  }, [filteredFiles]);
  
  // Get all available folders for filter dropdown
  const availableFolders = React.useMemo(() => {
    if (!files) return [];
    const folders: Array<{ key: string; label: string; type: 'project' | 'category' }> = [];
    const seen = new Set<string>();
    
    files.forEach(file => {
      // Handle backward compatibility: if folderType is missing, treat as general
      const folderType = file.folderType || 'general';
      
      if (folderType === 'project' && file.projectId) {
        const key = `project:${file.projectId}`;
        if (!seen.has(key)) {
          seen.add(key);
          folders.push({
            key,
            label: file.projectName || `Project: ${file.projectId}`,
            type: 'project'
          });
        }
      } else {
        // General files (or files without folderType for backward compatibility)
        const category = file.category || 'Uncategorized';
        const key = `category:${category}`;
        if (!seen.has(key)) {
          seen.add(key);
          folders.push({
            key,
            label: category,
            type: 'category'
          });
        }
      }
    });
    
    return folders.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'project' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [files]);
  
  // Get unique categories
  const categories = React.useMemo(() => {
    if (!files) return [];
    const cats = new Set<string>();
    files.forEach(file => {
      if (file.category) cats.add(file.category);
    });
    return Array.from(cats).sort();
  }, [files]);
  
  const handleDelete = async (file: CompanyFile) => {
    if (!canDelete || !user) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to delete files.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'files', file.id));
      
      // If it's an uploaded file, delete from Storage
      if (file.type === 'upload' && file.fileUrl) {
        try {
          // Extract path from URL
          const url = new URL(file.fileUrl);
          const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '');
          if (path) {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
          }
        } catch (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Continue even if storage delete fails
        }
      }
      
      toast({
        title: 'File Deleted',
        description: `"${file.name}" has been deleted successfully.`,
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete file.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEdit = async (file: CompanyFile, updates: {
    name?: string;
    description?: string;
    folderType?: 'project' | 'general';
    projectId?: string;
    projectName?: string;
    category?: string;
    visibility?: 'all_staff' | 'restricted';
    tags?: string[];
  }) => {
    if (!file.id || !canUpdate) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to edit files.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      
      // Update basic fields
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
      if (updates.tags !== undefined) updateData.tags = updates.tags.length > 0 ? updates.tags : null;
      
      // Update folder-related fields
      if (updates.folderType !== undefined) {
        updateData.folderType = updates.folderType;
        if (updates.folderType === 'project') {
          updateData.projectId = updates.projectId;
          updateData.projectName = updates.projectName;
          updateData.category = null; // Clear category for project files
        } else {
          updateData.projectId = null;
          updateData.projectName = null;
          updateData.category = updates.category || null;
        }
      } else {
        // If folderType not changed, only update what's provided
        if (updates.projectId !== undefined) updateData.projectId = updates.projectId || null;
        if (updates.projectName !== undefined) updateData.projectName = updates.projectName || null;
        if (updates.category !== undefined) updateData.category = updates.category || null;
      }
      
      await updateDoc(doc(db, 'files', file.id), updateData);
      
      toast({
        title: 'File Updated',
        description: `"${updates.name || file.name}" has been updated successfully.`,
      });
      
      setEditDialogOpen(false);
      setFileToEdit(null);
    } catch (error: any) {
      console.error('Error updating file:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update file. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDownload = async (file: CompanyFile) => {
    if (file.type === 'link') {
      window.open(file.fileUrl, '_blank');
      return;
    }
    
    try {
      let downloadUrl = file.fileUrl;
      
      // If the file URL is a Firebase Storage URL, try to regenerate it to ensure it's valid
      // This handles cases where the stored URL might have expired or been generated with old rules
      if (file.fileUrl && file.fileUrl.includes('firebasestorage.googleapis.com')) {
        try {
          // Extract the storage path from the URL
          const url = new URL(file.fileUrl);
          const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '');
          if (path) {
            // Regenerate the download URL with current authentication
            const storageRef = ref(storage, path);
            downloadUrl = await getDownloadURL(storageRef);
          }
        } catch (regenerateError) {
          console.warn('Failed to regenerate download URL, using stored URL:', regenerateError);
          // Continue with stored URL if regeneration fails
        }
      }
      
      // Track download count
      if (file.id) {
        await updateDoc(doc(db, 'files', file.id), {
          downloadCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
      
      // Open download URL
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download the file. Please try again or contact support if the issue persists.',
        variant: 'destructive',
      });
    }
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  const getFileIcon = (file: CompanyFile) => {
    if (file.type === 'link') return LinkIcon;
    if (file.mimeType?.startsWith('image/')) return FileText;
    if (file.mimeType?.startsWith('video/')) return FileText;
    if (file.mimeType?.startsWith('application/pdf')) return FileText;
    return FileText;
  };
  
  if (!canReadAll && !canReadStaff) {
    return (
      <>
        <PageHeader title="Company Files" description="Manage and access company files and documents." />
        <Alert>
          <AlertDescription>
            You do not have permission to view files. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </>
    );
  }
  
  return (
    <>
      <PageHeader 
        title="Company Files" 
        description="Manage and access company files, documents, and links."
      >
        {canCreate && (
          <div className="flex gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
              setUploadDialogOpen(open);
              // Reset form when dialog closes
              if (!open) {
                // The form will be reset when the component unmounts/remounts
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                  <DialogDescription>
                    Upload a file to the company file storage. Files can be visible to all staff or admins only.
                  </DialogDescription>
                </DialogHeader>
                {uploadDialogOpen && (
                  <FileUploadForm 
                    key={uploadDialogOpen ? 'upload-form' : 'upload-form-closed'}
                    onSuccess={() => {
                      setUploadDialogOpen(false);
                      toast({
                        title: 'File Uploaded',
                        description: 'Your file has been uploaded successfully.',
                      });
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
            
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add External Link</DialogTitle>
                  <DialogDescription>
                    Add a link to an external resource. Links can be visible to all staff or admins only.
                  </DialogDescription>
                </DialogHeader>
                <FileLinkForm 
                  onSuccess={() => {
                    setLinkDialogOpen(false);
                    toast({
                      title: 'Link Added',
                      description: 'The link has been added successfully.',
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </PageHeader>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="all_staff">All Staff</SelectItem>
                  <SelectItem value="restricted">Restricted (Requires files:read_all)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="upload">Uploaded Files</SelectItem>
                  <SelectItem value="link">External Links</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {availableFolders.map(folder => (
                    <SelectItem key={folder.key} value={folder.key}>
                      {folder.type === 'project' ? '📁 ' : '📂 '}{folder.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Files Grid */}
      {filesLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Loading files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || categoryFilter !== 'all' || visibilityFilter !== 'all' || typeFilter !== 'all'
                ? 'No files match your filters.'
                : 'No files uploaded yet.'}
            </p>
            {canCreate && (
              <Button 
                className="mt-4" 
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedFiles).map(([folderKey, folderFiles]) => {
            const folderInfo = availableFolders.find(f => f.key === folderKey);
            const folderLabel = folderInfo?.label || folderKey;
            const isExpanded = expandedFolders.has(folderKey);
            const isProject = folderKey.startsWith('project:');
            
            return (
              <Card key={folderKey}>
                <Collapsible open={isExpanded} onOpenChange={(open) => {
                  const newExpanded = new Set(expandedFolders);
                  if (open) {
                    newExpanded.add(folderKey);
                  } else {
                    newExpanded.delete(folderKey);
                  }
                  setExpandedFolders(newExpanded);
                }}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {isExpanded ? (
                            <FolderOpen className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Folder className="h-5 w-5 text-muted-foreground" />
                          )}
                          <CardTitle className="text-lg">
                            {isProject ? '📁 ' : '📂 '}{folderLabel}
                          </CardTitle>
                          <Badge variant="outline" className="ml-2">
                            {folderFiles.length} {folderFiles.length === 1 ? 'file' : 'files'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {folderFiles.map(file => {
                          const FileIcon = getFileIcon(file);
                          return (
                            <Card key={file.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileIcon className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate" title={file.name}>
                          {file.name}
                        </CardTitle>
                        {file.description && (
                          <CardDescription className="line-clamp-2 mt-1">
                            {file.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={file.type === 'upload' ? 'default' : 'secondary'}>
                        {file.type === 'upload' ? 'File' : 'Link'}
                      </Badge>
                      <Badge variant={file.visibility === 'all_staff' ? 'default' : 'secondary'}>
                        {file.visibility === 'all_staff' ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            All Staff
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Restricted
                          </>
                        )}
                      </Badge>
                      {file.category && (
                        <Badge variant="outline">{file.category}</Badge>
                      )}
                    </div>
                    
                    {file.type === 'upload' && (
                      <div className="text-sm text-muted-foreground">
                        <div>Size: {formatFileSize(file.fileSize)}</div>
                        {file.downloadCount !== undefined && (
                          <div>Downloads: {file.downloadCount}</div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      <div>Uploaded by {file.uploadedByName}</div>
                      <div>{formatDistanceToNow(file.createdAt?.toDate?.() || new Date(), { addSuffix: true })}</div>
                    </div>
                    
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {file.type === 'link' ? 'Open' : 'Download'}
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFileToEdit(file);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
      
      {filteredFiles.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredFiles.length} of {files?.length || 0} files
        </div>
      )}
      
      {/* Edit File Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit File</DialogTitle>
            <DialogDescription>
              Update the file details. Note: You cannot change the file itself for uploaded files.
            </DialogDescription>
          </DialogHeader>
          {fileToEdit && <FileEditForm file={fileToEdit} onSuccess={handleEdit} onCancel={() => {
            setEditDialogOpen(false);
            setFileToEdit(null);
          }} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

