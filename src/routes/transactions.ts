import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { ExecuteTxSchema } from '../utils/validators';
import { transactions } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { submitExtrinsic } from '../integrations/papi';

export const tx = new Hono<{ Bindings: Env }>();

tx.get('/', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const url = new URL(c.req.url);
  const userId = url.searchParams.get('user_id') ?? '';
  const status = url.searchParams.get('status') ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const where = status ? and(eq(transactions.userId, userId), eq(transactions.status, status)) : eq(transactions.userId, userId);
  const rows = await db.select().from(transactions).where(where).limit(limit).offset(offset);
  return c.json({ items: rows });
});

tx.get('/:id', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const id = c.req.param('id');
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(row);
});

tx.post('/execute', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const body = await c.req.json();
  const parsed = ExecuteTxSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { transaction_id, signed_extrinsic } = parsed.data;

  const [row] = await db.select().from(transactions).where(eq(transactions.id, transaction_id));
  if (!row) return c.json({ error: 'transaction not found' }, 404);
  if (row.status !== 'confirmed') return c.json({ error: 'transaction not confirmed' }, 400);

  const hash = await submitExtrinsic(env, signed_extrinsic);
  await db
    .update(transactions)
    .set({ transactionHash: hash, status: 'submitted', confirmedAt: Date.now() })
    .where(eq(transactions.id, transaction_id));

  return c.json({ transaction_hash: hash });
});