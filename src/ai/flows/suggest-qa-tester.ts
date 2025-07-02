// This is an AI-powered function to suggest the most relevant QA tester for a given certificate request.
'use server';

/**
 * @fileOverview Suggests the most relevant QA tester for a certificate request.
 *
 * - suggestQATester - A function that suggests a QA tester.
 * - SuggestQATesterInput - The input type for the suggestQATester function.
 * - SuggestQATesterOutput - The return type for the suggestQATester function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QATesterExpertiseSchema = z.object({
  name: z.string().describe('The name of the QA tester.'),
  expertise: z.string().optional().describe("A description of the QA tester's skills and experience."),
});

const SuggestQATesterInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task for which a certificate is requested.'),
  taskDescription: z.string().describe('A brief description of the task.'),
  associatedTeam: z.string().describe('The team associated with the task.'),
  associatedProject: z.string().describe('The project associated with the task.'),
  qaTesterList: z.array(QATesterExpertiseSchema).describe('A list of available QA testers and their expertise.'),
});
export type SuggestQATesterInput = z.infer<typeof SuggestQATesterInputSchema>;

const SuggestQATesterOutputSchema = z.object({
  suggestedQATester: z.string().describe('The name of the suggested QA tester.'),
  reason: z.string().describe('The reason for suggesting this QA tester.'),
});
export type SuggestQATesterOutput = z.infer<typeof SuggestQATesterOutputSchema>;

export async function suggestQATester(input: SuggestQATesterInput): Promise<SuggestQATesterOutput> {
  return suggestQATesterFlow(input);
}

const suggestQATesterPrompt = ai.definePrompt({
  name: 'suggestQATesterPrompt',
  input: {schema: SuggestQATesterInputSchema},
  output: {schema: SuggestQATesterOutputSchema},
  prompt: `Given the following task details and a list of QA testers with their expertise, suggest the most relevant QA tester to review the certificate request.

Task Title: {{{taskTitle}}}
Task Description: {{{taskDescription}}}
Associated Team: {{{associatedTeam}}}
Associated Project: {{{associatedProject}}}

Available QA Testers and their expertise:
{{#each qaTesterList}}
- Tester: {{{this.name}}}
  Expertise: {{#if this.expertise}}{{{this.expertise}}}{{else}}Not specified{{/if}}
{{/each}}

Analyze the task details and match them against each QA tester's expertise to determine the best fit. For example, if the task is about a 'UI bug on Android', a tester with 'Mobile (iOS/Android)' expertise would be a great match.

Output the suggested QA tester and a brief reason for the suggestion.

Ensure the suggestedQATester value is one of the names from the provided list.
`,
});

const suggestQATesterFlow = ai.defineFlow(
  {
    name: 'suggestQATesterFlow',
    inputSchema: SuggestQATesterInputSchema,
    outputSchema: SuggestQATesterOutputSchema,
  },
  async input => {
    const {output} = await suggestQATesterPrompt(input);
    return output!;
  }
);
