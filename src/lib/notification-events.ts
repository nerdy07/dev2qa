/**
 * Notification event types for email groups
 * These define which notification events an email group should be CC'd on
 */

export type NotificationEventType =
  | 'new-request'
  | 'request-approved'
  | 'request-rejected'
  | 'new-comment'
  | 'task-assigned'
  | 'leave-requested'
  | 'leave-approved'
  | 'leave-rejected'
  | 'bonus-issued'
  | 'infraction-issued'
  | 'design-requested'
  | 'design-approved'
  | 'design-rejected'
  | 'invoice-sent'
  | 'project-update'
  | 'welcome'
  | 'reminder';

export const NOTIFICATION_EVENTS: Array<{
  value: NotificationEventType;
  label: string;
  description: string;
  category: 'requests' | 'tasks' | 'leave' | 'hr' | 'design' | 'finance' | 'system';
}> = [
  // Requests
  {
    value: 'new-request',
    label: 'New Certificate Request',
    description: 'When a new certificate request is submitted',
    category: 'requests',
  },
  {
    value: 'request-approved',
    label: 'Request Approved',
    description: 'When a certificate request is approved',
    category: 'requests',
  },
  {
    value: 'request-rejected',
    label: 'Request Rejected',
    description: 'When a certificate request is rejected',
    category: 'requests',
  },
  {
    value: 'new-comment',
    label: 'New Comment on Request',
    description: 'When a new comment is added to a request',
    category: 'requests',
  },
  {
    value: 'reminder',
    label: 'Request Reminder',
    description: 'When a pending request reminder is sent',
    category: 'requests',
  },
  // Tasks
  {
    value: 'task-assigned',
    label: 'Task Assigned',
    description: 'When a task is assigned to a team member',
    category: 'tasks',
  },
  {
    value: 'project-update',
    label: 'Project Update',
    description: 'When a project milestone or update notification is sent',
    category: 'tasks',
  },
  // Leave
  {
    value: 'leave-requested',
    label: 'Leave Request Submitted',
    description: 'When a leave request is submitted',
    category: 'leave',
  },
  {
    value: 'leave-approved',
    label: 'Leave Approved',
    description: 'When a leave request is approved',
    category: 'leave',
  },
  {
    value: 'leave-rejected',
    label: 'Leave Rejected',
    description: 'When a leave request is rejected',
    category: 'leave',
  },
  // HR
  {
    value: 'bonus-issued',
    label: 'Bonus Issued',
    description: 'When a bonus is issued to an employee',
    category: 'hr',
  },
  {
    value: 'infraction-issued',
    label: 'Infraction Issued',
    description: 'When a performance infraction is issued',
    category: 'hr',
  },
  // Design
  {
    value: 'design-requested',
    label: 'Design Request Submitted',
    description: 'When a new design request is submitted',
    category: 'design',
  },
  {
    value: 'design-approved',
    label: 'Design Approved',
    description: 'When a design request is approved',
    category: 'design',
  },
  {
    value: 'design-rejected',
    label: 'Design Rejected',
    description: 'When a design request is rejected',
    category: 'design',
  },
  // Finance
  {
    value: 'invoice-sent',
    label: 'Invoice Sent',
    description: 'When an invoice is sent to a client',
    category: 'finance',
  },
  // System
  {
    value: 'welcome',
    label: 'Welcome Email',
    description: 'When a welcome email is sent to a new user',
    category: 'system',
  },
];

export const NOTIFICATION_EVENTS_BY_CATEGORY = {
  requests: NOTIFICATION_EVENTS.filter(e => e.category === 'requests'),
  tasks: NOTIFICATION_EVENTS.filter(e => e.category === 'tasks'),
  leave: NOTIFICATION_EVENTS.filter(e => e.category === 'leave'),
  hr: NOTIFICATION_EVENTS.filter(e => e.category === 'hr'),
  design: NOTIFICATION_EVENTS.filter(e => e.category === 'design'),
  finance: NOTIFICATION_EVENTS.filter(e => e.category === 'finance'),
  system: NOTIFICATION_EVENTS.filter(e => e.category === 'system'),
};

export function getNotificationEventLabel(value: NotificationEventType): string {
  const event = NOTIFICATION_EVENTS.find(e => e.value === value);
  return event?.label || value;
}

export function getNotificationEventDescription(value: NotificationEventType): string {
  const event = NOTIFICATION_EVENTS.find(e => e.value === value);
  return event?.description || '';
}
