import { NextResponse } from 'next/server';

// POST /api/export/payroll - Export payroll data to CSV/Excel
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { payrollData, format = 'csv', month, year } = body;

    if (!payrollData || !Array.isArray(payrollData)) {
      return NextResponse.json(
        { message: 'Payroll data is required' },
        { status: 400 }
      );
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Employee Name', 'Email', 'Base Salary', 'Deductions', 'Bonuses', 'Net Salary'];
      const rows = payrollData.map((entry: any) => [
        entry.user?.name || '',
        entry.user?.email || '',
        entry.baseSalary || 0,
        entry.totalDeductions || 0,
        entry.totalBonuses || 0,
        entry.netSalary || 0,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll-${month}-${year}.csv"`,
        },
      });
    } else if (format === 'excel') {
      // For Excel, we'd need a library like xlsx
      // For now, return CSV with Excel content type
      const headers = ['Employee Name', 'Email', 'Base Salary', 'Deductions', 'Bonuses', 'Net Salary'];
      const rows = payrollData.map((entry: any) => [
        entry.user?.name || '',
        entry.user?.email || '',
        entry.baseSalary || 0,
        entry.totalDeductions || 0,
        entry.totalBonuses || 0,
        entry.netSalary || 0,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="payroll-${month}-${year}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { message: 'Invalid format. Use "csv" or "excel"' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error exporting payroll:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to export payroll' },
      { status: 500 }
    );
  }
}

