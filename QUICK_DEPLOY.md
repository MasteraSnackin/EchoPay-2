# 🚀 Quick Deployment Guide - EchoPay

## Frontend Deployment (Vercel)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Deploy using the script:**
   ```bash
   ./deploy.sh
   ```
   
   Or manually:
   ```bash
   npm run build
   vercel --prod
   ```

3. **Set environment variables in Vercel dashboard:**
   - `NODE_ENV=production`
   - Update `config.ts` with your production URLs

## Worker Deployment (Cloudflare)

1. **Navigate to worker directory:**
   ```bash
   cd workers/voicedot
   ```

2. **Deploy:**
   ```bash
   npm run deploy
   ```

3. **Set environment variables in Cloudflare dashboard:**
   - `ELEVENLABS_API_KEY`
   - `DB` (D1 database binding)
   - `ENCRYPTION_KEY`

## Backend Deployment (Railway)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

4. **Set environment variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set ALLOWED_ORIGINS=https://your-frontend.vercel.app
   railway variables set ELEVENLABS_API_KEY=your_key
   ```

## Quick Test Commands

```bash
# Test Worker
curl -X POST https://voicedot.your-worker.workers.dev/api/health

# Test Backend
curl https://your-backend.railway.app/api/health

# Test Frontend
curl -I https://your-frontend.vercel.app
```

## Next Steps After Deployment

1. Update frontend `config.ts` with production URLs
2. Test complete flow end-to-end
3. Monitor logs and performance
4. Set up monitoring and alerts