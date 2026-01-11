/**
 * Request Workflow Utility Functions
 * Feature 2: Enhanced Request Workflow States
 * 
 * Provides utilities for managing request status transitions and validation.
 */

import type { RequestStatus, StatusHistoryEntry, CertificateRequest } from './types';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Valid status transitions map
 * Each status maps to the valid next statuses
 */
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ['assigned', 'approved', 'rejected'],
  assigned: ['in_review', 'approved', 'rejected'],
  in_review: ['needs_revision', 'approved', 'rejected'],
  needs_revision: ['pending', 'assigned'],
  approved: [], // Terminal state
  rejected: ['pending'], // Can resubmit after rejection
};

/**
 * Validates if a status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: RequestStatus,
  newStatus: RequestStatus
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Gets the display label for a status
 */
export function getStatusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_review: 'In Review',
    needs_revision: 'Needs Revision',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return labels[status];
}

/**
 * Gets the badge variant for a status
 */
export function getStatusVariant(status: RequestStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'pending':
    case 'assigned':
    case 'in_review':
      return 'secondary';
    case 'needs_revision':
      return 'outline';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Gets the icon for a status
 */
export function getStatusIcon(status: RequestStatus): string {
  switch (status) {
    case 'pending':
      return 'Clock';
    case 'assigned':
      return 'UserCheck';
    case 'in_review':
      return 'Eye';
    case 'needs_revision':
      return 'RefreshCw';
    case 'approved':
      return 'CheckCircle';
    case 'rejected':
      return 'XCircle';
    default:
      return 'Circle';
  }
}

/**
 * Creates a status history entry
 */
export function createStatusHistoryEntry(params: {
  status: RequestStatus;
  userId: string;
  userName: string;
  previousStatus?: RequestStatus;
  reason?: string;
}): StatusHistoryEntry {
  return {
    status: params.status,
    changedAt: serverTimestamp() as any,
    changedById: params.userId,
    changedByName: params.userName,
    reason: params.reason,
    previousStatus: params.previousStatus,
  };
}

/**
 * Adds a status history entry to a request's status history array
 */
export function addStatusHistory(
  currentHistory: StatusHistoryEntry[] | undefined,
  newEntry: StatusHistoryEntry
): StatusHistoryEntry[] {
  const history = currentHistory || [];
  return [...history, newEntry];
}

/**
 * Checks if a request can be transitioned to a new status
 */
export function canTransitionTo(
  request: CertificateRequest,
  newStatus: RequestStatus,
  userId: string,
  hasApprovePermission: boolean
): { allowed: boolean; reason?: string } {
  const currentStatus = request.status;

  // Same status is not allowed
  if (currentStatus === newStatus) {
    return { allowed: false, reason: 'Request is already in this status' };
  }

  // Check if transition is valid
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${getStatusLabel(currentStatus)} to ${getStatusLabel(newStatus)}`,
    };
  }

  // Permission checks
  if (newStatus === 'approved' || newStatus === 'rejected') {
    if (!hasApprovePermission) {
      return { allowed: false, reason: 'You do not have permission to approve or reject requests' };
    }
  }

  // Check if user can assign (must have approve permission)
  if (newStatus === 'assigned') {
    if (!hasApprovePermission) {
      return { allowed: false, reason: 'You do not have permission to assign requests' };
    }
  }

  return { allowed: true };
}
