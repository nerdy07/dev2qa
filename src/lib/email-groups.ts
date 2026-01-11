/**
 * Utility functions for working with email groups
 */

import type { EmailGroup, User } from './types';
import type { NotificationEventType } from './notification-events';

/**
 * Gets all email addresses from an array of email group IDs
 * @param groupIds - Array of email group IDs
 * @param emailGroups - Array of email groups
 * @param users - Array of users
 * @returns Array of email addresses (unique)
 */
export function getEmailsFromGroups(
  groupIds: string[],
  emailGroups: EmailGroup[],
  users: User[]
): string[] {
  if (!groupIds || groupIds.length === 0 || !emailGroups || !users) {
    return [];
  }

  const emailSet = new Set<string>();

  // For each group ID, find the group and get member emails
  groupIds.forEach(groupId => {
    const group = emailGroups.find(g => g.id === groupId);
    if (group && group.memberIds) {
      group.memberIds.forEach(memberId => {
        const user = users.find(u => u.id === memberId && u.email);
        if (user?.email) {
          emailSet.add(user.email);
        }
      });
    }
  });

  return Array.from(emailSet);
}

/**
 * Gets all email addresses from a single email group
 * @param groupId - Email group ID
 * @param emailGroups - Array of email groups
 * @param users - Array of users
 * @returns Array of email addresses
 */
export function getEmailsFromGroup(
  groupId: string,
  emailGroups: EmailGroup[],
  users: User[]
): string[] {
  return getEmailsFromGroups([groupId], emailGroups, users);
}

/**
 * Gets user names from an array of email group IDs
 * @param groupIds - Array of email group IDs
 * @param emailGroups - Array of email groups
 * @param users - Array of users
 * @returns Array of user names (unique)
 */
export function getNamesFromGroups(
  groupIds: string[],
  emailGroups: EmailGroup[],
  users: User[]
): string[] {
  if (!groupIds || groupIds.length === 0 || !emailGroups || !users) {
    return [];
  }

  const nameSet = new Set<string>();

  // For each group ID, find the group and get member names
  groupIds.forEach(groupId => {
    const group = emailGroups.find(g => g.id === groupId);
    if (group && group.memberIds) {
      group.memberIds.forEach(memberId => {
        const user = users.find(u => u.id === memberId);
        if (user?.name) {
          nameSet.add(user.name);
        }
      });
    }
  });

  return Array.from(nameSet);
}

/**
 * Gets all email addresses from email groups that are configured for a specific notification event
 * @param eventType - The notification event type
 * @param emailGroups - Array of email groups
 * @param users - Array of users
 * @returns Array of email addresses (unique)
 */
export function getCCEmailsForNotificationEvent(
  eventType: NotificationEventType,
  emailGroups: EmailGroup[],
  users: User[]
): string[] {
  if (!eventType || !emailGroups || !users) {
    return [];
  }

  const emailSet = new Set<string>();

  // Find all email groups that have this notification event configured
  const relevantGroups = emailGroups.filter(
    group => group.notificationEvents && group.notificationEvents.includes(eventType)
  );

  // Get emails from all relevant groups
  relevantGroups.forEach(group => {
    if (group.memberIds) {
      group.memberIds.forEach(memberId => {
        const user = users.find(u => u.id === memberId && u.email);
        if (user?.email) {
          emailSet.add(user.email);
        }
      });
    }
  });

  return Array.from(emailSet);
}
