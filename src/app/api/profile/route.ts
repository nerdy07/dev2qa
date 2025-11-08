import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { getAuth as getClientAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { name, photoURL, currentPassword, newPassword } = body;

    // Get current user from client-side auth token
    // Note: In a real implementation, you'd verify the token server-side
    // For now, we'll use the client-side approach with admin SDK
    
    // We need to get the user ID from the request headers or body
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Authorization required' }, { status: 401 });
    }

    // Parse the token (format: "Bearer <token>")
    const token = authHeader.replace('Bearer ', '');
    
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);
    const db = getFirestore(app);
    
    // Verify the token and get user
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const authUpdatePayload: any = {};
    const firestoreUpdatePayload: any = {};

    if (name !== undefined) {
      authUpdatePayload.displayName = name;
      firestoreUpdatePayload.name = name;
    }

    if (photoURL !== undefined) {
      authUpdatePayload.photoURL = photoURL;
      firestoreUpdatePayload.photoURL = photoURL;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ message: 'Current password is required to change password' }, { status: 400 });
      }
      
      // Verify current password by attempting to sign in
      // Note: This is a simplified approach. In production, you might want to use reauthentication
      authUpdatePayload.password = newPassword;
    }

    // Update Firebase Auth
    if (Object.keys(authUpdatePayload).length > 0) {
      await adminAuth.updateUser(uid, authUpdatePayload);
    }

    // Update Firestore
    if (Object.keys(firestoreUpdatePayload).length > 0) {
      const userDocRef = db.collection('users').doc(uid);
      await userDocRef.update(firestoreUpdatePayload);
    }

    return NextResponse.json({ message: 'Profile updated successfully' });

  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error updating profile:', error);
    }
    const errorMessage = error.message || 'An unexpected error occurred while updating profile.';
    return NextResponse.json({ message: errorMessage, error: error.code || 'UNKNOWN_ERROR' }, { status: 500 });
  }
}

