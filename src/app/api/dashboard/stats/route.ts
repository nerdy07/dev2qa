import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin-simple';
import { MemoryCache } from '@/lib/cache';
import { rateLimit, rateLimitKeyFromRequestHeaders } from '@/lib/rate-limit';

const statsCache = new MemoryCache<any>(15_000); // 15s TTL for dashboard stats

export async function GET(request: Request) {
  const key = rateLimitKeyFromRequestHeaders(request.headers);
  if (!rateLimit(`dashboard-stats:${key}`, { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  }

  const cacheKey = 'dashboard:stats:v1';
  const cached = statsCache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const db = getFirestore();

    // Note: For large datasets, prefer Firestore count aggregation.
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;
    const qaTesters = usersSnap.docs.filter(d => (d.data() as any).role === 'qa_tester').length;

    const reqSnap = await db.collection('requests').get();
    const totalRequests = reqSnap.size;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const doc of reqSnap.docs) {
      const status = (doc.data() as any).status;
      if (status === 'pending') pending++;
      else if (status === 'approved') approved++;
      else if (status === 'rejected') rejected++;
    }

    const data = {
      users: { total: totalUsers, qaTesters },
      requests: { total: totalRequests, pending, approved, rejected },
      generatedAt: Date.now(),
    };

    statsCache.set(cacheKey, data);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to load stats' }, { status: 500 });
  }
}


