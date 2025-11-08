'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  onComplete: (links: string[]) => void;
  existingLinks?: string[];
}

export function TaskCompletionDialog({
  open,
  onOpenChange,
  taskName,
  onComplete,
  existingLinks = [],
}: TaskCompletionDialogProps) {
  const [links, setLinks] = React.useState<string[]>([]);
  const [currentLink, setCurrentLink] = React.useState('');
  const [error, setError] = React.useState('');

  // Use a ref to track previous open state and capture existingLinks only when opening
  const prevOpenRef = React.useRef(false);

  React.useEffect(() => {
    // Only update when transitioning from closed to open
    if (open && !prevOpenRef.current) {
      // Dialog just opened - initialize with existingLinks
      setLinks(existingLinks || []);
      setCurrentLink('');
      setError('');
    } else if (!open && prevOpenRef.current) {
      // Dialog just closed - reset state
      setLinks([]);
      setCurrentLink('');
      setError('');
    }
    prevOpenRef.current = open;
  }, [open, existingLinks]); // Include existingLinks but only use when opening

  const addLink = () => {
    const trimmedLink = currentLink.trim();
    if (!trimmedLink) {
      setError('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedLink);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    if (links.includes(trimmedLink)) {
      setError('This link has already been added');
      return;
    }

    setLinks([...links, trimmedLink]);
    setCurrentLink('');
    setError('');
  };

  const removeLink = (linkToRemove: string) => {
    setLinks(links.filter(link => link !== linkToRemove));
  };

  const handleComplete = () => {
    onComplete(links);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mark Task as Done</DialogTitle>
          <DialogDescription>
            Add links or references for QA testing to help them easily verify "{taskName}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="link-input">Test Links / References (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="link-input"
                type="url"
                placeholder="https://example.com/page or any reference link"
                value={currentLink}
                onChange={(e) => {
                  setCurrentLink(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
              />
              <Button type="button" onClick={addLink} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Add deployment links, documentation, or any references that will help QA test the completed task.
            </p>
          </div>

          {links.length > 0 && (
            <div className="space-y-2">
              <Label>Added Links ({links.length})</Label>
              <div className="flex flex-wrap gap-2">
                {links.map((link, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 pr-1">
                    <LinkIcon className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">{link}</span>
                    <button
                      type="button"
                      onClick={() => removeLink(link)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>
            Complete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

