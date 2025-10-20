import { NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@/lib/firebase-admin-simple';
import { requireAdmin } from '@/lib/auth-middleware';
import { MemoryCache } from '@/lib/cache';
import { rateLimit, rateLimitKeyFromRequestHeaders } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['requester', 'qa_tester', 'admin']).optional(),
  expertise: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  annualLeaveEntitlement: z.number().min(0).optional(),
  disabled: z.boolean().optional(),
});

// PATCH /api/users/[uid] - Update user details or activation status
async function updateUserHandler(request: any, { params }: { params: { uid: string } }) {
  const { uid } = params;
  const body = await request.json();

  // Basic rate limiting: 30 updates / 60s per uid/ip
  const key = rateLimitKeyFromRequestHeaders(request.headers);
  if (!rateLimit(`update-user:${key}`, { max: 30, windowMs: 60_000 })) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  }

  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  // Validate input
  const validationResult = updateUserSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: 'Validation failed', 
      errors: validationResult.error.errors 
    }, { status: 400 });
  }

  try {
    const adminAuth = getAuth();
    const db = getFirestore();
    
    const { name, role, expertise, baseSalary, annualLeaveEntitlement, disabled } = validationResult.data;
    
    const authUpdatePayload: any = {};
    const firestoreUpdatePayload: any = {};

    if (name !== undefined) {
      const safeName = sanitizeString(name);
      authUpdatePayload.displayName = safeName;
      firestoreUpdatePayload.name = safeName;
    }
    if (role !== undefined) {
      firestoreUpdatePayload.role = role;
    }
    if (expertise !== undefined) {
        firestoreUpdatePayload.expertise = sanitizeString(expertise);
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
async function deleteUserHandler(request: any, { params }: { params: { uid: string } }) {
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

export const PATCH = requireAdmin(updateUserHandler);
export const DELETE = requireAdmin(deleteUserHandler);

// --- Cached GET: fetch a single user document ---
const userCache = new MemoryCache<any>(30_000); // 30s TTL

export async function GET(request: Request, { params }: { params: { uid: string } }) {
  const { uid } = params;
  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  const cacheKey = `user:${uid}`;
  const cached = userCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const db = getFirestore();
    const docRef = db.collection('users').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const data = { id: snap.id, ...snap.data() };
    userCache.set(cacheKey, data);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch user' }, { status: 500 });
  }
}
