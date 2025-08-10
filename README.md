# VoiceDOT Payment Platform (EchoPay-2 backend)

Edge API on Cloudflare Workers using Hono. Enables voice-controlled payments on Polkadot with NLP intent parsing, balances, XCM scaffolding, and TTS confirmations.

## Stack
- Cloudflare Workers + Hono
- Cloudflare D1 (Drizzle ORM)
- R2 for audio storage (encrypted at rest)
- KV for rate limiting (Durable Objects recommended for prod)
- ElevenLabs (STT/TTS)
- @polkadot/api (Polkadot RPC)
- Perplexity.ai (NLP intent parsing, optional)

## Features
- Voice processing: `/voice/process` (STT → NLP intent) and `/voice/confirm`
- Wallet auth: challenge + signature verification with sr25519/ed25519
- Transactions: history, build, execute, XCM fee estimate
- Balances: DOT (relay), USDT (Asset Hub), GLMR (Moonbeam)
- XCM: DOT teleport (Relay ↔ Asset Hub), USDT Asset Hub → Moonbeam (reserve transfer)
- Security: AES-GCM for audio payloads, rate limiting, size/format validation
- Docs & Demo: Swagger UI at `/docs`, browser demo at `/demo`

## Requirements
- Node 18+
- Cloudflare Wrangler 4+
- Cloudflare account with D1, R2, KV enabled

## Install
```
npm install
```

## Environment & Secrets
Configure in `wrangler.toml`. Sensitive values via Wrangler secrets.

Required secrets (both prod and staging as needed):
```
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put ENCRYPTION_KEY   # base64 32-byte key (e.g., openssl rand -base64 32)
# Optional
npx wrangler secret put PERPLEXITY_API_KEY
```

Optional RPC overrides (already set for staging):
- `POLKADOT_RPC_ENDPOINT`
- `ASSETHUB_RPC_ENDPOINT`
- `MOONBEAM_RPC_ENDPOINT`

## Database
Generate and apply migrations locally:
```
npm run migrate
```

Apply migrations to staging (remote):
```
npm run migrate:staging
```

## Run (Local)
```
npm run dev           # local dev with local D1
npm run dev:staging   # dev using staging env RPCs/bindings
```

## Deploy
- Production:
```
npm run deploy
```
- Staging:
```
npm run deploy:staging
```

## Provision (Staging)
Create resources, then update IDs in `wrangler.toml` if needed:
```
wrangler d1 create voicedot-db-staging
wrangler r2 bucket create voicedot-audio-staging
wrangler kv namespace create voicedot-rlimit-staging
```
Apply migrations:
```
npm run migrate:staging
```

## Endpoints (high level)
- Health: `GET /health`, `GET /status/polkadot`
- Docs: `GET /docs` (Swagger), `GET /openapi.yaml`
- Demo: `GET /demo`
- Voice:
  - `POST /voice/process` → { transaction_ids, session_id, intent, confirmation.audio_base64|audio_url }
  - `POST /voice/confirm` → { status, response.audio_base64|audio_url }
- Wallet:
  - `POST /wallet/challenge` → { message, challenge_id, expires_at }
  - `POST /wallet/connect` (wallet_address, signature, message) → { user_id }
  - `GET /wallet/balance?wallet_address=&token_symbols=DOT,USDT,GLMR`
- Transactions:
  - `GET /transactions?user_id=&status=&limit=&offset=`
  - `GET /transactions/:id`
  - `POST /transactions/build` (token, amount, recipient, origin_chain, destination_chain, min_receive?, slippage_bps?) → { call_hex, fee? }
  - `POST /transactions/execute` (transaction_id, signed_extrinsic, chain?, token?, min_receive?, slippage_bps?) → { transaction_hash }
  - `POST /transactions/xcm/build` → { call_hex }
  - `GET /transactions/xcm/estimate?origin=&destination=&symbol=&amount=&recipient=` → { fee }
- Prices:
  - `GET /prices` → { prices_usd }
  - `GET /prices/convert?amount=&from=&to=` → { converted }

See full OpenAPI spec at `/openapi.yaml`.

## Voice Flow
1) POST `/voice/process` with base64 audio (`webm` recommended). The API:
   - STT via ElevenLabs
   - NLP via Perplexity (if configured) or fallback parser
   - Creates pending transaction(s)
   - Returns structured intent and TTS confirmation audio
2) User confirms via `POST /voice/confirm` with “confirm” or “cancel” audio
3) Client builds, signs, and POSTs `/transactions/execute`

## Security
- Wallet private keys never stored; signing is client-side
- Nonce-based signature challenge on connect
- Rate limiting (KV-backed per-IP) on voice endpoints
- Audio encryption option (AES-GCM)
- Size/format validation for audio payloads

## Notes
- Testnet (staging) uses Westend/Asset Hub Westend/Moonbase endpoints
- XCM routes are refined for DOT teleport and USDT Asset Hub → Moonbeam; other routes use a safe fallback and may need updates per chain
- For production, prefer Durable Objects for rate limiting and add R2 public access via CDN/proxy if needed

## Scripts
- `npm run build` → bundle worker
- `npm run migrate` → generate + apply local migrations
- `npm run migrate:staging` → generate + apply remote staging migrations
- `npm run deploy` / `npm run deploy:staging`
- `npm run dev` / `npm run dev:staging`

## Contribution
- Branches pushed:
  - `feature/voicedot-platform`
  - `feature/staging-setup`
- Open PRs from these branches to your main branch in the EchoPay-2 repo.
