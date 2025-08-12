import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from '@hono/zod-validator';

const router = new Hono<{ Bindings: { POLKADOT_RPC_ENDPOINT: string; RELAYER_URL: string } }>();

const connectSchema = z.object({
  wallet_address: z.string(),
  signature: z.string(),
  message: z.string()
});

router.post('/connect', validator('json', connectSchema), async (c) => {
  // Proxy signature verification to backend
  const body = c.req.valid('json');
  const resp = await fetch(`${c.env.RELAYER_URL}/api/wallet/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  return c.json(data, resp.status);
});

router.get('/balance', async (c) => {
  const url = new URL(c.req.url);
  const wallet_address = url.searchParams.get('wallet_address');
  if (!wallet_address) return c.json({ status: 'error', message: 'wallet_address required' }, 400);
  const resp = await fetch(`${c.env.RELAYER_URL}/api/wallet/balance/${wallet_address}`);
  const data = await resp.json();
  return c.json(data, resp.status);
});

export default router;