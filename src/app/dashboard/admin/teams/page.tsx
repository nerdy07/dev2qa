'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, TriangleAlert } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon } from 'lucide-react';
import type { Team, User } from '@/lib/types';
import { TeamForm } from '@/components/admin/team-form';
import { TeamMembersDialog } from '@/components/admin/team-members-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeamsPage() {
  const { data: teams, loading, error } = useCollection<Team>('teams');
  const { data: users } = useCollection<User>('users');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | undefined>(undefined);
  const { toast } = useToast();

  const getTeamLeadName = (teamLeadId?: string | null) => {
    // Handle null, undefined, or empty string
    if (!teamLeadId || teamLeadId === '' || !users || users.length === 0) {
      if (teamLeadId) {
        console.log('Team lead ID exists but users not loaded yet:', teamLeadId);
      }
      return 'No team lead';
    }
    
    // Debug: log the lookup
    console.log(`Looking up team lead with ID: "${teamLeadId}"`, {
      totalUsers: users.length,
      userIds: users.map(u => u.id).slice(0, 5) // First 5 user IDs for debugging
    });
    
    const teamLead = users.find(u => u.id === teamLeadId);
    if (!teamLead) {
      // Debug: log if we can't find the team lead
      console.warn(`Team lead with ID "${teamLeadId}" not found in users collection`, {
        availableUserIds: users.map(u => u.id),
        searchedId: teamLeadId
      });
      return 'No team lead';
    }
    return teamLead.name;
  };

  const getMemberCount = (teamId?: string) => {
    if (!teamId || !users) return 0;
    return users.filter(u => u.teamId === teamId).length;
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setIsFormOpen(true);
  };
  
  const handleManageMembers = (team: Team) => {
    setSelectedTeam(team);
    setIsMembersDialogOpen(true);
  };

  const handleDelete = (team: Team) => {
    setSelectedTeam(team);
    setIsAlertOpen(true);
  }
  
  const confirmDelete = async () => {
    if (selectedTeam) {
        try {
            await deleteDoc(doc(db!, 'teams', selectedTeam.id));
            toast({
                title: 'Team Deleted',
                description: `The team "${selectedTeam.name}" has been deleted.`,
            });
            // Close dialog on success - Firestore real-time listener will update the list automatically
            setIsAlertOpen(false);
            setSelectedTeam(undefined);
        } catch (e) {
            const error = e as Error;
            console.error("Error deleting team: ", error);
            toast({
                title: 'Error Deleting Team',
                description: error.message,
                variant: 'destructive',
            });
            // Keep dialog open on error so user can retry
        }
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedTeam(undefined);
  };

  const renderContent = () => {
    if (loading) {
        return (
            <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        );
    }

    if (error) {
        return (
          <TableBody>
            <TableRow>
              <TableCell colSpan={6}>
                  <Alert variant="destructive">
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Error Loading Teams</AlertTitle>
                      <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
              </TableCell>
            </TableRow>
          </TableBody>
        )
      }

    return (
        <TableBody>
            {teams?.map((team) => {
              // Debug: log team data to see what's being received
              if (team.teamLeadId) {
                console.log(`Team "${team.name}" has teamLeadId:`, team.teamLeadId);
              }
              
              return (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                      {team.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {team.description || '-'}
                  </TableCell>
                  <TableCell>
                    {getTeamLeadName(team.teamLeadId)}
                  </TableCell>
                  <TableCell>
                    {getMemberCount(team.id)} members
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.status === 'active' ? 'default' : team.status === 'inactive' ? 'secondary' : 'outline'}>
                      {team.status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(team)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageMembers(team)}>
                          <UsersIcon className="mr-2 h-4 w-4" />
                          <span>Manage Members</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(team)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
    )
  }

  return (
    <>
      <PageHeader
        title="Team Management"
        description="Manage teams, assign members, and track team performance."
      >
        <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) {
              setSelectedTeam(undefined);
              setIsFormOpen(false);
            }
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            </DialogHeader>
            <TeamForm 
                team={selectedTeam}
                onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Manage teams and their members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {renderContent()}
          </Table>
        </CardContent>
      </Card>

      {selectedTeam && (
        <TeamMembersDialog
          team={selectedTeam}
          open={isMembersDialogOpen}
          onOpenChange={(open) => {
            setIsMembersDialogOpen(open);
            if (!open) setSelectedTeam(undefined);
          }}
        />
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the team: <span className="font-semibold">{selectedTeam?.name}</span>.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSelectedTeam(undefined)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
