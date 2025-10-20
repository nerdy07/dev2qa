type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private defaultTtlMs: number = 30_000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  del(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}


