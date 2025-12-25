'use server';
/**
 * @fileOverview Analyzes expense data to diagnose financial patterns and anomalies.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSummarySchema = z.object({
  id: z.string(),
  type: z.enum(['expense', 'income']),
  category: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  description: z.string(),
  projectName: z.string().optional(),
});

const DiagnoseExpensesInputSchema = z.object({
  transactions: z.array(TransactionSummarySchema),
  timeframe: z.string().optional(),
});
export type DiagnoseExpensesInput = z.infer<typeof DiagnoseExpensesInputSchema>;

const ExpenseDiagnosisSchema = z.object({
  category: z.string().describe('The category or area of concern identified.'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The assessed risk level for this expense pattern.'),
  diagnosis: z.string().describe('A concise summary of the expense pattern or anomaly identified.'),
  recommendation: z.string().describe('A concrete, actionable recommendation to address the expense concern.'),
  metrics: z.object({
    totalAmount: z.number().optional(),
    trend: z.string().optional(),
    percentageOfTotal: z.number().optional(),
  }).optional(),
});
const DiagnoseExpensesOutputSchema = z.object({
  diagnoses: z.array(ExpenseDiagnosisSchema),
  summary: z.object({
    totalExpenses: z.number(),
    totalIncome: z.number(),
    netBalance: z.number(),
    expenseCategories: z.array(z.object({
      category: z.string(),
      total: z.number(),
      count: z.number(),
    })),
    peakSpendingMonth: z.string().optional(),
    trends: z.array(z.string()),
  }),
});
export type DiagnoseExpensesOutput = z.infer<typeof DiagnoseExpensesOutputSchema>;

export async function diagnoseExpenses(input: DiagnoseExpensesInput): Promise<DiagnoseExpensesOutput> {
  return diagnoseExpensesFlow(input);
}

const diagnoseExpensesPrompt = ai.definePrompt({
  name: 'diagnoseExpensesPrompt',
  input: {schema: DiagnoseExpensesInputSchema},
  output: {schema: DiagnoseExpensesOutputSchema},
  prompt: `You are an expert financial analyst. Your task is to analyze expense and income transactions to identify patterns, anomalies, and potential financial risks.

Analyze the provided transaction data. Consider:
- Spending patterns by category (are certain categories growing unexpectedly?)
- Income vs expense ratios (is the company spending more than it earns?)
- Unusual spikes in spending (sudden increases in specific categories)
- Recurring expenses that might be unnecessary
- Category distribution (is spending too concentrated in one area?)
- Trends over time (increasing or decreasing patterns)
- Project-related expenses (are client payments aligned with project expenses?)

Calculate summary metrics:
- Total expenses and income
- Net balance (income - expenses)
- Breakdown by category with totals and counts
- Peak spending month
- Key trends observed

Identify only expense patterns that represent a 'Medium' or higher risk level. For each identified issue, provide:
- The category or area of concern
- Risk level assessment
- A clear diagnosis of the problem
- Actionable recommendations
- Relevant metrics if applicable

Example Diagnosis:
- Category: "Software Subscriptions"
- Issue: Software subscription costs have increased 200% in the last 3 months
- Output:
  - category: "Software Subscriptions"
  - riskLevel: "High"
  - diagnosis: "Software subscription expenses have tripled in recent months, indicating potential subscription sprawl or lack of cost control."
  - recommendation: "Conduct an audit of all active subscriptions, identify unused or duplicate services, and implement a subscription approval process for new services."
  - metrics: { totalAmount: 45000, trend: "increasing", percentageOfTotal: 35 }

Transaction Data:
{{#each transactions}}
- Type: {{{this.type}}}, Category: {{{this.category}}}, Amount: {{{this.amount}}} {{{this.currency}}}, Date: {{{this.date}}}, Description: {{{this.description}}}{{#if this.projectName}}, Project: {{{this.projectName}}}{{/if}}
{{/each}}

Generate your analysis now. Focus on actionable insights and risk mitigation.
`,
});

const diagnoseExpensesFlow = ai.defineFlow(
  {
    name: 'diagnoseExpensesFlow',
    inputSchema: DiagnoseExpensesInputSchema,
    outputSchema: DiagnoseExpensesOutputSchema,
  },
  async input => {
    const {output} = await diagnoseExpensesPrompt(input);
    return output!;
  }
);

