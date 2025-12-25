'use server';
/**
 * @fileOverview An AI flow to automatically plan task timelines within a milestone.
 *
 * - planTasksTimeline - A function that distributes a milestone's timeline across its tasks.
 * - PlanTasksTimelineInput - The input type for the function.
 * - PlanTasksTimelineOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskInputSchema = z.object({
  id: z.string().describe('The unique identifier for the task.'),
  description: z.string().describe('The description of the work to be done for the task.'),
});

const PlanTasksTimelineInputSchema = z.object({
  milestoneStartDate: z.string().describe("The ISO 8601 string for the milestone's start date."),
  milestoneEndDate: z.string().describe("The ISO 8601 string for the milestone's end date."),
  tasks: z.array(TaskInputSchema).describe('The list of tasks that need to be scheduled within the milestone.'),
});
export type PlanTasksTimelineInput = z.infer<typeof PlanTasksTimelineInputSchema>;

const TaskTimelineSchema = z.object({
  id: z.string().describe('The unique identifier for the task.'),
  startDate: z.string().describe("The calculated ISO 8601 string for the task's start date."),
  endDate: z.string().describe("The calculated ISO 8601 string for the task's end date."),
});

const PlanTasksTimelineOutputSchema = z.object({
  tasks: z.array(TaskTimelineSchema),
});
export type PlanTasksTimelineOutput = z.infer<typeof PlanTasksTimelineOutputSchema>;


export async function planTasksTimeline(input: PlanTasksTimelineInput): Promise<PlanTasksTimelineOutput> {
  return planTasksTimelineFlow(input);
}


const planTasksTimelinePrompt = ai.definePrompt({
  name: 'planTasksTimelinePrompt',
  input: {schema: PlanTasksTimelineInputSchema},
  output: {schema: PlanTasksTimelineOutputSchema},
  prompt: `You are an expert project manager responsible for planning and scheduling software development tasks.

You have been given a milestone with a defined start and end date, and a list of tasks that must be completed within that milestone.

Your job is to analyze the tasks and intelligently distribute the milestone's total duration among them. Consider the description of each task to estimate its relative complexity and duration. Simple tasks might take a day, while complex ones might take several.

The schedule should be logical. Tasks can be sequential or overlap where it makes sense, but all tasks must be scheduled strictly within the milestone's start and end dates.

Milestone Start Date: {{{milestoneStartDate}}}
Milestone End Date: {{{milestoneEndDate}}}

Tasks to schedule:
{{#each tasks}}
- Task ID: {{{this.id}}}
  Description: {{{this.description}}}
{{/each}}

Based on your analysis, generate a timeline for each task. Provide the start and end date for each task in ISO 8601 format (YYYY-MM-DD). Ensure the output is a valid JSON object matching the required schema.
`,
});

const planTasksTimelineFlow = ai.defineFlow(
  {
    name: 'planTasksTimelineFlow',
    inputSchema: PlanTasksTimelineInputSchema,
    outputSchema: PlanTasksTimelineOutputSchema,
  },
  async input => {
    const {output} = await planTasksTimelinePrompt(input);
    return output!;
  }
);
