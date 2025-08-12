import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from '@hono/zod-validator';

const router = new Hono<{ Bindings: { POLKADOT_RPC_ENDPOINT: string } }>();

const connectSchema = z.object({
  wallet_address: z.string(),
  signature: z.string(),
  message: z.string()
});

router.post('/connect', validator('json', connectSchema), async (c) => {
  // TODO: Verify signature against message and wallet_address
  return c.json({ status: 'success', message: 'Wallet verified (stub)' });
});

router.get('/balance', async (c) => {
  const url = new URL(c.req.url);
  const wallet_address = url.searchParams.get('wallet_address');
  const token_symbols = (url.searchParams.get('token_symbols') || 'DOT').split(',');
  if (!wallet_address) return c.json({ status: 'error', message: 'wallet_address required' }, 400);
  // TODO: Query balances via PAPI endpoints (relay+parachains)
  const balances = Object.fromEntries(token_symbols.map((t) => [t, '0.0']));
  return c.json({ status: 'success', wallet_address, balances });
});

export default router;