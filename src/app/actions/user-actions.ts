'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { sendWelcomeEmail } from '@/app/requests/actions';
import type { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This is a server action, a secure way to run server-side code from a client component.

type CreateUserResult = { success: true; uid: string } | { success: false; error: string };

export async function createUser(userData: any): Promise<CreateUserResult> {
  try {
    // Ensure Firebase Admin is initialized
    await initializeAdminApp();
    const adminAuth = getAuth();
    const db = getFirestore();

    const { name, email, password, role, expertise, baseSalary, annualLeaveEntitlement } = userData;

    if (!name || !email || !password || !role) {
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
    const newUserFirestoreData: Omit<User, 'id'> = {
        name,
        email,
        role,
        baseSalary: baseSalary || 0,
        annualLeaveEntitlement: annualLeaveEntitlement ?? 20,
        expertise: role === 'qa_tester' ? expertise : '',
        disabled: false,
    };
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
