import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { WalletBalanceSchema, WalletConnectSchema } from '../utils/validators';
import { users } from '../db/schema';
import { getTokenBalance } from '../integrations/balances';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';

export const wallet = new Hono<{ Bindings: Env }>();

wallet.post('/connect', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const body = await c.req.json();
  const parsed = WalletConnectSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { wallet_address, signature, message } = parsed.data as any;

  try {
    await cryptoWaitReady();
    const result = signatureVerify(message, signature, wallet_address);
    if (!result.isValid) {
      return c.json({ error: 'invalid signature' }, 400);
    }
  } catch (e) {
    return c.json({ error: 'signature verification failed' }, 400);
  }

  await db.insert(users).values({ id: wallet_address, walletAddress: wallet_address, lastActive: Date.now() }).onConflictDoUpdate({
    target: users.id,
    set: { lastActive: Date.now() },
  });
  return c.json({ user_id: wallet_address });
});

wallet.get('/balance', async (c) => {
  const url = new URL(c.req.url);
  const parsed = WalletBalanceSchema.safeParse({
    wallet_address: url.searchParams.get('wallet_address') ?? '',
    token_symbols: url.searchParams.get('token_symbols') ?? undefined,
  });
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { wallet_address, token_symbols } = parsed.data;
  const symbols = (token_symbols || 'DOT').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

  const balances: Record<string, string> = {};
  for (const sym of symbols) {
    try {
      balances[sym] = await getTokenBalance(wallet_address, sym as any);
    } catch {
      balances[sym] = '0';
    }
  }

  return c.json({ balances });
});