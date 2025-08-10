import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { WalletBalanceSchema, WalletConnectSchema } from '../utils/validators';
import { users } from '../db/schema';
import { getTokenBalance } from '../integrations/balances';

export const wallet = new Hono<{ Bindings: Env }>();

wallet.post('/connect', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const body = await c.req.json();
  const parsed = WalletConnectSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { wallet_address } = parsed.data;
  const id = wallet_address;

  await db.insert(users).values({ id, walletAddress: wallet_address }).onConflictDoNothing();
  return c.json({ user_id: id });
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