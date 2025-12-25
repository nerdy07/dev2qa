'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, X, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useCollection } from '@/hooks/use-collection';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type EmployeeDocument = {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  documentType: 'cv' | 'contract' | 'id' | 'certificate' | 'other';
  uploadedAt: any; // Firestore Timestamp
  uploadedBy?: string;
  fileSize?: number; // in bytes
};

interface UserDocumentsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDocumentsDialog({ user, open, onOpenChange }: UserDocumentsDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'cv' | 'contract' | 'id' | 'certificate' | 'other'>('other');

  // Get documents for this user
  const documentsQuery = React.useMemo(() => {
    if (!user?.id) return null;
    return query(
      collection(db!, 'employeeDocuments'),
      where('userId', '==', user.id)
    );
  }, [user?.id]);

  const { data: documents, loading } = useCollection<EmployeeDocument>('employeeDocuments', documentsQuery);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File must be less than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !db || !storage) {
      toast({
        title: 'Error',
        description: 'Please select a file and document type.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to Firebase Storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, `employeeDocuments/${fileName}`);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Save document metadata to Firestore
      await addDoc(collection(db, 'employeeDocuments'), {
        userId: user.id,
        fileName: selectedFile.name,
        fileUrl: downloadURL,
        fileType: selectedFile.type,
        documentType: documentType,
        fileSize: selectedFile.size,
        uploadedAt: serverTimestamp(),
      });

      toast({
        title: 'Document Uploaded',
        description: `${selectedFile.name} has been uploaded successfully.`,
      });

      // Reset form
      setSelectedFile(null);
      setDocumentType('other');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      const err = error as Error;
      console.error('Error uploading document:', err);
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string, fileUrl: string) => {
    if (!db || !storage) return;

    try {
      // Extract the storage path from the full URL
      // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token=...
      // We need to extract the path after 'o/' and before '?'
      let storagePath = fileUrl;
      try {
        const url = new URL(fileUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
        if (pathMatch) {
          storagePath = decodeURIComponent(pathMatch[1]);
        }
      } catch {
        // If URL parsing fails, try to extract path directly
        const match = fileUrl.match(/employeeDocuments%2F(.+?)(\?|$)/);
        if (match) {
          storagePath = `employeeDocuments/${decodeURIComponent(match[1])}`;
        }
      }

      // Delete from Storage
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef).catch((err) => {
        console.warn('Could not delete file from storage:', err);
        // Continue to delete from Firestore even if storage delete fails
      });

      // Delete from Firestore
      await deleteDoc(doc(db, 'employeeDocuments', documentId));

      toast({
        title: 'Document Deleted',
        description: 'Document has been deleted successfully.',
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error deleting document:', err);
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      cv: 'CV/Resume',
      contract: 'Contract',
      id: 'ID Document',
      certificate: 'Certificate',
      other: 'Other',
    };
    return labels[type] || 'Other';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Documents - {user.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-semibold">Upload New Document</h4>
            
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
                <SelectTrigger id="document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cv">CV/Resume</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="id">ID Document</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-input">File</Label>
              <Input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>

          {/* Documents List */}
          <div>
            <h4 className="font-semibold mb-3">Uploaded Documents</h4>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{doc.fileName}</p>
                          <Badge variant="secondary">
                            {getDocumentTypeLabel(doc.documentType)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.uploadedAt && (
                            <span>
                              {typeof doc.uploadedAt.toDate === 'function'
                                ? format(doc.uploadedAt.toDate(), 'MMM d, yyyy')
                                : 'Unknown date'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id, doc.fileUrl)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No documents uploaded yet. Upload documents using the form above.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

