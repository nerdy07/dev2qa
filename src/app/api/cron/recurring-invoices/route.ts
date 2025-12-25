import { NextRequest, NextResponse } from 'next/server';
import { generateRecurringInvoices } from '@/lib/recurring-invoices';

/**
 * Cron endpoint to generate recurring invoices
 * Should be called daily (e.g., via Vercel Cron or external cron service)
 * 
 * To set up Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/recurring-invoices",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateRecurringInvoices();

    return NextResponse.json({
      success: result.success,
      generated: result.generated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in recurring invoices cron:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

