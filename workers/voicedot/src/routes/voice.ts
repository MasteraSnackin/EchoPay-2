import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from '@hono/zod-validator';
import { getDb } from '../utils/db';
import { transactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { elevenLabsSTT } from '../utils/elevenlabs';
import { nanoid } from 'nanoid';

const router = new Hono<{ Bindings: { DB: D1Database; ELEVENLABS_API_KEY: string; ELEVENLABS_VOICE_ID: string; ENCRYPTION_KEY: string } }>();

const processSchema = z.object({
  audio_data: z.string(),
  user_id: z.string(),
  format: z.enum(['mp3', 'wav', 'webm']).default('mp3')
});

async function elevenLabsTTS(apiKey: string, voiceId: string, text: string): Promise<string> {
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
  });
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`TTS failed: ${resp.status} ${errTxt}`);
  }
  // ElevenLabs returns audio/mpeg stream. Convert to base64.
  const arr = new Uint8Array(await resp.arrayBuffer());
  const b64 = btoa(String.fromCharCode(...arr));
  return `data:audio/mpeg;base64,${b64}`;
}

router.post('/process', validator('json', processSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb(c.env);

  const transcription = await elevenLabsSTT(c.env.ELEVENLABS_API_KEY, body.audio_data, body.format);

  // TODO: Parse transcription (NLP) properly. Static parse for now.
  const parsedIntent = {
    type: 'payment',
    amount: '5',
    token: 'DOT',
    recipient: '14abcDEF...'
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

  const responseText = `Do you want to send ${parsedIntent.amount} ${parsedIntent.token} to ${parsedIntent.recipient}?`;
  let responseAudioUrl: string | null = null;
  try {
    if (c.env.ELEVENLABS_VOICE_ID) {
      responseAudioUrl = await elevenLabsTTS(c.env.ELEVENLABS_API_KEY, c.env.ELEVENLABS_VOICE_ID, responseText);
    }
  } catch (e) {
    // ignore TTS failure and continue with text only
  }

  return c.json({
    status: 'confirmation_required',
    transaction_id: txId,
    parsed_intent: parsedIntent,
    response_text: responseText,
    response_audio_url: responseAudioUrl
  });
});

const confirmSchema = z.object({
  audio_data: z.string().optional(),
  transaction_id: z.string(),
  user_id: z.string()
});

function simpleYesNo(transcript: string): boolean | null {
  const t = transcript.toLowerCase();
  if (/(^|\b)(yes|yeah|yep|confirm|proceed)($|\b)/.test(t)) return true;
  if (/(^|\b)(no|nope|cancel|stop)($|\b)/.test(t)) return false;
  return null;
}

router.post('/confirm', validator('json', confirmSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb(c.env);

  const transcript = body.audio_data ? await elevenLabsSTT(c.env.ELEVENLABS_API_KEY, body.audio_data, 'mp3') : 'yes';
  const decision = simpleYesNo(transcript);
  if (decision === null) return c.json({ status: 'clarification', message: 'Please say Yes or No' }, 400);

  if (!decision) {
    await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, body.transaction_id));
    return c.json({ status: 'cancelled', message: 'Transaction cancelled by user' });
  }

  await db.update(transactions).set({ status: 'confirmed', confirmedAt: Date.now() }).where(eq(transactions.id, body.transaction_id));

  return c.json({ status: 'success', message: 'Transaction confirmed, ready for execution' });
});

export default router;