import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { WalletBalanceSchema, WalletConnectSchema } from '../utils/validators';
import { users, loginChallenges } from '../db/schema';
import { getTokenBalance } from '../integrations/balances';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export const wallet = new Hono<{ Bindings: Env }>();

wallet.post('/challenge', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const body = await c.req.json();
  const walletAddress = String(body?.wallet_address || '').trim();
  if (!walletAddress) return c.json({ error: 'wallet_address required' }, 400);
  const id = uuidv4();
  const nonce = uuidv4();
  const message = `VoiceDOT login nonce: ${nonce}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;
  await db.insert(loginChallenges).values({ id, walletAddress, nonce, message, expiresAt });
  return c.json({ challenge_id: id, message, expires_at: expiresAt });
});

wallet.post('/connect', async (c) => {
  const env = c.env;
  const db = getDb(env);
  const body = await c.req.json();
  const parsed = WalletConnectSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { wallet_address, signature, message } = parsed.data as any;

  const [challenge] = await db.select().from(loginChallenges).where(eq(loginChallenges.walletAddress, wallet_address));
  if (!challenge) return c.json({ error: 'no active challenge' }, 400);
  if (challenge.message !== message) return c.json({ error: 'message mismatch' }, 400);
  if (Date.now() > (challenge.expiresAt as any)) return c.json({ error: 'challenge expired' }, 400);

  try {
    await cryptoWaitReady();
    const result = signatureVerify(message, signature, wallet_address);
    if (!result.isValid) return c.json({ error: 'invalid signature' }, 400);
  } catch (e) {
    return c.json({ error: 'signature verification failed' }, 400);
  }

  await db.insert(users).values({ id: wallet_address, walletAddress: wallet_address, lastActive: Date.now() }).onConflictDoUpdate({
    target: users.id,
    set: { lastActive: Date.now() },
  });

  // Delete used challenge
  await db.delete(loginChallenges).where(eq(loginChallenges.id, challenge.id as any));

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