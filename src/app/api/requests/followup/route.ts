import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/api-auth';
import { ALL_PERMISSIONS } from '@/lib/roles';
import type { CertificateRequest } from '@/lib/types';
import { notifyOnPendingRequestReminder } from '@/app/requests/actions';
import { createInAppNotificationsForUsers } from '@/lib/notifications';

const APPROVE_PERMISSION = ALL_PERMISSIONS.REQUESTS.APPROVE;

function normalizeRoleKey(roleName: string): string[] {
  const lower = roleName.toLowerCase();
  return [
    lower,
    lower.replace(/_/g, ''),
    lower.replace(/\s+/g, '_'),
  ];
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    let isAuthorized = false;

    if (cronSecret) {
      const secretHeader = request.headers.get('x-cron-secret') ?? request.headers.get('authorization');
      if (secretHeader) {
        const token = secretHeader.startsWith('Bearer ')
          ? secretHeader.substring(7).trim()
          : secretHeader.trim();
        if (token === cronSecret) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      const authResult = await requireAdmin(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    const app = await initializeAdminApp();
    const db = getFirestore(app);

    const cutoffDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const requestsSnapshot = await db
      .collection('requests')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', cutoffTimestamp)
      .get();

    if (requestsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No pending requests are past the follow-up threshold.',
        notifiedCount: 0,
      });
    }

    const overdueRequests = requestsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        data: doc.data() as CertificateRequest & { firstReminderSentAt?: Timestamp },
      }))
      .filter(({ data }) => !data.firstReminderSentAt);

    if (overdueRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All overdue requests have already received a follow-up reminder.',
        notifiedCount: 0,
      });
    }

    const [usersSnapshot, rolesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('roles').get(),
    ]);

    const rolesMap = new Map<string, string[]>();
    rolesSnapshot.forEach((roleDoc) => {
      const roleData = roleDoc.data() as { name?: string; permissions?: string[] };
      const name = roleData.name || roleDoc.id;
      const normalizedKeys = normalizeRoleKey(name);
      normalizedKeys.forEach((key) => rolesMap.set(key, roleData.permissions || []));
    });

    const qaUsers = usersSnapshot.docs
      .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
      .filter((user: any) => {
        if (user.disabled) return false;

        const explicitPermissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
        if (explicitPermissions.includes(APPROVE_PERMISSION)) {
          return true;
        }

        const roleNames = new Set<string>();
        if (Array.isArray(user.roles)) {
          user.roles.forEach((roleName: any) => {
            if (typeof roleName === 'string') {
              roleNames.add(roleName);
            }
          });
        }

        if (typeof user.role === 'string' && user.role.trim() !== '') {
          roleNames.add(user.role);
        }

        let hasRolePermission = false;
        for (const roleName of roleNames) {
          for (const key of normalizeRoleKey(roleName)) {
            const rolePermissions = rolesMap.get(key);
            if (rolePermissions?.includes(APPROVE_PERMISSION)) {
              hasRolePermission = true;
              break;
            }
          }
          if (hasRolePermission) {
            break;
          }
        }

        return hasRolePermission;
      })
      .map((user: any) => ({
        id: user.id,
        email: user.email as string | undefined,
        name: user.name as string | undefined,
      }));

    const qaEmails = qaUsers
      .map((user) => user.email)
      .filter((email): email is string => Boolean(email));

    if (qaEmails.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No QA approvers found to notify.',
        notifiedCount: 0,
      }, { status: 400 });
    }

    const reminderPayload = overdueRequests.map(({ id, data }) => {
      const createdAtTimestamp = data.createdAt;
      const createdAtDate =
        createdAtTimestamp && typeof createdAtTimestamp === 'object' && 'toDate' in createdAtTimestamp
          ? (createdAtTimestamp as any).toDate()
          : new Date();

      return {
        requestId: id,
        shortId: (data as any).shortId,
        taskTitle: data.taskTitle,
        requesterName: data.requesterName,
        associatedProject: data.associatedProject,
        associatedTeam: data.associatedTeam,
        certificateRequired: data.certificateRequired,
        createdAt: createdAtDate.toISOString(),
      };
    });

    await notifyOnPendingRequestReminder({
      qaEmails,
      requests: reminderPayload,
    });

    const qaUserIds = qaUsers.map((user) => user.id);
    if (qaUserIds.length > 0) {
      await createInAppNotificationsForUsers(qaUserIds, {
        type: 'general',
        title: 'Pending Requests Reminder',
        message: `There are ${reminderPayload.length} request(s) pending approval for more than 3 days. Please review them.`,
        read: false,
      });
    }

    const batch = db.batch();
    const now = Timestamp.now();

    overdueRequests.forEach(({ id }) => {
      const ref = db.collection('requests').doc(id);
      batch.update(ref, {
        firstReminderSentAt: now,
        reminderCount: FieldValue.increment(1),
        updatedAt: now,
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Sent follow-up reminders for ${reminderPayload.length} pending request(s).`,
      notifiedCount: reminderPayload.length,
    });
  } catch (error: any) {
    console.error('Error sending pending request follow-up reminders:', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Failed to send follow-up reminders.',
    }, { status: 500 });
  }
}

