import { NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@/lib/firebase-admin-simple';

// PATCH /api/users/[uid] - Update user details or activation status
export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  const { uid } = params;
  const body = await request.json();

  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const adminAuth = getAuth();
    const db = getFirestore();
    
    const { name, role, expertise, baseSalary, annualLeaveEntitlement, disabled } = body;
    
    const authUpdatePayload: any = {};
    const firestoreUpdatePayload: any = {};

    if (name !== undefined) {
      authUpdatePayload.displayName = name;
      firestoreUpdatePayload.name = name;
    }
    if (role !== undefined) {
      firestoreUpdatePayload.role = role;
    }
    if (expertise !== undefined) {
        firestoreUpdatePayload.expertise = expertise;
    } else if (role && role !== 'qa_tester') {
        firestoreUpdatePayload.expertise = ''; // Clear expertise if role is not QA tester
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
    console.error(`Error updating user ${uid}:`, error);
    const errorMessage = error.message || `An unexpected error occurred while updating user.`;
    return NextResponse.json({ message: errorMessage, error: error.code || 'UNKNOWN_ERROR' }, { status: 500 });
  }
}


// DELETE /api/users/[uid] - Delete a user
export async function DELETE(request: Request, { params }: { params: { uid: string } }) {
  const { uid } = params;
  
  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const adminAuth = getAuth();
    const db = getFirestore();

    // Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // Delete from Firestore
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.delete();
    
    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error: any) {
    console.error(`Error deleting user ${uid}:`, error);
    let errorMessage = error.message || 'An unexpected error occurred.';

    if (error.code === 'auth/user-not-found') {
        // If user not in Auth, still try to delete from Firestore for cleanup
        try {
            const db = getFirestore();
            await db.collection('users').doc(uid).delete();
            return NextResponse.json({ message: 'User deleted from Firestore, as they were not found in Authentication.' });
        } catch (dbError: any) {
             errorMessage = `User not found in Firebase Authentication and also failed to be deleted from Firestore: ${dbError.message}`;
        }
    }
    
    return NextResponse.json({ message: errorMessage, error: error.code || 'UNKNOWN_ERROR' }, { status: 500 });
  }
}
