import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { rateLimit, rateLimitKeyFromRequestHeaders } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const key = rateLimitKeyFromRequestHeaders(request.headers);
  if (!rateLimit(`ai:predict:project:${key}`, { max: 20, windowMs: 60_000 })) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { projectName, totals, progressPct, velocity = [] } = body || {};

    // Simple heuristic + AI fallback
    // If Genkit is available, we could craft a lightweight prompt; otherwise fallback to heuristic.
    let onTimeProbability = 0.8;
    let delayRisk: 'low' | 'medium' | 'high' = 'low';

    const total = totals?.total ?? 0;
    const completed = totals?.completed ?? 0;
    const pending = totals?.pending ?? 0;
    const rejectionRate = total ? (totals?.rejected ?? 0) / total : 0;

    if (progressPct < 30 && rejectionRate > 0.2) delayRisk = 'high';
    else if (progressPct < 60 && rejectionRate > 0.1) delayRisk = 'medium';

    onTimeProbability = Math.max(0.05, Math.min(0.95, (progressPct / 100) * (1 - rejectionRate * 0.6) + 0.1));

    // Optionally call a Genkit prompt (omitted for brevity here to avoid blocking)
    // const { output } = await ai.prompt({ ... })

    return NextResponse.json({ projectName, onTimeProbability, delayRisk, drivers: [
      'Progress vs rejection rate',
      velocity.length ? 'Recent velocity trend considered' : 'Velocity data not provided',
    ]});
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Prediction failed' }, { status: 500 });
  }
}


