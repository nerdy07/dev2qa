'use client';

import React from 'react';
import { Team, User, CertificateRequest, Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  User as UserIcon, 
  Calendar, 
  FileText, 
  FolderKanban,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2
} from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import { usePermissions } from '@/hooks/use-permissions';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { useToast } from '@/hooks/use-toast';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface TeamDetailsProps {
  team: Team;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export function TeamDetails({ team, onEdit, onDelete, onClose }: TeamDetailsProps) {
  const { data: users } = useCollection<User>('users');
  const { data: requests } = useCollection<CertificateRequest>('requests');
  const { data: projects } = useCollection<Project>('projects');
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const teamMembers = users?.filter(user => user.teamId === team.id) || [];
  const teamLead = users?.find(user => user.id === team.teamLeadId);
  const teamRequests = requests?.filter(r => 
    teamMembers.some(member => member.id === r.requesterId)
  ) || [];
  const teamProjects = projects?.filter(p => 
    teamMembers.some(member => member.id === p.assignedTo)
  ) || [];

  const approvedRequests = teamRequests.filter(r => r.status === 'approved').length;
  const pendingRequests = teamRequests.filter(r => r.status === 'pending').length;
  const approvalRate = teamRequests.length > 0 ? 
    Math.round((approvedRequests / teamRequests.length) * 100) : 0;

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db!, 'teams', team.id));
      toast({
        title: "Team deleted",
        description: `Team "${team.name}" has been deleted successfully.`,
      });
      onDelete?.();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{team.name}</CardTitle>
                <p className="text-muted-foreground">
                  {team.department || 'No department specified'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                {team.status || 'active'}
              </Badge>
              {hasPermission(ALL_PERMISSIONS.TEAMS.UPDATE) && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {hasPermission(ALL_PERMISSIONS.TEAMS.DELETE) && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {team.description && (
            <p className="text-muted-foreground mb-4">{team.description}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{teamMembers.length}</div>
              <p className="text-sm text-muted-foreground">Members</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{teamRequests.length}</div>
              <p className="text-sm text-muted-foreground">Requests</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{teamProjects.length}</div>
              <p className="text-sm text-muted-foreground">Projects</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{approvalRate}%</div>
              <p className="text-sm text-muted-foreground">Approval Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Lead */}
      {teamLead && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5" />
              <span>Team Lead</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {teamLead.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium">{teamLead.name}</p>
                <p className="text-sm text-muted-foreground">{teamLead.email}</p>
                <Badge variant="outline" className="mt-1">
                  {teamLead.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Members ({teamMembers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length > 0 ? (
            <div className="grid gap-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {member.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No members assigned to this team.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamRequests.length > 0 ? (
            <div className="space-y-3">
              {teamRequests
                .sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                  return dateB - dateA; // Most recent first
                })
                .slice(0, 5)
                .map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{request.taskTitle || 'Untitled Request'}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.createdAt ? (
                          typeof request.createdAt.toDate === 'function' 
                            ? format(request.createdAt.toDate(), 'MMM d, yyyy')
                            : format(new Date(request.createdAt), 'MMM d, yyyy')
                        ) : 'No date'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={request.status === 'approved' ? 'default' : 'secondary'}
                  >
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No recent activity for this team.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
