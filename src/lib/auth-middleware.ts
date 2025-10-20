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
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null as any, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
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
    logger.error('Authentication error', { message: error?.message, stack: error?.stack });
    return { user: null as any, error: 'Invalid token' };
  }
}

export function requireAuth(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const { user, error } = await authenticateRequest(request);
    
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    return handler(request as AuthenticatedRequest);
  };
}

export function requireRole(allowedRoles: string[]) {
  return (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) => {
    return requireAuth(async (request: AuthenticatedRequest) => {
      if (!allowedRoles.includes(request.user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      return handler(request);
    });
  };
}

export function requireAdmin(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return requireRole(['admin'])(handler);
}
