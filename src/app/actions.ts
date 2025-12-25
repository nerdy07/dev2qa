'use server';

import { suggestQATester, type SuggestQATesterInput, type SuggestQATesterOutput } from '@/ai/flows/suggest-qa-tester';
import { diagnoseProjects, type DiagnoseProjectsInput, type DiagnoseProjectsOutput } from '@/ai/flows/diagnose-projects-flow';
import { planTasksTimeline, type PlanTasksTimelineInput, type PlanTasksTimelineOutput } from '@/ai/flows/plan-tasks-timeline-flow';
import { diagnoseExpenses, type DiagnoseExpensesInput, type DiagnoseExpensesOutput } from '@/ai/flows/diagnose-expenses-flow';
import { diagnoseUsers, type DiagnoseUsersInput, type DiagnoseUsersOutput } from '@/ai/flows/diagnose-users-flow';

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

export async function getTaskTimelines(input: PlanTasksTimelineInput): Promise<{success: true, data: PlanTasksTimelineOutput} | {success: false, error: string}> {
  try {
    const result = await planTasksTimeline(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI timeline planning failed:', error);
    return { success: false, error: (error as Error).message || 'An unknown error occurred during AI planning.' };
  }
}

export async function getExpenseDiagnoses(input: DiagnoseExpensesInput): Promise<{success: true, data: DiagnoseExpensesOutput} | {success: false, error: string}> {
  try {
    const result = await diagnoseExpenses(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI expense diagnosis failed:', error);
    return { success: false, error: (error as Error).message || 'An unknown error occurred during expense diagnosis.' };
  }
}

export async function getUserDiagnoses(input: DiagnoseUsersInput): Promise<{success: true, data: DiagnoseUsersOutput} | {success: false, error: string}> {
  try {
    const result = await diagnoseUsers(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI user diagnosis failed:', error);
    return { success: false, error: (error as Error).message || 'An unknown error occurred during user diagnosis.' };
  }
}
