type Key = string;

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<Key, BucketState> = new Map();
  constructor(private tokensPerInterval: number, private intervalMs: number, private burst: number) {}

  allow(key: Key): boolean {
    const now = Date.now();
    let state = this.buckets.get(key);
    if (!state) {
      state = { tokens: this.burst, lastRefill: now };
      this.buckets.set(key, state);
    }
    const elapsed = now - state.lastRefill;
    if (elapsed > 0) {
      const refill = (elapsed / this.intervalMs) * this.tokensPerInterval;
      state.tokens = Math.min(this.burst, state.tokens + refill);
      state.lastRefill = now;
    }
    if (state.tokens >= 1) {
      state.tokens -= 1;
      return true;
    }
    return false;
  }
}

export function getClientKey(req: Request, extra?: string): string {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  return `${ip}${extra ? ':' + extra : ''}`;
}