import { Env } from '../db/client';
import { Intent, IntentSchema } from '../utils/intent';

const SYSTEM_PROMPT = `You are a transaction intent parser for a voice-controlled Polkadot payments system.
Return ONLY JSON matching this schema:
{
  "type": "single" | "batch",
  "language": string,
  "items": [
    {
      "action": "transfer",
      "amount": string,           // human units as string
      "token": string,            // e.g., DOT, USDT, GLMR
      "recipient": string,        // address or contact name
      "origin_chain": string,     // e.g., polkadot, asset-hub-polkadot, moonbeam
      "destination_chain": string // same as above; if single-chain, equal to origin_chain
    }
  ],
  "schedule": string | null,      // ISO8601 or natural language time, or null
  "condition": string | null      // Conditional clause if any
}`;

export async function parseIntentWithPerplexity(env: Env, transcription: string): Promise<Intent> {
  if (!env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }
  const model = env.PERPLEXITY_MODEL || 'sonar-small-online';
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcription }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Perplexity API error: ${res.status} ${t}`);
  }
  const data = await res.json<any>();
  const content = data.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  const intent = IntentSchema.parse(parsed);
  // Normalize chains/tokens
  intent.items = intent.items.map((it) => ({
    ...it,
    token: it.token.toUpperCase(),
    origin_chain: normalizeChain(it.origin_chain, it.token),
    destination_chain: normalizeChain(it.destination_chain || it.origin_chain, it.token),
  }));
  return intent;
}

function normalizeChain(chain: string, token: string): string {
  const c = (chain || '').toLowerCase();
  if (c.includes('polkadot') || token.toUpperCase() === 'DOT') return 'polkadot';
  if (c.includes('asset') || c.includes('statemint') || token.toUpperCase() === 'USDT') return 'asset-hub-polkadot';
  if (c.includes('moonbeam') || token.toUpperCase() === 'GLMR') return 'moonbeam';
  return c || 'polkadot';
}