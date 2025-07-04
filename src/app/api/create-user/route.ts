import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { sendWelcomeEmail } from '@/app/requests/actions';
import type { User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    await initializeAdminApp();
    const adminAuth = getAuth();
    const db = getFirestore();

    const body = await request.json();
    const { name, email, password, role, expertise, baseSalary, annualLeaveEntitlement } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: name,
      disabled: false,
    });

    // Create user document in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userData: Omit<User, 'id'> = {
        name,
        email,
        role,
        baseSalary: baseSalary || 0,
        annualLeaveEntitlement: annualLeaveEntitlement ?? 20,
        expertise: role === 'qa_tester' ? expertise : '',
        disabled: false,
    };
    await userDocRef.set(userData);

    // Send welcome email without waiting for it to complete.
    // If it fails, log it, but don't fail the entire user creation process.
    sendWelcomeEmail({ name, email, password }).then(result => {
      if (!result.success) {
          console.error(`Welcome email failed for ${email}: ${result.error}`);
      }
    });

    return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Provide a more specific error message back to the client.
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

    return NextResponse.json({ message: errorMessage, error: error.code || 'UNKNOWN_ERROR' }, { status: 500 });
  }
}
