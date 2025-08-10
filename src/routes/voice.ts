import { Hono } from 'hono';
import { Env, getDb } from '../db/client';
import { VoiceProcessSchema, VoiceConfirmSchema } from '../utils/validators';
import { speechToText, textToSpeech } from '../integrations/elevenlabs';
import { encryptAesGcm } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import { transactions, voiceSessions, users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const voice = new Hono<{ Bindings: Env }>();

voice.post('/process', async (c) => {
  const env = c.env;
  const body = await c.req.json();
  const parsed = VoiceProcessSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { audio_data, user_id, format } = parsed.data;

  const db = getDb(env);
  // Ensure user exists
  await db.insert(users).values({ id: user_id, walletAddress: user_id }).onConflictDoNothing();

  // Transcribe
  const transcription = await speechToText(env, audio_data, format);

  // TODO: NLP intent parsing (Perplexity integration). For MVP, expect commands like: "send 1 DOT to <address>"
  const intent = simpleParseIntent(transcription);

  const txId = uuidv4();
  await db.insert(transactions).values({
    id: txId,
    userId: user_id,
    voiceCommand: transcription,
    parsedIntent: JSON.stringify(intent),
    recipientAddress: intent.recipient,
    amount: intent.amount,
    tokenSymbol: intent.token,
    status: 'pending',
  });

  // Generate confirmation speech
  const confirmText = `You asked to send ${intent.amount} ${intent.token} to ${shortAddr(intent.recipient)}. Say confirm to proceed or cancel to abort.`;
  const confirmAudio = await textToSpeech(env, confirmText);
  const encrypted = await encryptAesGcm(env.ENCRYPTION_KEY, confirmAudio);

  const sessionId = uuidv4();
  await db.insert(voiceSessions).values({
    id: sessionId,
    userId: user_id,
    transcription,
    responseText: confirmText,
  });

  return c.json({
    transaction_id: txId,
    session_id: sessionId,
    intent,
    confirmation: {
      audio_base64: encrypted.ciphertext,
      iv: encrypted.iv,
      format: 'mp3',
    },
  });
});

voice.post('/confirm', async (c) => {
  const env = c.env;
  const body = await c.req.json();
  const parsed = VoiceConfirmSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { audio_data, transaction_id, user_id } = parsed.data;

  const db = getDb(env);
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, transaction_id));
  if (!tx) return c.json({ error: 'transaction not found' }, 404);
  if (tx.status !== 'pending') return c.json({ error: 'transaction not pending' }, 400);

  const transcription = await speechToText(env, audio_data, 'webm');
  const lower = transcription.trim().toLowerCase();
  let decision: 'confirmed' | 'failed' = 'failed';
  let message = 'Cancelled';
  if (lower.includes('confirm') || lower.includes('yes')) {
    decision = 'confirmed';
    message = 'Confirmed';
    await db.update(transactions).set({ status: 'confirmed' }).where(eq(transactions.id, transaction_id));
  } else if (lower.includes('cancel') || lower.includes('no')) {
    decision = 'failed';
    message = 'Cancelled';
    await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, transaction_id));
  }

  const responseAudio = await textToSpeech(env, `Transaction ${message}.`);
  const encrypted = await encryptAesGcm(env.ENCRYPTION_KEY, responseAudio);

  const sessionId = uuidv4();
  await db.insert(voiceSessions).values({ id: sessionId, userId: user_id, transcription, responseText: `Transaction ${message}.` });

  return c.json({
    status: decision,
    response: {
      audio_base64: encrypted.ciphertext,
      iv: encrypted.iv,
      format: 'mp3',
    },
  });
});

function simpleParseIntent(text: string): { amount: string; token: string; recipient: string } {
  // Very naive intent parsing
  // Example: "send 1 DOT to 14abcd..."
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
  return { amount, token, recipient };
}

function shortAddr(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}