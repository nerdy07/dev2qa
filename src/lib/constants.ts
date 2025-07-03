export const INFRACTION_TYPES = [
    { name: 'Absence from company-wide cadence call without notice', deduction: 5 },
    { name: 'Missed daily standup (unexcused) more than twice a week', deduction: 2 },
    { name: 'Ignoring direct messages or work-related communication beyond 12 working hours', deduction: 1 },
    { name: 'Unavailability for a full workday without notice', deduction: 5 },
    { name: 'Repeated neglect of task responsibilities', deduction: 3 },
    { name: 'Late submission of reports or updates more than twice in a review cycle', deduction: 5 },
    { name: 'Logging inaccurate work hours or falsely reporting progress', deduction: 3 },
    { name: 'Failure to document or update project tools as required', deduction: 3 },
    { name: 'Ignoring assigned feedback or refusing code/design reviews', deduction: 2 },
    { name: 'Showing up late to scheduled client or internal meetings', deduction: 2 },
    { name: 'Repeated failure to contribute to team discussions', deduction: 2 },
    { name: 'QA error found in certified module', deduction: 1 },
    { name: 'Failure to meet monthly certificate requirement', deduction: 0 }, // Salary held, not a percentage
    { name: 'Other (Specify in description)', deduction: 0 },
];

export const BONUS_TYPES = [
    { name: 'Exceeding KPIs consistently for 2 review cycles', amount: 10, currency: 'PERCENTAGE' },
    { name: 'Exceptional initiative or innovation', amount: 0, currency: 'NGN' }, // Spot bonus, amount is variable
    { name: 'Receiving up to 15 completion certificates in a month', amount: 50, currency: 'PERCENTAGE' },
    { name: 'Completing a project milestone ahead of deadline with high quality', amount: 5, currency: 'PERCENTAGE' },
    { name: 'Peer-nominated contribution', amount: 5000, currency: 'NGN' },
    { name: 'Positive client feedback or successful demo delivery', amount: 0, currency: 'NGN' }, // Discretionary
    { name: 'Other (Specify in description)', amount: 0, currency: 'NGN' },
];

export const LEAVE_TYPES = [
    'Annual Leave',
    'Sick Leave',
    'Unpaid Leave',
    'Maternity/Paternity Leave',
    'Compassionate Leave',
    'Other',
];
