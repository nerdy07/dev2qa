
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
// Removed calculateIsAdmin/calculateIsProjectManager - now using direct permission checks

// PATCH /api/users/[uid] - Update user details or activation status
export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const app = await initializeAdminApp();
  const { uid } = await params;
  const body = await request.json();

  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const adminAuth = getAuth(app);
    const db = getFirestore(app);
    
    const { name, permissions, role, roles, expertise, baseSalary, annualLeaveEntitlement, disabled, startDate } = body;
    
    const authUpdatePayload: any = {};
    const firestoreUpdatePayload: any = {};

    if (name !== undefined) {
      authUpdatePayload.displayName = name;
      firestoreUpdatePayload.name = name;
    }
    
    // NEW: Update permissions directly (primary method)
    if (permissions !== undefined && Array.isArray(permissions)) {
      const validPermissions = permissions.filter(p => p && typeof p === 'string' && p.trim()).map(p => p.trim());
      firestoreUpdatePayload.permissions = validPermissions;
      
      // Recalculate isAdmin and isProjectManager from permissions
      const { ADMIN_PERMISSION_IDENTIFIERS } = await import('@/lib/roles');
      const isAdmin = validPermissions.some(perm => ADMIN_PERMISSION_IDENTIFIERS.includes(perm as any));
      const isProjectManager = validPermissions.some(perm => 
        perm === 'projects:create' || perm === 'projects:delete' || perm === 'projects:update'
      );
      firestoreUpdatePayload.isAdmin = isAdmin;
      firestoreUpdatePayload.isProjectManager = isProjectManager;
    }
    
    // BACKWARD COMPATIBILITY: Support roles (deprecated)
    if (roles !== undefined && Array.isArray(roles)) {
      firestoreUpdatePayload.roles = roles;
      firestoreUpdatePayload.role = roles[0] || role;
    } else if (role !== undefined) {
      firestoreUpdatePayload.role = role;
      firestoreUpdatePayload.roles = [role];
    }
    if (expertise !== undefined) {
        firestoreUpdatePayload.expertise = expertise;
    } else {
        // Clear expertise if user doesn't have requests:approve permission
        const userPerms = permissions && Array.isArray(permissions) ? permissions : [];
        if (!userPerms.includes('requests:approve')) {
            firestoreUpdatePayload.expertise = '';
        }
    }
    if (baseSalary !== undefined) {
        firestoreUpdatePayload.baseSalary = baseSalary;
    }
    if (annualLeaveEntitlement !== undefined) {
        firestoreUpdatePayload.annualLeaveEntitlement = annualLeaveEntitlement;
    }
    if (disabled !== undefined) {
        authUpdatePayload.disabled = disabled;
        firestoreUpdatePayload.disabled = disabled;
    }
    if (startDate !== undefined) {
        // Convert ISO string to Firestore Timestamp
        const admin = require('firebase-admin');
        if (startDate) {
            firestoreUpdatePayload.startDate = admin.firestore.Timestamp.fromDate(new Date(startDate));
        } else {
            firestoreUpdatePayload.startDate = admin.firestore.FieldValue.delete();
        }
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
    
    return NextResponse.json({ message: 'User updated successfully' });

  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error updating user ${uid}:`, error);
    }
    const errorMessage = error.message || `An unexpected error occurred while updating user.`;
    return NextResponse.json({ message: errorMessage, error: error.code || 'UNKNOWN_ERROR' }, { status: 500 });
  }
}


// DELETE /api/users/[uid] - Delete a user
export async function DELETE(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  
  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    // Initialize Firebase Admin with proper error handling
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);
    const db = getFirestore(app);

    // Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // Delete from Firestore
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.delete();
    
    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error deleting user ${uid}:`, error);
    }
    let errorMessage = error.message || 'An unexpected error occurred.';
    let statusCode = 500;

    // Handle specific Firebase Admin initialization errors
    if (error.message?.includes('SERVICE_ACCOUNT_KEY')) {
      errorMessage = 'Firebase Admin SDK not configured. Please check your SERVICE_ACCOUNT_KEY environment variable.';
      statusCode = 503; // Service Unavailable
    } else if (error.code === 'auth/user-not-found') {
        // If user not in Auth, still try to delete from Firestore for cleanup
        try {
            const app = await initializeAdminApp();
            const db = getFirestore(app);
            await db.collection('users').doc(uid).delete();
            return NextResponse.json({ message: 'User deleted from Firestore, as they were not found in Authentication.' });
        } catch (dbError: any) {
             errorMessage = `User not found in Firebase Authentication and also failed to be deleted from Firestore: ${dbError.message}`;
        }
    }
    
    return NextResponse.json({ 
      message: errorMessage, 
      error: error.code || 'UNKNOWN_ERROR' 
    }, { status: statusCode });
  }
}
