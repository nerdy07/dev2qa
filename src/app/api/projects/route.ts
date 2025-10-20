import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin-simple';
import { rateLimit, rateLimitKeyFromRequestHeaders } from '@/lib/rate-limit';

type ProjectDoc = {
  name: string;
  managerId?: string;
  status?: 'planning' | 'in_progress' | 'at_risk' | 'blocked' | 'completed';
  startAt?: FirebaseFirestore.Timestamp;
  endAt?: FirebaseFirestore.Timestamp;
  teamIds?: string[];
  scopePoints?: number;
  tags?: string[];
};

export async function GET(request: Request) {
  const key = rateLimitKeyFromRequestHeaders(request.headers);
  if (!rateLimit(`projects:list:${key}`, { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  }

  try {
    const db = getFirestore();

    // Fetch projects (optional collection) – if not present, derive from requests
    const projectsSnap = await db.collection('projects').get().catch(() => null);

    // Index requests by associatedProject (string in current app forms)
    const requestsSnap = await db.collection('requests').get();
    const byProject: Record<string, FirebaseFirestore.QueryDocumentSnapshot[]> = {};
    for (const doc of requestsSnap.docs) {
      const data = doc.data() as any;
      const key = (data.associatedProject || 'Unknown').toString();
      if (!byProject[key]) byProject[key] = [];
      byProject[key].push(doc);
    }

    const projects: any[] = [];

    if (projectsSnap && !projectsSnap.empty) {
      for (const p of projectsSnap.docs) {
        const pData = p.data() as ProjectDoc;
        const reqs = byProject[pData.name] || [];
        const total = reqs.length;
        const completed = reqs.filter(r => (r.data() as any).status === 'approved').length;
        const pending = reqs.filter(r => (r.data() as any).status === 'pending').length;
        const rejected = reqs.filter(r => (r.data() as any).status === 'rejected').length;
        const progressPct = total ? Math.round((completed / total) * 100) : 0;
        projects.push({
          id: p.id,
          name: pData.name,
          status: pData.status || (completed === total && total > 0 ? 'completed' : 'in_progress'),
          managerId: pData.managerId || null,
          teamIds: pData.teamIds || [],
          scopePoints: pData.scopePoints || total,
          tags: pData.tags || [],
          totals: { total, completed, pending, rejected },
          progressPct,
          startAt: pData.startAt?.toMillis?.() || null,
          endAt: pData.endAt?.toMillis?.() || null,
        });
      }
    } else {
      // Derive projects from requests only
      for (const projName of Object.keys(byProject)) {
        const reqs = byProject[projName];
        const total = reqs.length;
        const completed = reqs.filter(r => (r.data() as any).status === 'approved').length;
        const pending = reqs.filter(r => (r.data() as any).status === 'pending').length;
        const rejected = reqs.filter(r => (r.data() as any).status === 'rejected').length;
        const progressPct = total ? Math.round((completed / total) * 100) : 0;
        projects.push({
          id: projName,
          name: projName,
          status: completed === total && total > 0 ? 'completed' : 'in_progress',
          managerId: null,
          teamIds: [],
          scopePoints: total,
          tags: [],
          totals: { total, completed, pending, rejected },
          progressPct,
          startAt: null,
          endAt: null,
        });
      }
    }

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to aggregate projects' }, { status: 500 });
  }
}


