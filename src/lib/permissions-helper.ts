/**
 * Helper functions for working with permissions
 */

import { ALL_PERMISSIONS } from './roles';

/**
 * Get all available permissions as a flat array
 * Returns an array of all permission strings from ALL_PERMISSIONS
 */
export function getAllPermissions(): string[] {
  const permissions: string[] = [];

  // Iterate through all permission groups
  Object.values(ALL_PERMISSIONS).forEach(group => {
    if (typeof group === 'object' && group !== null) {
      // Each group is an object with permission keys
      Object.values(group).forEach(permission => {
        if (typeof permission === 'string') {
          permissions.push(permission);
        }
      });
    }
  });

  return permissions.sort();
}

/**
 * Get permissions grouped by category for UI display
 */
export function getPermissionsByCategory(): Record<string, { label: string; permissions: string[] }> {
  const categories: Record<string, { label: string; permissions: string[] }> = {};

  // Map permission groups to human-readable labels
  const categoryLabels: Record<string, string> = {
    ADMIN_SECTION: 'Admin',
    USERS: 'Users',
    ROLES: 'Roles',
    TEAMS: 'Teams',
    PROJECTS: 'Projects',
    PROJECT_INSIGHTS: 'Project Insights',
    PROJECT_DIAGNOSTICS: 'Project Diagnostics',
    PAYROLL: 'Payroll',
    LEAVE_MANAGEMENT: 'Leave Management',
    INFRACTIONS: 'Infractions',
    BONUSES: 'Bonuses',
    EXPENSES: 'Expenses',
    REQUESTS: 'Requests',
    CERTIFICATES: 'Certificates',
    LEADERBOARDS: 'Leaderboards',
    RECORDS: 'Records',
    LEAVE: 'Leave',
    DESIGNS: 'Designs',
    REQUISITIONS: 'Requisitions',
    FILES: 'Files',
    EMAIL_GROUPS: 'Email Groups',
  };

  // Group permissions by category
  Object.entries(ALL_PERMISSIONS).forEach(([groupKey, group]) => {
    if (typeof group === 'object' && group !== null) {
      const permissions: string[] = [];
      Object.values(group).forEach(permission => {
        if (typeof permission === 'string') {
          permissions.push(permission);
        }
      });

      if (permissions.length > 0) {
        categories[groupKey] = {
          label: categoryLabels[groupKey] || groupKey,
          permissions: permissions.sort(),
        };
      }
    }
  });

  return categories;
}

/**
 * Get a human-readable label for a permission
 */
export function getPermissionLabel(permission: string): string {
  // Map permissions to readable labels
  const labels: Record<string, string> = {
    'admin:read': 'View Admin Section',
    'users:create': 'Create Users',
    'users:read': 'View Users',
    'users:update': 'Update Users',
    'users:delete': 'Delete Users',
    'roles:manage': 'Manage Roles',
    'teams:create': 'Create Teams',
    'teams:read': 'View Teams',
    'teams:update': 'Update Teams',
    'teams:delete': 'Delete Teams',
    'projects:create': 'Create Projects',
    'projects:read': 'View Projects',
    'projects:update': 'Update Projects',
    'projects:delete': 'Delete Projects',
    'projects:assign_tasks': 'Assign Tasks',
    'insights:read': 'View Project Insights',
    'diagnostics:run': 'Run Diagnostics',
    'payroll:read': 'View Payroll',
    'leave:manage': 'Manage Leave',
    'infractions:manage': 'Manage Infractions',
    'bonuses:manage': 'Manage Bonuses',
    'expenses:create': 'Create Expenses',
    'expenses:read': 'View Expenses',
    'expenses:update': 'Update Expenses',
    'expenses:delete': 'Delete Expenses',
    'requests:create': 'Create Requests',
    'requests:read_all': 'View All Requests',
    'requests:read_own': 'View Own Requests',
    'requests:approve': 'Approve Requests',
    'requests:reject': 'Reject Requests',
    'requests:add_comment': 'Add Comments',
    'requests:rate_submission': 'Rate Submissions',
    'requests:give_feedback': 'Give Feedback',
    'certificates:read': 'View Certificates',
    'certificates:revoke': 'Revoke Certificates',
    'leaderboards:read': 'View Leaderboards',
    'records:read_own': 'View Own Records',
    'leave:request': 'Request Leave',
    'designs:create': 'Create Designs',
    'designs:read_own': 'View Own Designs',
    'designs:read_all': 'View All Designs',
    'designs:approve': 'Approve Designs',
    'requisitions:create': 'Create Requisitions',
    'requisitions:read_own': 'View Own Requisitions',
    'requisitions:read_all': 'View All Requisitions',
    'requisitions:approve': 'Approve Requisitions',
    'requisitions:reject': 'Reject Requisitions',
    'requisitions:fulfill': 'Fulfill Requisitions',
    'requisitions:update': 'Update Requisitions',
    'files:create': 'Create Files',
    'files:read_all': 'View All Files',
    'files:read_staff': 'View Staff Files',
    'files:update': 'Update Files',
    'files:delete': 'Delete Files',
    'email_groups:manage': 'Manage Email Groups',
    'profile:read': 'View Profile',
  };

  return labels[permission] || permission;
}

