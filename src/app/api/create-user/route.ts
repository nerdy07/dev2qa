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

    // Send welcome email with credentials
    await sendWelcomeEmail({ name, email, password });

    return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' });

  } catch (error: any) {
    console.error('Error creating user:', error);
    // Provide more specific error messages
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'The email address is already in use by another account.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'The password must be a string with at least 6 characters.';
    }

    return NextResponse.json({ message: errorMessage, error: error.code }, { status: 500 });
  }
}
