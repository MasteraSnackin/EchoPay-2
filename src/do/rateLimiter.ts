export class RateLimiterDO implements DurableObject {
  private state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/allow') {
      const key = url.searchParams.get('key') || 'unknown';
      const tokensPerInterval = Number(url.searchParams.get('tpi') || '1');
      const intervalMs = Number(url.searchParams.get('interval') || '1000');
      const burst = Number(url.searchParams.get('burst') || '5');

      const now = Date.now();
      const stateRaw: any = await this.state.storage.get(key);
      const bucket = stateRaw || { tokens: burst, lastRefill: now };
      const elapsed = now - bucket.lastRefill;
      if (elapsed > 0) {
        const refill = (elapsed / intervalMs) * tokensPerInterval;
        bucket.tokens = Math.min(burst, bucket.tokens + refill);
        bucket.lastRefill = now;
      }
      let allowed = false;
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        allowed = true;
      }
      await this.state.storage.put(key, bucket, { allowConcurrency: true });
      return new Response(JSON.stringify({ allowed }), { status: allowed ? 200 : 429, headers: { 'content-type': 'application/json' } });
    }
    return new Response('Not found', { status: 404 });
  }
}