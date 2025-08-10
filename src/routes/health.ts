import { Hono } from 'hono';
import { Env } from '../db/client';
import { getApiForChain } from '../integrations/chains';

export const health = new Hono<{ Bindings: Env }>();

health.get('/health', (c) => {
  return c.json({ ok: true, service: 'voicedot-api', time: Date.now() });
});

health.get('/status/polkadot', async (c) => {
  try {
    const api = await getApiForChain('polkadot');
    const header = await api.rpc.chain.getHeader();
    return c.json({ connected: true, block: header.number.toString() });
  } catch (e: any) {
    return c.json({ connected: false, error: String(e) }, 500);
  }
});