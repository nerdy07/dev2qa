
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
  permissions: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  expertise: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  annualLeaveEntitlement: z.number().min(0).optional(),
  disabled: z.boolean().optional(),
  startDate: z.string().optional(),
});

// PATCH /api/users/[uid] - Update user details or activation status
async function updateUserHandler(request: AuthenticatedRequest, context: { params?: Promise<{ uid: string }> | { uid: string } } | { params: Promise<{ uid: string }> | { uid: string } }) {
  if (!context || !context.params) {
    return NextResponse.json({ message: 'Missing route parameters' }, { status: 400 });
  }
  
  // Handle both async and sync params (Next.js 15+ uses Promise, older versions use direct object)
  const params = 'then' in context.params ? await context.params : context.params;
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
    
    const { name, role, permissions, roles, expertise, baseSalary, annualLeaveEntitlement, disabled, startDate } = validationResult.data;
    
    const authUpdatePayload: any = {};
    const firestoreUpdatePayload: any = {};

    if (name !== undefined) {
      const safeName = sanitizeString(name);
      authUpdatePayload.displayName = safeName;
      firestoreUpdatePayload.name = safeName;
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
        // Note: Firebase Auth doesn't support a 'disabled' field
        // We only update it in Firestore, and the app logic handles disabled users
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
async function deleteUserHandler(request: AuthenticatedRequest, context: { params?: Promise<{ uid: string }> | { uid: string } } | { params: Promise<{ uid: string }> | { uid: string } }) {
  if (!context || !context.params) {
    return NextResponse.json({ message: 'Missing route parameters' }, { status: 400 });
  }
  
  // Handle both async and sync params (Next.js 15+ uses Promise, older versions use direct object)
  const params = 'then' in context.params ? await context.params : context.params;
  const { uid } = params;
  
  if (!uid) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    // Initialize Firebase Admin with proper error handling
    const adminAuth = getAuth();
    const db = getFirestore();

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
            const db = getFirestore();
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
