# VoiceDOT Payment Platform (Cloudflare Workers)

Edge-native voice-to-blockchain API built with Hono, ElevenLabs (STT/TTS), and Polkadot API (PAPI). Stores logs in D1 via Drizzle.

## Stack
- Cloudflare Workers (Edge runtime)
- Hono (TypeScript API)
- ElevenLabs (STT/TTS)
- PAPI / @polkadot/api
- D1 + Drizzle ORM

## Env vars (wrangler)
- `ELEVENLABS_API_KEY`
- `POLKADOT_RPC_ENDPOINT` (default `wss://rpc.polkadot.io`)
- `ENCRYPTION_KEY` (for voice payloads)
- D1 binding `DB`

## Database schema
Tables: `users`, `transactions`, `voice_sessions` (see `src/db/schema.ts`).

## Endpoints
- `POST /voice/process` → STT, parse intent, create pending tx, TTS confirmation
- `POST /voice/confirm` → STT yes/no, mark tx confirmed/cancelled
- `GET /transactions` → list user transactions
- `GET /transactions/:id` → tx detail
- `POST /transactions/execute` → submit signed extrinsic (stub for now)
- `POST /wallet/connect` → verify signature (stub)
- `GET /wallet/balance` → balances via PAPI (stub)
- `GET /health`, `GET /status/polkadot`

## Dev
```bash
cd workers/voicedot
npm i
wrangler d1 create voicedot_db           # create D1 database, update wrangler.toml id
wrangler dev
```

## Deploy
```bash
wrangler deploy
```

## Notes
- ElevenLabs integration is stubbed; wire real STT/TTS calls in `routes/voice.ts`.
- PAPI submission is stubbed; add relayer/signer or client-side signing.