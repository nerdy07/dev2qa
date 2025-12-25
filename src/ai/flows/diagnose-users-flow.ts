'use server';
/**
 * @fileOverview Analyzes user activity data to diagnose employee engagement and productivity patterns.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UserActivitySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  role: z.string(),
  email: z.string(),
  startDate: z.string().optional(),
  requestsCreated: z.number(),
  requestsApproved: z.number().optional(),
  commentsPosted: z.number(),
  certificatesEarned: z.number(),
  leaveRequests: z.number(),
  lastActivityDate: z.string().optional(),
  recentActivityCount: z.number().describe('Activity count in the last 30 days'),
});

const DiagnoseUsersInputSchema = z.object({
  users: z.array(UserActivitySchema),
  timeframe: z.string().optional(),
});
export type DiagnoseUsersInput = z.infer<typeof DiagnoseUsersInputSchema>;

const UserDiagnosisSchema = z.object({
  userId: z.string().describe('The ID of the user being diagnosed.'),
  userName: z.string().describe('The name of the user.'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The assessed risk level for this user.'),
  diagnosis: z.string().describe('A concise summary of the user activity pattern or concern.'),
  recommendation: z.string().describe('A concrete, actionable recommendation to address the user concern.'),
  metrics: z.object({
    activityScore: z.number().optional(),
    engagementLevel: z.string().optional(),
    peakActivityHours: z.string().optional(),
  }).optional(),
});
const DiagnoseUsersOutputSchema = z.object({
  diagnoses: z.array(UserDiagnosisSchema),
  summary: z.object({
    totalUsers: z.number(),
    activeUsers: z.number(),
    inactiveUsers: z.number(),
    peakActivityTime: z.string().optional(),
    averageActivityScore: z.number(),
    topPerformers: z.array(z.string()),
    engagementLevels: z.object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
  }),
});
export type DiagnoseUsersOutput = z.infer<typeof DiagnoseUsersOutputSchema>;

export async function diagnoseUsers(input: DiagnoseUsersInput): Promise<DiagnoseUsersOutput> {
  return diagnoseUsersFlow(input);
}

const diagnoseUsersPrompt = ai.definePrompt({
  name: 'diagnoseUsersPrompt',
  input: {schema: DiagnoseUsersInputSchema},
  output: {schema: DiagnoseUsersOutputSchema},
  prompt: `You are an expert HR and workforce analytics specialist. Your task is to analyze user activity data to identify engagement patterns, productivity concerns, and potential issues with employee activity.

Analyze the provided user data. Consider:
- Activity levels (requests created, comments posted, approvals made)
- Engagement patterns (users with very low or zero activity)
- Role-based expectations (QA testers should have approvals, requesters should create requests)
- Recent activity trends (users who were active but have become inactive)
- Time since last activity (users with no recent activity)
- Certificate earning patterns (indicator of productivity)
- Leave request patterns (potential burnout indicators)

Calculate summary metrics:
- Total users, active users (with activity in last 30 days), inactive users
- Average activity score across all users
- Top performers (users with highest activity)
- Engagement level distribution (high/medium/low)
- Peak activity time if available

Identify only users that represent a 'Medium' or higher risk level. For each identified concern, provide:
- User ID and name
- Risk level assessment
- A clear diagnosis of the issue
- Actionable recommendations
- Relevant metrics (activity score, engagement level, peak hours)

Example Diagnosis:
- User: "John Doe" (QA Tester)
- Issue: No approvals in the last 60 days despite being a QA tester
- Output:
  - userId: "user_123"
  - userName: "John Doe"
  - riskLevel: "High"
  - diagnosis: "QA tester has not approved any requests in 60 days, indicating potential disengagement or workload issues."
  - recommendation: "Schedule a one-on-one meeting to understand workload, identify blockers, and assess if additional training or resources are needed."
  - metrics: { activityScore: 15, engagementLevel: "low" }

User Activity Data:
{{#each users}}
- User: {{{this.userName}}} ({{{this.role}}})
- Email: {{{this.email}}}
- Start Date: {{{this.startDate}}}
- Requests Created: {{{this.requestsCreated}}}
- Requests Approved: {{{this.requestsApproved}}}
- Comments Posted: {{{this.commentsPosted}}}
- Certificates Earned: {{{this.certificatesEarned}}}
- Leave Requests: {{{this.leaveRequests}}}
- Last Activity: {{{this.lastActivityDate}}}
- Recent Activity (30 days): {{{this.recentActivityCount}}}
{{/each}}

Generate your analysis now. Focus on actionable insights for improving employee engagement and productivity.
`,
});

const diagnoseUsersFlow = ai.defineFlow(
  {
    name: 'diagnoseUsersFlow',
    inputSchema: DiagnoseUsersInputSchema,
    outputSchema: DiagnoseUsersOutputSchema,
  },
  async input => {
    const {output} = await diagnoseUsersPrompt(input);
    return output!;
  }
);

