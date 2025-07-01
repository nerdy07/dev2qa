'use server';

import { suggestQATester, type SuggestQATesterInput, type SuggestQATesterOutput } from '@/ai/flows/suggest-qa-tester';

export async function getQATesterSuggestion(input: SuggestQATesterInput): Promise<{success: true, data: SuggestQATesterOutput} | {success: false, error: string}> {
  try {
    const result = await suggestQATester(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI suggestion failed:', error);
    // In a real app, you might want to log this error more formally
    return { success: false, error: 'Failed to get an AI suggestion. Please try again.' };
  }
}
