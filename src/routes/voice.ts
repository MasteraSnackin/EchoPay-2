import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { VoiceProcessSchema, VoiceConfirmSchema } from '../utils/validators';
import { speechToText, textToSpeech } from '../integrations/elevenlabs';
import { encryptAesGcm } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import { transactions, voiceSessions, users } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { parseIntentWithPerplexity } from '../integrations/perplexity';
import { Intent } from '../utils/intent';
import { estimateXcmFee } from '../integrations/xcm';
import { getChainNativeTokenInfo } from '../integrations/tokens';
import { decimalToUnits, unitsToDecimal } from '../utils/units';
import { estimateNativeFee } from '../integrations/transfers';
import { isValidSs58Address } from '../utils/address';
import { RateLimiter, getClientKey, KvRateLimiter, allowWithDO } from '../utils/rateLimit';

export const voice = new Hono<{ Bindings: Env & { RLIMIT?: KVNamespace; RLIMIT_DO?: DurableObjectNamespace } }>();

const MAX_AUDIO_BASE64_SIZE = 5 * 1024 * 1024; // ~5MB base64
const ALLOWED_FORMATS = new Set(['mp3', 'wav', 'webm']);

const memLimiter = new RateLimiter(1, 1000, 5); // 1 token/sec, burst 5

async function limiterAllow(c: any, key: string): Promise<boolean> {
  const doNs: DurableObjectNamespace | undefined = c.env.RLIMIT_DO as any;
  const withDo = await allowWithDO(doNs, key, 1, 1000, 5);
  if (withDo !== undefined) return withDo;
  const kv: KVNamespace | undefined = c.env.RLIMIT as any;
  if (kv) {
    const kvLimiter = new KvRateLimiter(kv, 1, 1000, 5);
    return kvLimiter.allow(key);
  }
  return memLimiter.allow(key);
}

async function putAudioToR2(env: Env, key: string, data: ArrayBuffer, contentType: string): Promise<string | undefined> {
  if (!env.AUDIO) return undefined;
  await env.AUDIO.put(key, data, { httpMetadata: { contentType } });
  return `/r2/${key}`; // reverse proxy path if configured
}

voice.post('/process', async (c) => {
  const key = getClientKey(c.req.raw, 'voice:process');
  const allowed = await limiterAllow(c, key);
  if (!allowed) return c.json({ error: 'rate_limited' }, 429);
  const env = c.env;
  const body = await c.req.json();
  const parsed = VoiceProcessSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { audio_data, user_id, format } = parsed.data;

  if (!ALLOWED_FORMATS.has(format)) return c.json({ error: 'unsupported audio format' }, 415);
  if (audio_data.length > MAX_AUDIO_BASE64_SIZE) return c.json({ error: 'audio too large' }, 413);

  const db = getDb(env);
  await db.insert(users).values({ id: user_id, walletAddress: user_id }).onConflictDoNothing();

  const transcription = await speechToText(env, audio_data, format);

  let intent: Intent;
  if (env.PERPLEXITY_API_KEY) {
    try {
      intent = await parseIntentWithPerplexity(env, transcription);
    } catch (e) {
      intent = simpleFallbackIntent(transcription);
    }
  } else {
    intent = simpleFallbackIntent(transcription);
  }

  // Basic address validation for each item
  for (const item of intent.items) {
    if (!isValidSs58Address(item.recipient)) {
      return c.json({ error: `invalid recipient address: ${item.recipient}` }, 400);
    }
  }

  const txIds: string[] = [];
  for (const item of intent.items) {
    const txId = uuidv4();
    txIds.push(txId);
    await db.insert(transactions).values({
      id: txId,
      userId: user_id,
      voiceCommand: transcription,
      parsedIntent: JSON.stringify(item),
      recipientAddress: item.recipient,
      amount: item.amount,
      tokenSymbol: item.token,
      status: 'pending',
    });
  }

  const first = intent.items[0];
  const isXcm = first.origin_chain !== first.destination_chain;
  const originNative = getChainNativeTokenInfo(first.origin_chain as any);
  let feeHint = '';
  try {
    if (isXcm) {
      const fee = await estimateXcmFee({
        origin: first.origin_chain as any,
        destination: first.destination_chain as any,
        asset: { symbol: originNative.symbol as any },
        amount: decimalToUnits(first.amount, originNative.decimals),
        sender: user_id,
        recipient: first.recipient,
      });
      const feeHuman = unitsToDecimal(fee, originNative.decimals);
      feeHint = ` Estimated XCM fee about ${feeHuman} ${originNative.symbol} on ${first.origin_chain}.`;
    } else {
      const fee = await estimateNativeFee(first.origin_chain as any, originNative.symbol, user_id, first.recipient, first.amount);
      const feeHuman = unitsToDecimal(fee, originNative.decimals);
      feeHint = ` Estimated fee about ${feeHuman} ${originNative.symbol} on ${first.origin_chain}.`;
    }
  } catch {}

  const confirmText = intent.items.length > 1
    ? `You requested a batch of ${intent.items.length} transfers. First: send ${first.amount} ${first.token} on ${first.origin_chain} to ${shortAddr(first.recipient)}.${feeHint} Say confirm to proceed or cancel to abort.`
    : `You asked to send ${first.amount} ${first.token} on ${first.origin_chain} to ${shortAddr(first.recipient)}.${feeHint} Say confirm to proceed or cancel to abort.`;
  const confirmAudio = await textToSpeech(env, confirmText);
  const encrypted = await encryptAesGcm(env.ENCRYPTION_KEY, confirmAudio);

  const sessionId = uuidv4();
  let audioUrl: string | undefined;
  try {
    audioUrl = await putAudioToR2(env, `tts/${sessionId}.mp3`, confirmAudio, 'audio/mpeg');
  } catch {}

  await db.insert(voiceSessions).values({ id: sessionId, userId: user_id, transcription, responseText: confirmText, responseAudioUrl: audioUrl });

  return c.json({ transaction_ids: txIds, session_id: sessionId, intent, confirmation: { audio_base64: encrypted.ciphertext, iv: encrypted.iv, format: 'mp3', audio_url: audioUrl } });
});

voice.post('/confirm', async (c) => {
  const key = getClientKey(c.req.raw, 'voice:confirm');
  const allowed = await limiterAllow(c, key);
  if (!allowed) return c.json({ error: 'rate_limited' }, 429);
  const env = c.env;
  const body = await c.req.json();
  const parsed = VoiceConfirmSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { audio_data, user_id } = parsed.data as any;
  const ids: string[] = parsed.data.transaction_ids ?? (parsed.data.transaction_id ? [parsed.data.transaction_id] : []);

  if (audio_data && audio_data.length > MAX_AUDIO_BASE64_SIZE) return c.json({ error: 'audio too large' }, 413);

  const db = getDb(env);
  const found = ids.length ? await db.select().from(transactions).where(inArray(transactions.id, ids)) : [];
  if (!found.length) return c.json({ error: 'transaction(s) not found' }, 404);
  if (found.some((t) => t.status !== 'pending')) return c.json({ error: 'one or more transactions not pending' }, 400);

  const transcription = await speechToText(env, audio_data, 'webm');
  const lower = transcription.trim().toLowerCase();
  let decision: 'confirmed' | 'failed' = 'failed';
  let message = 'Cancelled';
  if (lower.includes('confirm') || lower.includes('yes')) {
    decision = 'confirmed';
    message = 'Confirmed';
    await db.update(transactions).set({ status: 'confirmed' }).where(inArray(transactions.id, ids));
  } else if (lower.includes('cancel') || lower.includes('no')) {
    decision = 'failed';
    message = 'Cancelled';
    await db.update(transactions).set({ status: 'failed' }).where(inArray(transactions.id, ids));
  }

  const responseAudio = await textToSpeech(env, `Transaction ${message}.`);
  const encrypted = await encryptAesGcm(env.ENCRYPTION_KEY, responseAudio);

  const sessionId = uuidv4();
  let audioUrl: string | undefined;
  try {
    audioUrl = await putAudioToR2(env, `tts/${sessionId}.mp3`, responseAudio, 'audio/mpeg');
  } catch {}

  await db.insert(voiceSessions).values({ id: sessionId, userId: user_id, transcription, responseText: `Transaction ${message}.`, responseAudioUrl: audioUrl });

  return c.json({ status: decision, transaction_ids: ids, response: { audio_base64: encrypted.ciphertext, iv: encrypted.iv, format: 'mp3', audio_url: audioUrl } });
});

function simpleFallbackIntent(text: string): Intent {
  const words = text.split(/\s+/);
  const amountIdx = words.findIndex((w) => /^(send|transfer)$/i.test(w));
  let amount = '0';
  let token = 'DOT';
  let recipient = '';
  if (amountIdx >= 0 && words[amountIdx + 1]) amount = words[amountIdx + 1];
  const tokenIdx = amountIdx + 2;
  if (words[tokenIdx]) token = words[tokenIdx].toUpperCase();
  const toIdx = words.findIndex((w) => /^to$/i.test(w));
  if (toIdx >= 0 && words[toIdx + 1]) recipient = words[toIdx + 1];
  return {
    type: 'single',
    language: 'en',
    items: [ { action: 'transfer', amount, token, recipient, origin_chain: 'polkadot', destination_chain: 'polkadot' } ],
    schedule: null,
    condition: null,
  };
}

function shortAddr(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}