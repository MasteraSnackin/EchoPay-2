# Summary

Describe the changes in this PR concisely.

- What problem does it solve?
- Key features/changes

# Changes

- [ ] Cloudflare Workers + Hono routes
- [ ] D1 schema/migrations (Drizzle)
- [ ] ElevenLabs STT/TTS integration
- [ ] Polkadot @polkadot/api integration
- [ ] NLP intent parsing (Perplexity)
- [ ] XCM builders / fee estimates
- [ ] R2 audio storage
- [ ] KV/Durable Objects rate limiting
- [ ] OpenAPI docs (/docs)
- [ ] Demo UI (/demo)

# Testing

- [ ] Local dev (wrangler dev)
- [ ] D1 migrations applied
- [ ] Voice flow: /voice/process and /voice/confirm
- [ ] Build/execute path
- [ ] Staging smoke test

# Deployment

- [ ] Secrets set (ELEVENLABS_API_KEY, ENCRYPTION_KEY, PERPLEXITY_API_KEY)
- [ ] D1/R2/KV provisioned and bound
- [ ] `npm run deploy` or `npm run deploy:staging`

# Screenshots / Demo

Add screenshots/GIFs of `/demo`, Swagger `/docs`, and sample responses.

# Checklist

- [ ] Self-reviewed
- [ ] Lint/build pass
- [ ] Docs updated (README/OpenAPI)
- [ ] No secrets committed