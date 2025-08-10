import { drizzle } from 'drizzle-orm/d1';

export type Env = {
  DB: D1Database;
  AUDIO?: R2Bucket;
  POLKADOT_RPC_ENDPOINT?: string;
  ASSETHUB_RPC_ENDPOINT?: string;
  MOONBEAM_RPC_ENDPOINT?: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID?: string;
  PERPLEXITY_API_KEY?: string;
  PERPLEXITY_MODEL?: string;
  ENCRYPTION_KEY?: string;
};

export function getDb(env: Env) {
  return drizzle(env.DB);
}