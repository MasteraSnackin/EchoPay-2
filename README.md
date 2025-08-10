# VoiceDOT Payment Platform

Edge API on Cloudflare Workers using Hono. Features voice-to-blockchain transactions on Polkadot.

## Stack
- Cloudflare Workers + Hono
- Cloudflare D1 + Drizzle ORM
- ElevenLabs (STT/TTS)
- Polkadot via @polkadot/api

## Env vars
- POLKADOT_RPC_ENDPOINT (e.g., wss://rpc.polkadot.io)
- ELEVENLABS_API_KEY (secret)
- ELEVENLABS_VOICE_ID (optional)
- ENCRYPTION_KEY (base64 256-bit for AES-GCM, optional)

Set secrets:

```
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put ENCRYPTION_KEY
```

## Develop
```
npm install
npm run migrate
npm run dev
```

## Build/Deploy
```
npm run build
npx wrangler deploy
```

## Endpoints
- POST /voice/process
- POST /voice/confirm
- GET /transactions
- GET /transactions/:id
- POST /transactions/execute
- POST /wallet/connect
- GET /wallet/balance
- GET /health
- GET /status/polkadot
