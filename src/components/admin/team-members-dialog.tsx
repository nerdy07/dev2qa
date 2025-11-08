'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Plus } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import { User, Team } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMembersDialogProps {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMembersDialog({ team, open, onOpenChange }: TeamMembersDialogProps) {
  const { toast } = useToast();
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [isAdding, setIsAdding] = React.useState(false);

  // Get current team members
  const teamMembers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.teamId === team.id);
  }, [users, team.id]);

  // Get available users (not in this team or any team)
  const availableUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => !u.teamId || u.teamId === team.id);
  }, [users, team.id]);

  const handleAddMember = async () => {
    if (!selectedUserId || !db) return;

    const userToAdd = users?.find(u => u.id === selectedUserId);
    if (!userToAdd) return;

    setIsAdding(true);
    try {
      const userRef = doc(db, 'users', selectedUserId);
      await updateDoc(userRef, { teamId: team.id });
      
      toast({
        title: 'Member Added',
        description: `${userToAdd.name} has been added to ${team.name}.`,
      });
      
      setSelectedUserId('');
    } catch (error) {
      const err = error as Error;
      console.error('Error adding team member:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to add team member.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!db) return;

    const userToRemove = users?.find(u => u.id === userId);
    if (!userToRemove) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { teamId: null });
      
      toast({
        title: 'Member Removed',
        description: `${userToRemove.name} has been removed from ${team.name}.`,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error removing team member:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove team member.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Team Members - {team.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add Member Section */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Add Team Member</h4>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter(u => !teamMembers.find(m => m.id === u.id))
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddMember} 
                disabled={!selectedUserId || isAdding}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Current Members */}
          <div>
            <h4 className="font-semibold mb-3">Team Members ({teamMembers.length})</h4>
            {usersLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : teamMembers.length === 0 ? (
              <Alert>
                <AlertDescription>No members in this team yet. Add members using the form above.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.photoURL} />
                        <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <Badge variant="secondary" className="mt-1">
                          {member.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



