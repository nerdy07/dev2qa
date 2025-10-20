type RequestBucket = {
  timestamps: number[];
};

const store = new Map<string, RequestBucket>();

export function rateLimit(key: string, opts: { max: number; windowMs: number }): boolean {
  const now = Date.now();
  const bucket = store.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < opts.windowMs);
  if (bucket.timestamps.length >= opts.max) {
    store.set(key, bucket);
    return false;
  }
  bucket.timestamps.push(now);
  store.set(key, bucket);
  return true;
}

export function rateLimitKeyFromRequestHeaders(headers: Headers): string {
  // Prefer auth uid header if present, else IP (x-forwarded-for), else fallback
  const uid = headers.get('x-user-uid');
  if (uid) return `uid:${uid}`;
  const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip');
  if (ip) return `ip:${ip}`;
  return 'anon:global';
}

