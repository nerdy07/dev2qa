import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';

/**
 * Verifies the authentication token from the request and returns the user ID and role.
 * Returns null if authentication fails.
 */
export async function verifyAuth(request: Request): Promise<{ uid: string; role: string } | null> {
  try {
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);

    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Get user role from Firestore
    const db = getFirestore(app);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (!userData || userData.disabled) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role || '',
    };
  } catch (error) {
    // Token verification failed
    return null;
  }
}

/**
 * Middleware function to check if the user is authenticated and has admin role
 */
export async function requireAdmin(request: Request): Promise<{ uid: string; role: string } | NextResponse> {
  const authResult = await verifyAuth(request);
  
  if (!authResult) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized. Authentication required.' },
      { status: 401 }
    );
  }

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  return authResult;
}

