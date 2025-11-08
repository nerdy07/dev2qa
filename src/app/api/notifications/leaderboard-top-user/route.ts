import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { sendLeaderboardTopUserEmail } from '@/app/requests/actions';

// POST /api/notifications/leaderboard-top-user - Create notifications when top user changes
export async function POST(request: Request) {
  try {
    const app = await initializeAdminApp();
    const db = getFirestore(app);
    const body = await request.json();
    const { topUserId, leaderboardType, previousTopUserId, topUserName } = body;

    if (!topUserId || !leaderboardType || !topUserName) {
      return NextResponse.json(
        { message: 'topUserId, leaderboardType, and topUserName are required' },
        { status: 400 }
      );
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const isNewTop = previousTopUserId && previousTopUserId !== topUserId;

    // Create notifications for all users
    const notifications = users.map(user => ({
      userId: user.id,
      type: isNewTop ? 'leaderboard_new_top' : 'leaderboard_top_user',
      title: isNewTop 
        ? `New Top ${leaderboardType === 'qa' ? 'QA Tester' : 'Requester'}!` 
        : `Top ${leaderboardType === 'qa' ? 'QA Tester' : 'Requester'}`,
      message: isNewTop
        ? `${topUserName} is now the top ${leaderboardType === 'qa' ? 'QA tester' : 'requester'}! 🎉`
        : `${topUserName} is the top ${leaderboardType === 'qa' ? 'QA tester' : 'requester'}! 👑`,
      read: false,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
      data: {
        topUserId,
        leaderboardType,
        previousTopUserId,
      },
    }));

    // Batch write notifications
    const batch = db.batch();
    const notificationsRef = db.collection('notifications');
    
    notifications.forEach(notification => {
      const docRef = notificationsRef.doc();
      batch.set(docRef, notification);
    });

    await batch.commit();

    // Send email notifications to all users
    const emailPromises = users.map(user => 
      sendLeaderboardTopUserEmail({
        recipientEmail: user.email,
        userName: user.name,
        topUserName,
        leaderboardType,
        isNewTop,
      })
    );

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ 
      message: 'Notifications and emails created successfully',
      count: notifications.length 
    });

  } catch (error: any) {
    console.error('Error creating notifications:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create notifications' },
      { status: 500 }
    );
  }
}

