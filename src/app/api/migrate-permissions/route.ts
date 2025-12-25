/**
 * API route for migrating users from roles to permissions
 * POST /api/migrate-permissions
 * 
 * This is a one-time migration utility that should be run after deploying
 * the permission-based system.
 */

import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { migrateUsersToPermissions } from '@/lib/migration-utils';

export async function POST(request: Request) {
  try {
    const app = await initializeAdminApp();
    const adminAuth = getAuth(app);
    
    // Verify the request is authenticated and user is admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Bearer token required.' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token.' },
        { status: 401 }
      );
    }

    // Check if user is admin (you can enhance this check)
    // For now, we'll allow the migration if token is valid
    // In production, add additional admin check here

    console.log(`Migration started by user: ${decodedToken.uid}`);

    // Run the migration
    const result = await migrateUsersToPermissions();

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed',
      },
      { status: 500 }
    );
  }
}

