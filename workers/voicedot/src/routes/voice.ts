import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from '@hono/zod-validator';
import { getDb } from '../db/client';
import { voiceSessions, transactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = new Hono<{ Bindings: { DB: D1Database; ELEVENLABS_API_KEY: string; ENCRYPTION_KEY: string } }>();

const processSchema = z.object({
  audio_data: z.string(),
  user_id: z.string(),
  format: z.enum(['mp3', 'wav', 'webm']).default('mp3')
});

router.post('/process', validator('json', processSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb(c.env);

  // TODO: ElevenLabs STT call using c.env.ELEVENLABS_API_KEY
  // For now, placeholder transcription and parsed intent
  const transcription = 'Pay 5 DOT to 14abc...';
  const parsedIntent = {
    type: 'payment',
    amount: '5',
    token: 'DOT',
    recipient: '14abcDEF...' // Polkadot address parsed
  };

  const sessionId = nanoid();
  const now = Date.now();

  await db.insert(voiceSessions).values({
    id: sessionId,
    userId: body.user_id,
    audioUrl: null,
    transcription,
    responseAudioUrl: null,
    responseText: null,
    createdAt: now
  });

  // Create pending transaction record
  const txId = nanoid();
  await db.insert(transactions).values({
    id: txId,
    userId: body.user_id,
    voiceCommand: transcription,
    parsedIntent: JSON.stringify(parsedIntent),
    recipientAddress: parsedIntent.recipient,
    amount: parsedIntent.amount,
    tokenSymbol: parsedIntent.token,
    status: 'pending',
    createdAt: now
  });

  // TODO: ElevenLabs TTS to read back confirmation text
  const responseText = `Do you want to send ${parsedIntent.amount} ${parsedIntent.token} to ${parsedIntent.recipient}?`;

  return c.json({
    status: 'confirmation_required',
    transaction_id: txId,
    parsed_intent: parsedIntent,
    response_text: responseText,
    // response_audio_url: 'https://...'
  });
});

const confirmSchema = z.object({
  audio_data: z.string().optional(),
  transaction_id: z.string(),
  user_id: z.string()
});

router.post('/confirm', validator('json', confirmSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb(c.env);

  // TODO: ElevenLabs STT to recognize yes/no
  const userSaidYes = true; // placeholder

  if (!userSaidYes) {
    await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, body.transaction_id));
    return c.json({ status: 'cancelled', message: 'Transaction cancelled by user' });
  }

  // Mark as confirmed (execution handled by /transactions/execute)
  await db.update(transactions).set({ status: 'confirmed', confirmedAt: Date.now() }).where(eq(transactions.id, body.transaction_id));

  return c.json({ status: 'success', message: 'Transaction confirmed, ready for execution' });
});

export default router;