/**
 * Audit Log Utility Functions
 * Feature 6: Audit Log & Activity History
 * 
 * Provides functions to create audit log entries for tracking all system actions.
 */

import { getFirestore } from '@/lib/firebase-admin-simple';
import type { AuditLog, AuditLogAction } from './types';
import admin from 'firebase-admin';

/**
 * Creates an audit log entry in Firestore
 * @param auditData - The audit log data (without id, createdAt)
 * @returns Promise with success status and error if any
 */
export async function createAuditLog(
  auditData: Omit<AuditLog, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getFirestore();
    
    await db.collection('auditLogs').add({
      ...auditData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    return {
      success: false,
      error: error.message || 'Failed to create audit log',
    };
  }
}

/**
 * Creates an audit log entry for a request action
 */
export async function logRequestAction(params: {
  action: AuditLogAction;
  requestId: string;
  requestTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes?: { field: string; oldValue?: any; newValue?: any }[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  return createAuditLog({
    action: params.action,
    entityType: 'request',
    entityId: params.requestId,
    entityName: params.requestTitle,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    changes: params.changes,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Creates an audit log entry for a status change
 */
export async function logStatusChange(params: {
  entityType: 'request' | 'requisition' | 'leave' | 'design';
  entityId: string;
  entityName: string;
  oldStatus: string;
  newStatus: string;
  userId: string;
  userName: string;
  userEmail: string;
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  return createAuditLog({
    action: 'status_change',
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    changes: [
      {
        field: 'status',
        oldValue: params.oldStatus,
        newValue: params.newStatus,
      },
    ],
    metadata: {
      reason: params.reason,
      ...params.metadata,
    },
  });
}

/**
 * Creates an audit log entry for a comment action
 */
export async function logCommentAction(params: {
  action: 'comment' | 'mention';
  requestId: string;
  commentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  return createAuditLog({
    action: params.action,
    entityType: 'comment',
    entityId: params.commentId,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    metadata: {
      requestId: params.requestId,
      ...params.metadata,
    },
  });
}
