import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getFirestore } from '@/lib/firebase-admin-simple';
import { MemoryCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { User } from '@/lib/types';

export interface AuthenticatedRequest extends NextRequest {
  user: User;
}

export async function authenticateRequest(request: NextRequest): Promise<{ user: User; error?: string }> {
  try {
    // HTTP headers are case-insensitive, but Next.js normalizes them to lowercase
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null as any, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return { user: null as any, error: 'Token is empty' };
    }

    const adminAuth = getAuth();
    
    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get user data from Firestore
    const db = getFirestore();

    // Cache user doc reads briefly to cut repeated reads per request storm
    const cache = new MemoryCache<any>(15_000);
    const cacheKey = `user:${decodedToken.uid}`;
    let userData: User | undefined = cache.get(cacheKey);
    if (!userData) {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        return { user: null as any, error: 'User not found' };
      }
      userData = { id: decodedToken.uid, ...(userDoc.data() as User) };
      cache.set(cacheKey, userData);
    }
    logger.debug('Authenticated request', { uid: decodedToken.uid, role: userData.role });
    if (userData.disabled) {
      return { user: null as any, error: 'User account is disabled' };
    }

    return { user: userData };
  } catch (error: any) {
    logger.error('Authentication error', { 
      message: error?.message, 
      code: error?.code,
      stack: error?.stack 
    });
    
    // Provide more specific error messages
    if (error?.code === 'auth/id-token-expired') {
      return { user: null as any, error: 'Token expired. Please refresh and try again.' };
    }
    if (error?.code === 'auth/argument-error') {
      return { user: null as any, error: 'Invalid token format.' };
    }
    if (error?.code === 'auth/invalid-id-token') {
      return { user: null as any, error: 'Invalid token.' };
    }
    
    return { user: null as any, error: `Invalid token: ${error?.message || 'Unknown error'}` };
  }
}

export function requireAuth(handler: (request: AuthenticatedRequest, context: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context: any) => {
    const { user, error } = await authenticateRequest(request);
    
    if (error || !user) {
      // Return error in both 'error' and 'message' fields for compatibility
      return NextResponse.json({ 
        error: error || 'Unauthorized',
        message: error || 'Unauthorized'
      }, { status: 401 });
    }

    // Attach user to request object for runtime access
    (request as any).user = user;
    return handler(request as AuthenticatedRequest, context);
  };
}

export function requireRole(allowedRoles: string[]) {
  return (handler: (request: AuthenticatedRequest, context: any) => Promise<NextResponse>) => {
    return requireAuth(async (request: AuthenticatedRequest, context: any) => {
      if (!allowedRoles.includes(request.user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      return handler(request, context);
    });
  };
}

export function requireAdmin(handler: (request: AuthenticatedRequest, context: any) => Promise<NextResponse>) {
  return requireAuth(async (request: AuthenticatedRequest, context: any) => {
    // Ensure user is available
    if (!request.user) {
      return NextResponse.json({ error: 'User not found in request' }, { status: 401 });
    }
    
    // Check if user is admin by role OR by isAdmin flag
    const isAdminByRole = request.user.role === 'admin';
    const isAdminByFlag = request.user.isAdmin === true;
    
    if (!isAdminByRole && !isAdminByFlag) {
      logger.warn('Admin access denied', { 
        uid: request.user.id, 
        role: request.user.role, 
        isAdmin: request.user.isAdmin 
      });
      return NextResponse.json({ error: 'Insufficient permissions. Admin access required.' }, { status: 403 });
    }
    
    return handler(request, context);
  });
}
