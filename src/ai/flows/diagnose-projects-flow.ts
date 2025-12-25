'use server';
/**
 * @fileOverview Analyzes project data to diagnose potential risks.
 *
 * - diagnoseProjects - A function that runs the project diagnosis.
 * - DiagnoseProjectsInput - The input type for the diagnosis function.
 * - DiagnoseProjectsOutput - The return type for the diagnosis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RequestSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  taskTitle: z.string(),
});

const ProjectDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadName: z.string().optional(),
  requests: z.array(RequestSummarySchema),
});

const DiagnoseProjectsInputSchema = z.object({
  projects: z.array(ProjectDataSchema),
});
export type DiagnoseProjectsInput = z.infer<typeof DiagnoseProjectsInputSchema>;

const DiagnosisSchema = z.object({
  projectId: z.string().describe('The ID of the project being diagnosed.'),
  projectName: z.string().describe('The name of the project being diagnosed.'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The assessed risk level for the project.'),
  diagnosis: z.string().describe('A concise, one-sentence summary of the main issue or risk.'),
  recommendation: z.string().describe('A concrete, actionable recommendation to mitigate the identified risk.'),
});

const DiagnoseProjectsOutputSchema = z.object({
  diagnoses: z.array(DiagnosisSchema),
});
export type DiagnoseProjectsOutput = z.infer<typeof DiagnoseProjectsOutputSchema>;


export async function diagnoseProjects(input: DiagnoseProjectsInput): Promise<DiagnoseProjectsOutput> {
  return diagnoseProjectsFlow(input);
}


const diagnoseProjectsPrompt = ai.definePrompt({
  name: 'diagnoseProjectsPrompt',
  input: {schema: DiagnoseProjectsInputSchema},
  output: {schema: DiagnoseProjectsOutputSchema},
  prompt: `You are an expert project management and delivery analyst. Your task is to analyze a list of software development projects and identify potential risks that could lead to delays or failure.

Analyze the provided list of projects. For each project, consider the following:
- Its current status ('In Progress', 'On Hold').
- The start and end dates. Is the deadline approaching?
- The associated certificate (QA) requests. A high number of 'rejected' requests is a major red flag. A lack of requests for a project that's 'In Progress' could also be a risk.
- The project lead. Consistent issues across projects with the same lead might indicate an overloaded or struggling manager.

Based on your analysis, generate a diagnosis for each project that you identify as having a potential risk. If a project seems healthy, do not include it in the output.

For each identified risk, determine a 'riskLevel' and provide a concise 'diagnosis' and an actionable 'recommendation'.

Example Diagnosis:
- Project: "Mobile App Refactor"
- Issue: Deadline is in one week, but there are 5 rejected QA requests and only 1 approved request.
- Output:
  - projectId: "proj_123"
  - projectName: "Mobile App Refactor"
  - riskLevel: "High"
  - diagnosis: "A high rate of QA rejection close to the deadline suggests significant quality issues."
  - recommendation: "Project lead should immediately pause new feature work and conduct a root cause analysis of the QA failures with the development team."

Here is the project data to analyze:
{{#each projects}}
- Project ID: {{{this.id}}}
- Project Name: {{{this.name}}}
- Status: {{{this.status}}}
- Start Date: {{{this.startDate}}}
- End Date: {{{this.endDate}}}
- Project Lead: {{{this.leadName}}}
- Associated QA Requests:
  {{#if this.requests}}
    {{#each this.requests}}
    - Request: {{{this.taskTitle}}}, Status: {{{this.status}}}
    {{/each}}
  {{else}}
    - None
  {{/if}}

{{/each}}

Generate your diagnosis now. Only include projects that you assess to have a 'Medium' or higher risk level.
`,
});

const diagnoseProjectsFlow = ai.defineFlow(
  {
    name: 'diagnoseProjectsFlow',
    inputSchema: DiagnoseProjectsInputSchema,
    outputSchema: DiagnoseProjectsOutputSchema,
  },
  async input => {
    const {output} = await diagnoseProjectsPrompt(input);
    return output!;
  }
);
