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

export const voice = new Hono<{ Bindings: Env }>();

voice.post('/process', async (c) => {
  const env = c.env;
  const body = await c.req.json();
  const parsed = VoiceProcessSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { audio_data, user_id, format } = parsed.data;

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
  await db.insert(voiceSessions).values({ id: sessionId, userId: user_id, transcription, responseText: confirmText });

  return c.json({ transaction_ids: txIds, session_id: sessionId, intent, confirmation: { audio_base64: encrypted.ciphertext, iv: encrypted.iv, format: 'mp3' } });
});

voice.post('/confirm', async (c) => {
  const env = c.env;
  const body = await c.req.json();
  const parsed = VoiceConfirmSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { audio_data, user_id } = parsed.data as any;
  const ids: string[] = parsed.data.transaction_ids ?? (parsed.data.transaction_id ? [parsed.data.transaction_id] : []);

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
  await db.insert(voiceSessions).values({ id: sessionId, userId: user_id, transcription, responseText: `Transaction ${message}.` });

  return c.json({ status: decision, transaction_ids: ids, response: { audio_base64: encrypted.ciphertext, iv: encrypted.iv, format: 'mp3' } });
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