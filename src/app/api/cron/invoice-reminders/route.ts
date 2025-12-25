import { NextRequest, NextResponse } from 'next/server';
import { sendOverdueInvoiceReminders } from '@/lib/invoice-reminders';

/**
 * Cron endpoint to send reminders for overdue invoices
 * Should be called daily (e.g., via Vercel Cron or external cron service)
 * 
 * To set up Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/invoice-reminders",
 *     "schedule": "0 9 * * *"
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

    const result = await sendOverdueInvoiceReminders();

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in invoice reminders cron:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

