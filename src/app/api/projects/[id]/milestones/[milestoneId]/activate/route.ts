import { NextRequest, NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getServerEnv } from '@/lib/env-validation';
import { sendEmail } from '@/lib/email';
import { getSprintActivationTemplate } from '@/lib/email-templates';
import { notifyOnTaskAssignment } from '@/app/requests/actions';
import { requireAuth } from '@/lib/auth-middleware';
import type { Project, Milestone, User } from '@/lib/types';

/**
 * POST /api/projects/[id]/milestones/[milestoneId]/activate
 * Activates a milestone as a sprint and sends notifications
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; milestoneId: string }> }
) {
  return requireAuth(async (authRequest, ctx) => {
    try {
      const params = await ctx.params;
      const { id: projectId, milestoneId } = params;
      const { activatedBy } = await authRequest.json();

      // Initialize Firebase Admin
      const app = await initializeAdminApp();
      const db = getFirestore(app);

      // Get project
      const projectDoc = await db.collection('projects').doc(projectId).get();
      if (!projectDoc.exists) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const project = { id: projectDoc.id, ...projectDoc.data() } as Project;

      // Find the milestone
      const milestone = project.milestones?.find(m => m.id === milestoneId);
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found' },
          { status: 404 }
        );
      }

      // Check if already active
      if (milestone.isActive) {
        return NextResponse.json(
          { error: 'Milestone is already active' },
          { status: 400 }
        );
      }

      // Deactivate other active milestones in the project
      const updatedMilestones = project.milestones?.map(m => {
        if (m.id === milestoneId) {
          return {
            ...m,
            isActive: true,
            activatedAt: Timestamp.now(),
            activatedBy: activatedBy || null,
          };
        } else if (m.isActive) {
          // Deactivate other active milestones
          return {
            ...m,
            isActive: false,
          };
        }
        return m;
      }) || [];

      // Update project
      await db.collection('projects').doc(projectId).update({
        milestones: updatedMilestones,
        updatedAt: Timestamp.now(),
      });

      // Get updated milestone
      const activatedMilestone = updatedMilestones.find(m => m.id === milestoneId)!;

      // Get all users for email notifications
      const usersSnapshot = await db.collection('users').get();
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      // Get team members (project lead + task assignees)
      const teamMemberIds = new Set<string>();
      if (project.leadId) teamMemberIds.add(project.leadId);
      
      activatedMilestone.tasks?.forEach(task => {
        if (task.assigneeId) teamMemberIds.add(task.assigneeId);
      });

      const teamMembers = allUsers.filter(u => teamMemberIds.has(u.id));
      const activatedByUser = allUsers.find(u => u.id === activatedBy);

      // Send sprint activation notification to team members
      const emailResults = [];
      for (const member of teamMembers) {
        if (!member.email) continue;

        try {
          const emailHtml = getSprintActivationTemplate({
            projectName: project.name,
            sprintName: activatedMilestone.name,
            activatedBy: activatedByUser?.name || 'System',
            startDate: activatedMilestone.startDate
              ? (activatedMilestone.startDate.toDate ? activatedMilestone.startDate.toDate().toLocaleDateString() : new Date(activatedMilestone.startDate).toLocaleDateString())
              : 'Not set',
            endDate: activatedMilestone.endDate
              ? (activatedMilestone.endDate.toDate ? activatedMilestone.endDate.toDate().toLocaleDateString() : new Date(activatedMilestone.endDate).toLocaleDateString())
              : 'Not set',
            taskCount: activatedMilestone.tasks?.length || 0,
          });

          await sendEmail({
            to: member.email,
            subject: `🚀 Sprint Activated: ${activatedMilestone.name} - ${project.name}`,
            html: emailHtml,
          });

          emailResults.push({ email: member.email, success: true });
        } catch (error) {
          console.error(`Failed to send sprint activation email to ${member.email}:`, error);
          emailResults.push({ email: member.email, success: false, error: String(error) });
        }
      }

      // Send task assignment emails for tasks in the activated sprint
      const taskAssignmentResults = [];
      for (const task of activatedMilestone.tasks || []) {
        if (task.assigneeId) {
          const assignee = allUsers.find(u => u.id === task.assigneeId);
          if (assignee?.email) {
            try {
              await notifyOnTaskAssignment({
                recipientEmail: assignee.email,
                assigneeName: assignee.name,
                taskName: task.name,
                milestoneName: activatedMilestone.name,
                projectName: project.name,
              });
              taskAssignmentResults.push({ taskId: task.id, email: assignee.email, success: true });
            } catch (error) {
              console.error(`Failed to send task assignment email for task ${task.id}:`, error);
              taskAssignmentResults.push({ taskId: task.id, email: assignee.email, success: false, error: String(error) });
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        milestone: {
          id: activatedMilestone.id,
          name: activatedMilestone.name,
          isActive: true,
          activatedAt: activatedMilestone.activatedAt,
          activatedBy: activatedMilestone.activatedBy,
        },
        emailsSent: emailResults.filter(r => r.success).length,
        taskEmailsSent: taskAssignmentResults.filter(r => r.success).length,
        emailResults,
        taskAssignmentResults,
      });
    } catch (error) {
      console.error('Error activating milestone:', error);
      return NextResponse.json(
        { error: 'Failed to activate milestone', details: String(error) },
        { status: 500 }
      );
    }
  })(request, context);
}
