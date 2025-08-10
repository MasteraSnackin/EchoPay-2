import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { ExecuteTxSchema } from '../utils/validators';
import { transactions } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { submitExtrinsic } from '../integrations/papi';
import { buildXcmTransferExtrinsic, estimateXcmFee } from '../integrations/xcm';
import { buildAssetHubUsdtTransfer, buildNativeTransfer, estimateNativeFee } from '../integrations/transfers';
import { getTokenInfo } from '../integrations/tokens';
import { decimalToUnits } from '../utils/units';

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
  const { transaction_id, signed_extrinsic, chain, token, min_receive, slippage_bps } = parsed.data as any;

  const [row] = await db.select().from(transactions).where(eq(transactions.id, transaction_id));
  if (!row) return c.json({ error: 'transaction not found' }, 404);
  if (row.status !== 'confirmed') return c.json({ error: 'transaction not confirmed' }, 400);

  if (token && token.toUpperCase() !== (row.tokenSymbol || '').toUpperCase()) {
    return c.json({ error: 'token does not match prepared transaction' }, 400);
  }

  // Server-side validation for cross-chain safety
  try {
    const parsedIntent = JSON.parse(row.parsedIntent || '{}');
    const origin = parsedIntent.origin_chain;
    const destination = parsedIntent.destination_chain;
    const isXcm = origin && destination && origin !== destination;
    if (isXcm) {
      const info = getTokenInfo((token || row.tokenSymbol) as string);

      // Guard against weakening/removal of previously logged min_receive
      const priorMinReceive: string | undefined = parsedIntent?.constraints?.min_receive;
      if (priorMinReceive) {
        if (!min_receive) {
          return c.json({ error: 'min_receive required by prior constraints' }, 400);
        }
        if (info) {
          const priorUnits = decimalToUnits(priorMinReceive, info.decimals);
          const providedUnits = decimalToUnits(min_receive, info.decimals);
          if (BigInt(providedUnits) < BigInt(priorUnits)) {
            return c.json({ error: 'min_receive weaker than previously set' }, 400);
          }
        }
      }

      if (min_receive) {
        if (info) {
          const minUnits = decimalToUnits(min_receive, info.decimals);
          const amtUnits = decimalToUnits(parsedIntent.amount, info.decimals);
          if (BigInt(minUnits) > BigInt(amtUnits)) {
            return c.json({ error: 'min_receive exceeds transfer amount' }, 400);
          }
        }
      }
      if (slippage_bps != null) {
        if (slippage_bps < 0 || slippage_bps > 10000) {
          return c.json({ error: 'invalid slippage_bps' }, 400);
        }
      }

      // Log constraints into parsed_intent for audit
      const updatedIntent = {
        ...parsedIntent,
        constraints: {
          ...(parsedIntent.constraints || {}),
          min_receive: min_receive ?? parsedIntent.constraints?.min_receive,
          slippage_bps: slippage_bps ?? parsedIntent.constraints?.slippage_bps,
          token: (token || row.tokenSymbol),
          chain: chain || origin,
        },
      };
      await db
        .update(transactions)
        .set({ parsedIntent: JSON.stringify(updatedIntent) })
        .where(eq(transactions.id, transaction_id));
    }
  } catch {}

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
  // Expect: { token, amount, recipient, origin_chain, destination_chain, min_receive, slippage_bps }
  const { token, amount, recipient, origin_chain, destination_chain, min_receive, slippage_bps } = body || {};
  if (!token || !amount || !recipient || !origin_chain || !destination_chain) {
    return c.json({ error: 'missing fields' }, 400);
  }
  const info = getTokenInfo(token);
  if (!info) return c.json({ error: 'unsupported token' }, 400);
  try {
    let hex: string;
    let fee: string | undefined;
    if (origin_chain === destination_chain) {
      const extrinsic = await buildNativeTransfer(origin_chain, token, recipient, amount);
      hex = extrinsic.method.toHex();
      fee = await estimateNativeFee(origin_chain, token, recipient, recipient, amount);
    } else {
      if (token.toUpperCase() === 'USDT') {
        const extrinsic = await buildAssetHubUsdtTransfer(recipient, amount);
        hex = extrinsic.method.toHex();
        // Native fee here is paid in origin native token; omit for simplicity
      } else {
        const extrinsic = await buildXcmTransferExtrinsic({
          origin: origin_chain,
          destination: destination_chain,
          asset: { symbol: token.toUpperCase(), assetId: token.toUpperCase() === 'USDT' ? 1984 : undefined },
          amount,
          sender: '0x',
          recipient,
          minReceive: min_receive ? decimalToUnits(min_receive, info.decimals) : undefined,
        });
        hex = extrinsic.method.toHex();
        fee = await estimateXcmFee({
          origin: origin_chain,
          destination: destination_chain,
          asset: { symbol: token.toUpperCase() as any, assetId: token.toUpperCase() === 'USDT' ? 1984 : undefined },
          amount,
          sender: recipient,
          recipient,
          minReceive: min_receive ? decimalToUnits(min_receive, info.decimals) : undefined,
        });
      }
    }
    return c.json({ call_hex: hex, fee });
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
  const minReceive = (url.searchParams.get('min_receive') || '').toString();
  if (!origin || !destination || !symbol || !amount || !recipient) {
    return c.json({ error: 'missing fields' }, 400);
  }
  try {
    const fee = await estimateXcmFee({ origin: origin as any, destination: destination as any, asset: { symbol: symbol as any, assetId: symbol === 'USDT' ? 1984 : undefined }, amount, sender, recipient, minReceive: minReceive || undefined });
    return c.json({ fee });
  } catch (e: any) {
    return c.json({ error: String(e) }, 500);
  }
});