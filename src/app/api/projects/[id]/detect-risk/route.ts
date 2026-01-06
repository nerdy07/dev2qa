import { NextRequest, NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getServerEnv } from '@/lib/env-validation';
import { sendEmail } from '@/lib/email';
import { getProjectRiskAlertTemplate } from '@/lib/email-templates';
import { getAbsoluteUrl } from '@/lib/email-template';
import { requireAuth } from '@/lib/auth-middleware';
import type { Project, Task, CertificateRequest, User } from '@/lib/types';

interface RiskDetectionResult {
  userId: string;
  userName: string;
  userEmail: string;
  riskType: 'requester' | 'developer';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  reasons: string[];
}

/**
 * Calculate risk score for a user based on various metrics
 */
async function calculateUserRisk(
  userId: string,
  user: User,
  project: Project,
  allTasks: Task[],
  allRequests: CertificateRequest[]
): Promise<RiskDetectionResult | null> {
  const userTasks = allTasks.filter(t => t.assigneeId === userId);
  const userRequests = allRequests.filter(r => r.requesterId === userId);
  
  let riskScore = 0;
  const reasons: string[] = [];

  // Check task completion rate
  if (userTasks.length > 0) {
    const completedTasks = userTasks.filter(t => t.status === 'Done').length;
    const completionRate = completedTasks / userTasks.length;
    
    if (completionRate < 0.5) {
      riskScore += 30;
      reasons.push(`Low task completion rate (${Math.round(completionRate * 100)}%)`);
    } else if (completionRate < 0.7) {
      riskScore += 15;
      reasons.push(`Moderate task completion rate (${Math.round(completionRate * 100)}%)`);
    }
  }

  // Check overdue tasks
  const now = new Date();
  const overdueTasks = userTasks.filter(task => {
    if (!task.endDate) return false;
    const endDate = task.endDate.toDate ? task.endDate.toDate() : new Date(task.endDate);
    return endDate < now && task.status !== 'Done';
  });

  if (overdueTasks.length > 0) {
    riskScore += overdueTasks.length * 10;
    reasons.push(`${overdueTasks.length} overdue task(s)`);
  }

  // Check request rejection rate
  if (userRequests.length > 0) {
    const rejectedRequests = userRequests.filter(r => r.status === 'rejected').length;
    const rejectionRate = rejectedRequests / userRequests.length;
    
    if (rejectionRate > 0.3) {
      riskScore += 25;
      reasons.push(`High request rejection rate (${Math.round(rejectionRate * 100)}%)`);
    }
  }

  // Check if user has many in-progress tasks (potential bottleneck)
  const inProgressTasks = userTasks.filter(t => t.status === 'In Progress').length;
  if (inProgressTasks > 5) {
    riskScore += 20;
    reasons.push(`High number of in-progress tasks (${inProgressTasks})`);
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';

  // Only return if there's a significant risk
  if (riskScore < 20) return null;

  // Determine risk type based on user's role/activity
  const riskType: 'requester' | 'developer' = userRequests.length > userTasks.length ? 'requester' : 'developer';

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    riskType,
    riskLevel,
    riskScore,
    reasons,
  };
}

/**
 * POST /api/projects/[id]/detect-risk
 * Detects risks in a project and sends alerts to team members
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (authRequest, ctx) => {
    try {
      const params = await ctx.params;
      const { id: projectId } = params;
      const { userId, forceCheck } = await authRequest.json();

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

      // Get all tasks from project milestones
      const allTasks: Task[] = [];
      if (project.milestones) {
        project.milestones.forEach(milestone => {
          if (milestone.tasks) {
            allTasks.push(...milestone.tasks);
          }
        });
      }

      // Get all certificate requests
      const requestsSnapshot = await db.collection('requests').get();
      const allRequests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CertificateRequest[];

      // Get all users
      const usersSnapshot = await db.collection('users').get();
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

    // Get team members for this project
    const projectTeamMembers = allUsers.filter(user => {
      // Check if user is assigned to any task in the project
      return allTasks.some(task => task.assigneeId === user.id) ||
             // Or if user is the project lead
             project.leadId === user.id;
    });

    // Detect risks
    const risks: RiskDetectionResult[] = [];
    
    // If userId is provided, check only that user
    if (userId) {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        const risk = await calculateUserRisk(userId, user, project, allTasks, allRequests);
        if (risk) risks.push(risk);
      }
    } else {
      // Check all team members
      for (const user of projectTeamMembers) {
        const risk = await calculateUserRisk(user.id, user, project, allTasks, allRequests);
        if (risk) risks.push(risk);
      }
    }

    // If no risks found and not forced, return early
    if (risks.length === 0 && !forceCheck) {
      return NextResponse.json({
        success: true,
        risks: [],
        message: 'No risks detected',
      });
    }

    // Send email alerts for each risk
    const emailResults = [];
    for (const risk of risks) {
      // Get team member emails (excluding the at-risk user)
      const teamEmails = projectTeamMembers
        .filter(member => member.id !== risk.userId && member.email)
        .map(member => member.email!);

      if (teamEmails.length === 0) continue;

      // Generate risk description
      const riskDescription = risk.reasons.join('. ') || 
        `User ${risk.userName} has been identified as a ${risk.riskLevel} risk to the project.`;

      // Generate impact description
      const impactDescription = risk.riskType === 'requester'
        ? `This may affect project timelines and quality standards. The team should review ${risk.userName}'s requests and provide additional support if needed.`
        : `This may cause delays in milestone completion and impact overall project delivery. Consider reassigning tasks or providing additional resources.`;

      // Send email to each team member
      for (const email of teamEmails) {
        try {
          const emailHtml = getProjectRiskAlertTemplate({
            projectName: project.name,
            riskUser: risk.userName,
            riskType: risk.riskType,
            riskLevel: risk.riskLevel,
            riskDescription,
            impactDescription,
            teamMembers: projectTeamMembers.map(m => m.name),
          });

          await sendEmail({
            to: email,
            subject: `⚠️ Project Risk Alert: ${risk.userName} - ${project.name}`,
            html: emailHtml,
          });

          emailResults.push({ email, success: true });
        } catch (error) {
          console.error(`Failed to send risk alert to ${email}:`, error);
          emailResults.push({ email, success: false, error: String(error) });
        }
      }
    }

      return NextResponse.json({
        success: true,
        risks: risks.map(r => ({
          userId: r.userId,
          userName: r.userName,
          riskType: r.riskType,
          riskLevel: r.riskLevel,
          riskScore: r.riskScore,
          reasons: r.reasons,
        })),
        emailsSent: emailResults.filter(r => r.success).length,
        emailResults,
      });
    } catch (error) {
      console.error('Error detecting project risks:', error);
      return NextResponse.json(
        { error: 'Failed to detect risks', details: String(error) },
        { status: 500 }
      );
    }
  })(request, context);
}
