import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin-simple';
import { MemoryCache } from '@/lib/cache';
import { rateLimit, rateLimitKeyFromRequestHeaders } from '@/lib/rate-limit';

const listCache = new MemoryCache<any>(20_000); // 20s TTL

export async function GET(request: Request) {
  // Rate limit listing
  const key = rateLimitKeyFromRequestHeaders(request.headers);
  if (!rateLimit(`list-users:${key}`, { max: 30, windowMs: 60_000 })) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const limitParam = Number(searchParams.get('limit') || '50');
  const limitNum = Math.min(Math.max(1, limitParam), 200);

  const cacheKey = `users:list:role=${role || 'any'}:limit=${limitNum}`;
  const cached = listCache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const db = getFirestore();
    let queryRef: FirebaseFirestore.Query = db.collection('users');
    if (role) {
      queryRef = queryRef.where('role', '==', role);
    }
    queryRef = queryRef.limit(limitNum);

    const snap = await queryRef.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    listCache.set(cacheKey, data);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to list users' }, { status: 500 });
  }
}


