'use server';

import { suggestQATester, type SuggestQATesterInput, type SuggestQATesterOutput } from '@/ai/flows/suggest-qa-tester';
import { diagnoseProjects, type DiagnoseProjectsInput, type DiagnoseProjectsOutput } from '@/ai/flows/diagnose-projects-flow';

export async function getQATesterSuggestion(input: SuggestQATesterInput): Promise<{success: true, data: SuggestQATesterOutput} | {success: false, error: string}> {
  try {
    const result = await suggestQATester(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI suggestion failed:', error);
    return { success: false, error: (error as Error).message || 'An unknown error occurred during AI suggestion.' };
  }
}

export async function getProjectDiagnoses(input: DiagnoseProjectsInput): Promise<{success: true, data: DiagnoseProjectsOutput} | {success: false, error: string}> {
    try {
      const result = await diagnoseProjects(input);
      return { success: true, data: result };
    } catch (error) {
      console.error('AI diagnosis failed:', error);
      return { success: false, error: (error as Error).message || 'An unknown error occurred during AI diagnosis.' };
    }
}
