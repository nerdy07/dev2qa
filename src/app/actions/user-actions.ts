'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { sendWelcomeEmail } from '@/app/requests/actions';
import { sendEmail } from '@/lib/email';
import type { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { ADMIN_PERMISSION_IDENTIFIERS } from '@/lib/roles';

type PasswordResetResult = { success: true } | { success: false; error: string };

// This is a server action, a secure way to run server-side code from a client component.

type CreateUserResult = { success: true; uid: string } | { success: false; error: string };

export async function createUser(userData: any): Promise<CreateUserResult> {
  try {
    // Ensure Firebase Admin is initialized and get the app instance
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);
    const db = getFirestore(app);

    const { name, email, password, permissions, role, roles, expertise, baseSalary, annualLeaveEntitlement, startDate } = userData;

    // NEW: Use permissions directly (primary method)
    // BACKWARD COMPATIBILITY: If permissions not provided, derive from roles
    let userPermissions: string[] = [];
    let userRoles: string[] = [];

    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      // Use permissions directly
      userPermissions = permissions.filter(p => p && typeof p === 'string' && p.trim()).map(p => p.trim());
    } else {
      // Derive from roles for backward compatibility
      userRoles = roles && roles.length > 0 ? roles : (role ? [role] : []);
      if (userRoles.length === 0) {
        return { success: false, error: 'Missing required fields: permissions or roles must be provided' };
      }
      // TODO: Derive permissions from roles (for migration period)
      // For now, require permissions to be provided directly
      return { success: false, error: 'Permissions must be provided directly. Role-based permissions are deprecated.' };
    }

    if (!name || !email || !password || userPermissions.length === 0) {
      return { success: false, error: 'Missing required fields' };
    }

    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });

    // 2. Create user document in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const { Timestamp } = await import('firebase-admin/firestore');

    // Calculate if user has admin/project manager permissions based on permissions array
    const isAdmin = userPermissions.some(perm => ADMIN_PERMISSION_IDENTIFIERS.includes(perm as any));
    const isProjectManager = userPermissions.some(perm =>
      perm === 'projects:create' || perm === 'projects:delete' || perm === 'projects:update'
    );

    const newUserFirestoreData: any = {
      name,
      email,
      permissions: userPermissions, // Direct permissions array (primary)
      isAdmin: isAdmin, // Computed field: true if user has admin permissions
      isProjectManager: isProjectManager, // Computed field: true if user has project manager permissions
      baseSalary: baseSalary || 0,
      annualLeaveEntitlement: annualLeaveEntitlement ?? 20,
      expertise: userPermissions.includes('requests:approve') ? expertise : '',
      disabled: false,
    };
    // Add startDate if provided
    if (startDate) {
      newUserFirestoreData.startDate = Timestamp.fromDate(new Date(startDate));
    }
    await userDocRef.set(newUserFirestoreData);

    // 3. Send welcome email (don't block for this)
    sendWelcomeEmail({ name, email, password }).then(result => {
      if (!result.success) {
        console.error(`Welcome email failed for ${email}: ${result.error}`);
      }
    });

    // 4. Revalidate the users page to show the new user
    revalidatePath('/dashboard/admin/users');

    return { success: true, uid: userRecord.uid };

  } catch (error: any) {
    console.error('Error creating user via server action:', error);

    let errorMessage = error.message || 'An unexpected error occurred during user creation.';

    // Customize messages for common Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-exists':
          errorMessage = 'The email address is already in use by another account.';
          break;
        case 'auth/invalid-password':
          errorMessage = 'The password must be a string with at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address provided is not a valid email address.';
          break;
      }
    }

    return { success: false, error: errorMessage };
  }
}

export async function updateUser(userId: string, userData: any): Promise<{ success: boolean; error?: string }> {
  try {
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);
    const db = getFirestore(app);

    const { name, email, permissions, baseSalary, annualLeaveEntitlement, startDate, expertise } = userData;

    if (!userId || !name || !email) {
      return { success: false, error: 'Missing required fields' };
    }

    // 1. Update user in Firebase Auth
    // Note: Some fields like email might require re-verification mechanisms in a real app
    await adminAuth.updateUser(userId, {
      email,
      displayName: name,
    });

    // 2. Update user document in Firestore
    const userDocRef = db.collection('users').doc(userId);
    const { Timestamp } = await import('firebase-admin/firestore');

    // Start with existing roles/permissions if valid, or empty array
    let userPermissions: string[] = [];

    if (permissions && Array.isArray(permissions)) {
      userPermissions = permissions.filter(p => p && typeof p === 'string' && p.trim()).map(p => p.trim());
    }

    // Calculate computed fields
    const isAdmin = userPermissions.some(perm => ADMIN_PERMISSION_IDENTIFIERS.includes(perm as any));
    const isProjectManager = userPermissions.some(perm =>
      perm === 'projects:create' || perm === 'projects:delete' || perm === 'projects:update'
    );

    const updateData: any = {
      name,
      email,
      permissions: userPermissions,
      isAdmin,
      isProjectManager,
      baseSalary: baseSalary || 0,
      annualLeaveEntitlement: annualLeaveEntitlement ?? 20,
      expertise: userPermissions.includes('requests:approve') ? expertise : '',
    };

    // Add startDate if provided
    if (startDate) {
      // Check if startDate is an ISO string (from JSON)
      if (typeof startDate === 'string') {
        updateData.startDate = Timestamp.fromDate(new Date(startDate));
      } else if (startDate instanceof Date) {
        updateData.startDate = Timestamp.fromDate(startDate);
      }
    }

    await userDocRef.update(updateData);

    // 3. Revalidate the users page
    revalidatePath('/dashboard/admin/users');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user via server action:', error);
    return { success: false, error: error.message || 'Failed to update user' };
  }
}

export async function sendCustomPasswordResetEmail(email: string): Promise<PasswordResetResult> {
  try {
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);

    // Check if user exists
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Don't reveal that user doesn't exist (security best practice)
        return { success: true };
      }
      throw error;
    }

    // Generate password reset link using Firebase Admin SDK
    // The URL should point to where users should be redirected after resetting password
    const { getAbsoluteUrl } = await import('@/lib/email-template');
    const appUrl = getAbsoluteUrl('/');

    const actionCodeSettings = {
      url: appUrl,
      handleCodeInApp: false,
    };

    const resetLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);

    // Send custom branded email via Brevo
    const { wrapEmailContent, emailButton } = await import('@/lib/email-template');

    const content = `
      <h1 style="color: #2563eb; margin-top: 0; font-size: 24px;">Hello,</h1>
      <p style="font-size: 16px; margin-bottom: 20px;">
        Follow this link to reset your <strong>Dev2QA</strong> password for your <strong>${email}</strong> account.
      </p>
      ${emailButton(resetLink, 'Reset Password')}
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        If you didn't ask to reset your password, you can ignore this email.
      </p>
      <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 14px; color: #92400e; margin: 0 0 10px 0;">
          <strong>Note:</strong> This link will expire in 1 hour for security reasons.
        </p>
      </div>
      <p style="font-size: 14px; color: #999; margin-top: 20px;">
        If the button doesn't work, you can copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #666; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace;">
        ${resetLink}
      </p>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Reset Your Dev2QA Password',
      html: wrapEmailContent(content, 'Reset Your Dev2QA Password'),
    });

    if (!emailResult.success) {
      console.error(`Failed to send password reset email to ${email}:`, emailResult.error);
      return { success: false, error: emailResult.error || 'Failed to send email' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}
