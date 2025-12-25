'use client';

import React from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Users, UserPlus, Settings } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, User } from '@/lib/types';
import { TeamForm } from '@/components/admin/team-form';
import { TeamDetails } from '@/components/admin/team-details';
import { TeamMembersDialog } from '@/components/admin/team-members-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/hooks/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { ProtectedRoute } from '@/components/common/protected-route';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationWrapper } from '@/components/common/pagination-wrapper';

type ActionType = 'delete' | 'edit' | 'view';

function TeamsTable() {
  const { data: teams, loading, error, setData } = useCollection<Team>('teams');
  const { data: users } = useCollection<User>('users');
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | undefined>(undefined);
  const [actionToConfirm, setActionToConfirm] = React.useState<ActionType | null>(null);
  const { toast } = useToast();

  // Pagination
  const {
    currentPage,
    totalPages,
    currentData: paginatedTeams,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
  } = usePagination({
    data: teams || [],
    itemsPerPage: 20,
    initialPage: 1,
  });

  const handleDelete = async (team: Team) => {
    try {
      await deleteDoc(doc(db!, 'teams', team.id));
      setData(teams?.filter(t => t.id !== team.id) || []);
      toast({
        title: "Team deleted",
        description: `Team "${team.name}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAction = (team: Team, action: ActionType) => {
    setSelectedTeam(team);
    setActionToConfirm(action);
    
    if (action === 'delete') {
      setIsAlertOpen(true);
    } else if (action === 'edit') {
      setIsFormOpen(true);
    } else if (action === 'view') {
      setIsDetailsOpen(true);
    }
  };

  const handleManageMembers = (team: Team) => {
    setSelectedTeam(team);
    setIsMembersDialogOpen(true);
  };

  const getTeamMembers = (teamId: string) => {
    return users?.filter(user => user.teamId === teamId) || [];
  };

  const getTeamLead = (teamId: string) => {
    return users?.find(user => user.teamId === teamId && user.role === 'team_lead');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[160px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Teams</AlertTitle>
        <AlertDescription>
          {error.message || 'Failed to load teams. Please try again.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Teams</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage teams and their members.
            </p>
          </div>
          {hasPermission(ALL_PERMISSIONS.TEAMS.CREATE) && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedTeam ? 'Edit Team' : 'Create New Team'}
                  </DialogTitle>
                </DialogHeader>
                <TeamForm
                  team={selectedTeam}
                  onSuccess={() => {
                    setIsFormOpen(false);
                    setSelectedTeam(undefined);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {teams && teams.length > 0 ? (
            <>
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
                <TableBody>
                  {paginatedTeams.map((team) => {
                    const members = getTeamMembers(team.id);
                    const teamLead = getTeamLead(team.id);
                    
                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{team.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {team.department || 'No department'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate">
                            {team.description || 'No description'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {teamLead ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {teamLead.name?.charAt(0) || 'U'}
                                </span>
                              </div>
                              <span className="text-sm">{teamLead.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No team lead</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Badge variant="secondary">
                              {members.length} member{members.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={team.status === 'active' ? 'default' : 'secondary'}
                          >
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
                              <DropdownMenuItem
                                onClick={() => handleAction(team, 'view')}
                              >
                                View Details
                              </DropdownMenuItem>
                              {hasPermission(ALL_PERMISSIONS.TEAMS.UPDATE) && (
                                <DropdownMenuItem
                                  onClick={() => handleAction(team, 'edit')}
                                >
                                  Edit Team
                                </DropdownMenuItem>
                              )}
                              {hasPermission(ALL_PERMISSIONS.TEAMS.UPDATE) && (
                                <DropdownMenuItem
                                  onClick={() => handleManageMembers(team)}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Manage Members
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {hasPermission(ALL_PERMISSIONS.TEAMS.DELETE) && (
                                <DropdownMenuItem
                                  onClick={() => handleAction(team, 'delete')}
                                  className="text-destructive"
                                >
                                  Delete Team
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <PaginationWrapper
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={teams.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No teams</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new team.
              </p>
              {hasPermission(ALL_PERMISSIONS.TEAMS.CREATE) && (
                <div className="mt-6">
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Team
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
          </DialogHeader>
          {selectedTeam && (
            <TeamDetails
              team={selectedTeam}
              onEdit={() => {
                setIsDetailsOpen(false);
                setIsFormOpen(true);
              }}
              onDelete={() => {
                setIsDetailsOpen(false);
                setIsAlertOpen(true);
              }}
              onClose={() => {
                setIsDetailsOpen(false);
                setSelectedTeam(undefined);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Team Members Dialog */}
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
              This action cannot be undone. This will permanently delete the team
              "{selectedTeam?.name}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTeam) {
                  handleDelete(selectedTeam);
                }
                setIsAlertOpen(false);
                setSelectedTeam(undefined);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function TeamsPage() {
  return (
    <ProtectedRoute 
      permission={ALL_PERMISSIONS.TEAMS.READ}
    >
      <PageHeader
        title="Team Management"
        description="Manage teams, assign members, and track team performance."
      />
      <TeamsTable />
    </ProtectedRoute>
  );
}
