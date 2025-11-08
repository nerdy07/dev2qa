# Monthly Salary Automation

The system includes functionality to automatically deduct monthly salaries as expenses.

## Features

1. **Manual Processing**: Admins can click the "Process Monthly Salaries" button on the Expenses & Income page to process salaries for any month.

2. **Automatic Reminder**: On the last day of each month, a reminder alert appears prompting admins to process salaries.

3. **Duplicate Prevention**: The system prevents processing salaries for the same month twice.

## How It Works

When salaries are processed, the system:
- Calculates net salaries for all active users (baseSalary - deductions + bonuses)
- Creates an expense transaction categorized as "Salary & Wages"
- Sets the transaction date to the last day of the selected month
- Records the breakdown in the transaction notes

## Setting Up Automatic Processing

To automatically process salaries on the last day of each month, you can set up a cron job that calls the API endpoint.

### Option 1: Vercel Cron Jobs (Recommended if using Vercel)

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/process-monthly-salaries",
      "schedule": "0 0 28-31 * *"
    }
  ]
}
```

Note: The schedule `0 0 28-31 * *` runs at midnight on days 28-31 of each month. You may want to adjust this or use a more sophisticated check.

### Option 2: External Cron Service

Use services like:
- **GitHub Actions** with scheduled workflows
- **Cron-job.org** (free cron service)
- **EasyCron** or similar services

Example cron schedule (runs at 11:59 PM on the last day of each month):
```
59 23 28-31 * * curl -X POST https://your-domain.com/api/process-monthly-salaries
```

### Option 3: Firebase Cloud Functions Scheduled Trigger

Create a Cloud Function that runs on a schedule:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.processMonthlySalaries = functions.pubsub
  .schedule('0 0 1 * *') // First day of month at midnight (processes previous month)
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    // Call your API endpoint or implement the logic here
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Implementation...
  });
```

## API Endpoint

**POST** `/api/process-monthly-salaries`

**Request Body (Optional)**:
```json
{
  "year": 2025,
  "month": 11
}
```

If not provided, uses the current date.

**Response**:
```json
{
  "success": true,
  "message": "Monthly salaries processed successfully for November 2025",
  "transactionId": "abc123",
  "totalAmount": 5000000,
  "employeeCount": 10,
  "breakdown": [...]
}
```

## Notes

- Only admins can process salaries
- Salaries are calculated as: `baseSalary - deductions + bonuses`
- Deductions are calculated from infractions issued in that month
- Bonuses are calculated from bonuses issued in that month
- Users with `disabled: true` are excluded
- Users without a `baseSalary` are skipped

