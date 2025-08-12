import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from '@hono/zod-validator';
import { getDb } from '../db/client';
import { transactions } from '../db/schema';
import { and, desc, eq } from 'drizzle-orm';

const router = new Hono<{ Bindings: { DB: D1Database; POLKADOT_RPC_ENDPOINT: string; RELAYER_URL: string } }>();

router.get('/', async (c) => {
  const db = getDb(c.env);
  const url = new URL(c.req.url);
  const user_id = url.searchParams.get('user_id') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const limit = Number(url.searchParams.get('limit') || '20');
  const offset = Number(url.searchParams.get('offset') || '0');

  const where = user_id && status
    ? and(eq(transactions.userId, user_id), eq(transactions.status, status))
    : user_id
      ? eq(transactions.userId, user_id)
      : undefined;

  const rows = await getDb(c.env).select().from(transactions).where(where as any).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset);
  return c.json({ status: 'success', transactions: rows });
});

router.get('/:id', async (c) => {
  const db = getDb(c.env);
  const id = c.req.param('id');
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!row) return c.json({ status: 'error', message: 'Not found' }, 404);
  return c.json({ status: 'success', transaction: row });
});

const executeSchema = z.object({
  transaction_id: z.string(),
  signed_extrinsic: z.string()
});

router.post('/execute', validator('json', executeSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb(c.env);

  // Proxy to relayer (existing Node backend) for broadcast
  try {
    const resp = await fetch(`${c.env.RELAYER_URL}/api/wallet/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedExtrinsic: body.signed_extrinsic })
    });
    if (!resp.ok) {
      const errTx = await resp.text();
      throw new Error(`Relayer failed: ${resp.status} ${errTx}`);
    }
    const data = await resp.json();
    await db.update(transactions).set({ status: 'completed', transactionHash: data.txHash || body.signed_extrinsic }).where(eq(transactions.id, body.transaction_id));
    return c.json({ status: 'success', message: 'Executed via relayer', txHash: data.txHash || body.signed_extrinsic });
  } catch (e: any) {
    await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, body.transaction_id));
    return c.json({ status: 'error', message: e.message }, 500);
  }
});

export default router;