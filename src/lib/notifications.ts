import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Notification } from './types';

/**
 * Creates an in-app notification document in Firestore
 * @param notificationData - The notification data (without id, createdAt)
 * @returns Promise with success status and error if any
 */
export async function createInAppNotification(
  notificationData: Omit<Notification, 'id' | 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error creating in-app notification:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create notification' 
    };
  }
}

/**
 * Creates multiple in-app notifications for multiple users
 * @param userIds - Array of user IDs to notify
 * @param notificationData - The notification data (without userId, id, createdAt)
 * @returns Promise with success status and count of notifications created
 */
export async function createInAppNotificationsForUsers(
  userIds: string[],
  notificationData: Omit<Notification, 'userId' | 'id' | 'createdAt'>
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!db) {
    return { success: false, count: 0, error: 'Database not initialized' };
  }

  if (userIds.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      userId,
      createdAt: serverTimestamp(),
    }));

    // Use Promise.allSettled to create all notifications in parallel
    // This is more efficient than sequential calls
    const results = await Promise.allSettled(
      notifications.map(notification => 
        addDoc(collection(db, 'notifications'), notification)
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0) {
      console.warn(`Failed to create ${failures.length} notifications:`, failures);
    }

    return { 
      success: successCount > 0, 
      count: successCount,
      error: failures.length > 0 ? `${failures.length} notifications failed` : undefined
    };
  } catch (error: any) {
    console.error('Error creating in-app notifications:', error);
    return { 
      success: false, 
      count: 0,
      error: error.message || 'Failed to create notifications' 
    };
  }
}

