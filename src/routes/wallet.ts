import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { WalletBalanceSchema, WalletConnectSchema } from '../utils/validators';
import { users } from '../db/schema';
import { getBalance } from '../integrations/papi';

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
  const env = c.env;
  const url = new URL(c.req.url);
  const parsed = WalletBalanceSchema.safeParse({
    wallet_address: url.searchParams.get('wallet_address') ?? '',
    token_symbols: url.searchParams.get('token_symbols') ?? undefined,
  });
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { wallet_address, token_symbols } = parsed.data;
  const symbols = (token_symbols || 'DOT').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

  const balances: Record<string, string> = {};
  if (symbols.includes('DOT')) {
    balances.DOT = await getBalance(env, wallet_address, 'polkadot');
  }
  // TODO: USDT on Asset Hub, GLMR on Moonbeam, etc.

  return c.json({ balances });
});