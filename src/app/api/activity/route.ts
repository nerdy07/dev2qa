/**
 * Activity API Route
 * Fetches audit logs for entities or users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin-simple';
import type { AuditLog } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const entityId = searchParams.get('entityId');
        const userId = searchParams.get('userId');
        const action = searchParams.get('action');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const db = getFirestore();
        let query = db.collection('auditLogs');

        // Apply filters
        if (entityId) {
            query = query.where('entityId', '==', entityId) as any;
        }
        if (userId) {
            query = query.where('userId', '==', userId) as any;
        }
        if (action) {
            query = query.where('action', '==', action) as any;
        }

        // Order by createdAt descending (newest first)
        query = query.orderBy('createdAt', 'desc') as any;

        // Apply pagination
        if (offset > 0) {
            query = query.offset(offset) as any;
        }
        query = query.limit(limit) as any;

        const snapshot = await query.get();

        const activities: AuditLog[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as AuditLog[];

        return NextResponse.json({
            success: true,
            activities,
            count: activities.length,
            hasMore: activities.length === limit,
        });
    } catch (error: any) {
        console.error('Error fetching activities:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch activities',
            },
            { status: 500 }
        );
    }
}
