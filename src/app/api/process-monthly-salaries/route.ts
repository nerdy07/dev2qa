import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { startOfMonth, endOfMonth, format, getDaysInMonth, differenceInCalendarDays } from 'date-fns';
import { requireAdmin } from '@/lib/api-auth';
import type { User } from '@/lib/types';

// POST /api/process-monthly-salaries - Process monthly salary deductions
export async function POST(request: Request) {
  try {
    // Verify authentication and admin role
    const authCheck = await requireAdmin(request);
    if (authCheck instanceof NextResponse) {
      return authCheck; // Return error response
    }

    const app = await initializeAdminApp();
    const db = getFirestore(app);

    const body = await request.json().catch(() => ({}));
    const { year, month } = body;

    // Validate year and month parameters
    const currentYear = new Date().getFullYear();
    if (year && (year < 2000 || year > currentYear + 1)) {
      return NextResponse.json({
        success: false,
        message: `Invalid year. Year must be between 2000 and ${currentYear + 1}.`
      }, { status: 400 });
    }

    if (month && (month < 1 || month > 12)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid month. Month must be between 1 and 12.'
      }, { status: 400 });
    }
    
    // Use provided date or current date
    const targetDate = year && month ? new Date(year, month - 1, 1) : new Date();
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Check if salaries have already been processed for this month
    const transactionsRef = db.collection('transactions');
    const monthStartTimestamp = Timestamp.fromDate(monthStart);
    const monthEndTimestamp = Timestamp.fromDate(monthEnd);
    
    const existingExpense = await transactionsRef
      .where('category', '==', 'Salary & Wages')
      .where('type', '==', 'expense')
      .where('date', '>=', monthStartTimestamp)
      .where('date', '<=', monthEndTimestamp)
      .limit(1)
      .get();

    if (!existingExpense.empty) {
      return NextResponse.json({ 
        success: false, 
        message: `Salaries for ${format(monthStart, 'MMMM yyyy')} have already been processed.` 
      }, { status: 400 });
    }

    // Get all active users
    const usersSnapshot = await db.collection('users')
      .where('disabled', '!=', true)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ 
        success: false, 
        message: 'No active users found.' 
      }, { status: 400 });
    }

    // Get infractions and bonuses for the month
    const infractionsSnapshot = await db.collection('infractions')
      .where('dateIssued', '>=', Timestamp.fromDate(monthStart))
      .where('dateIssued', '<=', Timestamp.fromDate(monthEnd))
      .get();

    const bonusesSnapshot = await db.collection('bonuses')
      .where('dateIssued', '>=', Timestamp.fromDate(monthStart))
      .where('dateIssued', '<=', Timestamp.fromDate(monthEnd))
      .get();

    const infractions = infractionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const bonuses = bonusesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate total net salaries
    let totalNetSalaries = 0;
    const salaryBreakdown: Array<{ 
      userName: string; 
      baseSalary?: number; 
      proratedBaseSalary: number;
      daysWorked?: number;
      deductions: number; 
      bonuses: number; 
      netSalary: number;
      prorationNote?: string;
    }> = [];

    usersSnapshot.forEach(doc => {
      const user = { id: doc.id, ...doc.data() } as User & { id: string };
      const baseSalary = user.baseSalary || 0;
      
      if (baseSalary === 0) return; // Skip users without salary

      // Calculate prorated base salary if user started mid-month
      let proratedBaseSalary = baseSalary;
      let daysWorked = getDaysInMonth(monthStart);
      let prorationFactor = 1;
      let prorationNote = '';

      if (user.startDate) {
        // Handle Firestore Timestamp conversion safely
        let startDate: Date;
        if (user.startDate && typeof user.startDate === 'object' && 'toDate' in user.startDate) {
          // Firestore Timestamp object
          startDate = (user.startDate as any).toDate();
        } else if (user.startDate && typeof user.startDate === 'object' && 'seconds' in user.startDate) {
          // Firestore Timestamp from server (has seconds property)
          startDate = new Date((user.startDate as any).seconds * 1000);
        } else if (user.startDate instanceof Date) {
          // Already a Date object
          startDate = user.startDate;
        } else if (typeof user.startDate === 'string' || typeof user.startDate === 'number') {
          // ISO string or timestamp
          startDate = new Date(user.startDate);
        } else {
          // Invalid format, skip proration
          startDate = new Date(0);
        }

        // Validate date
        if (isNaN(startDate.getTime())) {
          // Invalid date, skip proration
          startDate = new Date(0);
        }

        const startOfMonthDate = startOfMonth(monthStart);
        
        // If user started during this month, calculate prorated salary
        if (startDate >= startOfMonthDate && startDate <= monthEnd) {
          // Calculate days worked: from start date to end of month (inclusive)
          daysWorked = differenceInCalendarDays(monthEnd, startDate) + 1;
          const totalDaysInMonth = getDaysInMonth(monthStart);
          prorationFactor = daysWorked / totalDaysInMonth;
          proratedBaseSalary = baseSalary * prorationFactor;
          prorationNote = ` (Prorated: ${daysWorked} of ${totalDaysInMonth} days)`;
        } else if (startDate > monthEnd) {
          // User started after this month, skip them
          return;
        }
        // If startDate is before monthStart, user worked full month, no proration needed
      }

      // Calculate deductions from infractions (based on prorated base salary)
      const userInfractions = infractions.filter((i: any) => i.userId === user.id);
      const totalDeductions = userInfractions.reduce((acc: number, infraction: any) => {
        return acc + (proratedBaseSalary * (infraction.deductionPercentage / 100));
      }, 0);

      // Calculate bonuses (percentage bonuses based on prorated, fixed bonuses as-is)
      const userBonuses = bonuses.filter((b: any) => b.userId === user.id);
      const totalBonuses = userBonuses.reduce((acc: number, bonus: any) => {
        if (bonus.currency === 'PERCENTAGE') {
          return acc + (proratedBaseSalary * (bonus.amount / 100));
        }
        return acc + bonus.amount;
      }, 0);

      const netSalary = proratedBaseSalary - totalDeductions + totalBonuses;
      totalNetSalaries += netSalary;

      if (netSalary > 0) {
        salaryBreakdown.push({
          userName: user.name,
          baseSalary: proratedBaseSalary !== baseSalary ? baseSalary : undefined, // Original base if prorated
          proratedBaseSalary,
          daysWorked: prorationFactor < 1 ? daysWorked : undefined,
          deductions: totalDeductions,
          bonuses: totalBonuses,
          netSalary,
          prorationNote,
        });
      }
    });

    if (totalNetSalaries === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Total salaries amount is zero. No expense was created.' 
      }, { status: 400 });
    }

    // Create the expense transaction
    const transactionData: any = {
      type: 'expense',
      category: 'Salary & Wages',
      description: `Monthly salaries for ${format(monthStart, 'MMMM yyyy')}`,
      amount: totalNetSalaries,
      currency: 'NGN',
      date: Timestamp.fromDate(monthEnd), // Set to last day of month
      createdById: 'system',
      createdByName: 'System (Automatic)',
      notes: `Automatic salary deduction for ${format(monthStart, 'MMMM yyyy')}. Total employees: ${salaryBreakdown.length}. Breakdown: ${salaryBreakdown.map(s => {
        let note = `${s.userName}: ${s.netSalary.toLocaleString()}`;
        if (s.prorationNote) note += s.prorationNote;
        return note;
      }).join('; ')}`,
    };

    const transactionRef = await db.collection('transactions').add(transactionData);

    // Calculate totals for debugging/comparison
    const calculatedTotalBase = salaryBreakdown.reduce((sum, s) => sum + (s.baseSalary || s.proratedBaseSalary), 0);
    const calculatedTotalDeductions = salaryBreakdown.reduce((sum, s) => sum + s.deductions, 0);
    const calculatedTotalBonuses = salaryBreakdown.reduce((sum, s) => sum + s.bonuses, 0);
    
    return NextResponse.json({ 
      success: true, 
      message: `Monthly salaries processed successfully for ${format(monthStart, 'MMMM yyyy')}`,
      transactionId: transactionRef.id,
      totalAmount: totalNetSalaries,
      employeeCount: salaryBreakdown.length,
      breakdown: salaryBreakdown,
      calculatedTotals: {
        totalBase: calculatedTotalBase,
        totalDeductions: calculatedTotalDeductions,
        totalBonuses: calculatedTotalBonuses,
        totalNet: totalNetSalaries,
      },
    });

  } catch (error: any) {
    // Log error details for server-side monitoring (not exposed to client)
    const errorMessage = error.message || 'An error occurred while processing monthly salaries.';
    
    // In production, log to your error tracking service instead of console
    // Example: Sentry.captureException(error);
    
    return NextResponse.json({ 
      success: false, 
      message: errorMessage 
    }, { status: 500 });
  }
}

