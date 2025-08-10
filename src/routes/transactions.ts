import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { ExecuteTxSchema } from '../utils/validators';
import { transactions } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { submitExtrinsic } from '../integrations/papi';
import { buildXcmTransferExtrinsic, estimateXcmFee } from '../integrations/xcm';
import { buildAssetHubUsdtTransfer, buildNativeTransfer } from '../integrations/transfers';
import { getTokenInfo } from '../integrations/tokens';

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
  const { transaction_id, signed_extrinsic, chain } = parsed.data;

  const [row] = await db.select().from(transactions).where(eq(transactions.id, transaction_id));
  if (!row) return c.json({ error: 'transaction not found' }, 404);
  if (row.status !== 'confirmed') return c.json({ error: 'transaction not confirmed' }, 400);

  const hash = await submitExtrinsic(env, signed_extrinsic, (chain as any) || 'polkadot');
  await db
    .update(transactions)
    .set({ transactionHash: hash, status: 'submitted', confirmedAt: Date.now() })
    .where(eq(transactions.id, transaction_id));

  return c.json({ transaction_hash: hash });
});

tx.post('/xcm/build', async (c) => {
  const body = await c.req.json();
  // Expect: { origin, destination, symbol, amount, sender, recipient }
  const { origin, destination, symbol, amount, sender, recipient } = body || {};
  if (!origin || !destination || !symbol || !amount || !sender || !recipient) {
    return c.json({ error: 'missing fields' }, 400);
  }
  try {
    const extrinsic = await buildXcmTransferExtrinsic({
      origin,
      destination,
      asset: { symbol, assetId: symbol === 'USDT' ? 1984 : undefined },
      amount,
      sender,
      recipient,
    });
    const hex = extrinsic.method.toHex();
    return c.json({ call_hex: hex });
  } catch (e: any) {
    return c.json({ error: String(e) }, 500);
  }
});

tx.post('/build', async (c) => {
  const body = await c.req.json();
  // Expect: { token, amount, recipient, origin_chain, destination_chain }
  const { token, amount, recipient, origin_chain, destination_chain } = body || {};
  if (!token || !amount || !recipient || !origin_chain || !destination_chain) {
    return c.json({ error: 'missing fields' }, 400);
  }
  const info = getTokenInfo(token);
  if (!info) return c.json({ error: 'unsupported token' }, 400);
  try {
    let hex: string;
    if (origin_chain === destination_chain) {
      const extrinsic = await buildNativeTransfer(origin_chain, token, recipient, amount);
      hex = extrinsic.method.toHex();
    } else {
      if (token.toUpperCase() === 'USDT') {
        const extrinsic = await buildAssetHubUsdtTransfer(recipient, amount);
        hex = extrinsic.method.toHex();
      } else {
        const extrinsic = await buildXcmTransferExtrinsic({
          origin: origin_chain,
          destination: destination_chain,
          asset: { symbol: token.toUpperCase(), assetId: token.toUpperCase() === 'USDT' ? 1984 : undefined },
          amount,
          sender: '0x',
          recipient,
        });
        hex = extrinsic.method.toHex();
      }
    }
    return c.json({ call_hex: hex });
  } catch (e: any) {
    return c.json({ error: String(e) }, 500);
  }
});

tx.get('/xcm/estimate', async (c) => {
  const url = new URL(c.req.url);
  const origin = (url.searchParams.get('origin') || '').toString();
  const destination = (url.searchParams.get('destination') || '').toString();
  const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
  const amount = (url.searchParams.get('amount') || '0').toString();
  const sender = (url.searchParams.get('sender') || '').toString();
  const recipient = (url.searchParams.get('recipient') || '').toString();
  if (!origin || !destination || !symbol || !amount || !recipient) {
    return c.json({ error: 'missing fields' }, 400);
  }
  try {
    const fee = await estimateXcmFee({ origin: origin as any, destination: destination as any, asset: { symbol: symbol as any, assetId: symbol === 'USDT' ? 1984 : undefined }, amount, sender, recipient });
    return c.json({ fee });
  } catch (e: any) {
    return c.json({ error: String(e) }, 500);
  }
});