# EchoPay Deployment Guide

## 🧪 **Phase 1: Testing & Validation**

### **Local Testing Setup**

1. **Start All Services:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm install
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm install
   npm run dev
   
   # Terminal 3: Worker (if running locally)
   cd workers/voicedot
   npm run dev
   ```

2. **Test Complete Flow:**
   - Open frontend: `http://localhost:5173?testMode=1`
   - Connect wallet (Polkadot.js extension)
   - Verify wallet with real signature
   - Record voice command: "Pay 50 DOT to Alice"
   - Process command through Worker
   - Create transaction in Backend
   - Execute transaction (sign + broadcast)
   - Verify on Moonbase Alpha testnet

3. **Validation Checklist:**
   - [ ] Wallet connection works
   - [ ] Voice recording captures audio
   - [ ] Worker processes voice commands
   - [ ] Backend creates transactions
   - [ ] Wallet verification with real signatures
   - [ ] Transaction signing works
   - [ ] Blockchain broadcast succeeds
   - [ ] Transaction appears on testnet

### **Integration Testing**

```bash
# Test Worker endpoints
curl -X POST http://localhost:8787/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Pay 50 DOT to Alice", "user_id": "test_user"}'

# Test Backend endpoints
curl -X POST http://localhost:3001/api/wallet/transaction \
  -H "Content-Type: application/json" \
  -d '{"from_address": "5F...", "to_address": "5F...", "amount": 50, "currency": "DOT"}'
```

## 🔒 **Phase 2: Production Readiness**

### **Security Configuration**

1. **Environment Variables:**
   ```bash
   # Copy template
   cp backend/.env.example backend/.env
   
   # Edit with real values
   nano backend/.env
   ```

2. **Security Middleware:**
   - Rate limiting enabled
   - CORS configured for production domains
   - Input validation active
   - Helmet security headers

3. **SSL/TLS:**
   - HTTPS enforced in production
   - Valid SSL certificates
   - HSTS headers enabled

### **Monitoring Setup**

1. **Health Checks:**
   ```bash
   # Backend health
   curl https://your-backend.com/api/health
   
   # Worker health
   curl https://voicedot.your-worker.workers.dev/api/health
   ```

2. **Logging:**
   - Request logging enabled
   - Error tracking (Sentry/LogRocket)
   - Performance monitoring

3. **Metrics:**
   - API response times
   - Error rates
   - Transaction success rates

## 🚀 **Phase 3: Production Deployment**

### **Frontend Deployment (Vercel)**

1. **Prepare Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Environment Variables:**
   - Set `NODE_ENV=production`
   - Update Worker and Backend URLs
   - Configure CORS origins

### **Worker Deployment (Cloudflare)**

1. **Deploy Worker:**
   ```bash
   cd workers/voicedot
   npm run deploy
   ```

2. **Environment Variables:**
   - `ELEVENLABS_API_KEY`
   - `DB` (D1 database binding)
   - `ENCRYPTION_KEY`

### **Backend Deployment (Railway/Render)**

1. **Prepare Backend:**
   ```bash
   cd backend
   npm install --production
   ```

2. **Deploy to Railway:**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

3. **Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3001
   railway variables set ALLOWED_ORIGINS=https://your-frontend.vercel.app
   railway variables set ELEVENLABS_API_KEY=your_key
   ```

## 🔧 **Post-Deployment Verification**

### **1. Service Health Checks**
```bash
# Frontend
curl -I https://your-frontend.vercel.app

# Backend
curl https://your-backend.railway.app/api/health

# Worker
curl https://voicedot.your-worker.workers.dev/api/health
```

### **2. Integration Testing**
- Test complete voice command flow
- Verify wallet connections work
- Confirm transactions broadcast to testnet
- Check error handling and rate limiting

### **3. Performance Monitoring**
- Monitor API response times
- Check memory usage
- Verify rate limiting is working
- Monitor error rates

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **CORS Errors:**
   - Check `ALLOWED_ORIGINS` in backend
   - Verify frontend URL is included

2. **Rate Limiting:**
   - Check rate limit configuration
   - Monitor API usage patterns

3. **Wallet Connection:**
   - Verify Polkadot.js extension is installed
   - Check network configuration

4. **Transaction Failures:**
   - Verify account has sufficient balance
   - Check network RPC endpoint
   - Monitor transaction status

### **Debug Commands:**
```bash
# Check backend logs
railway logs

# Test Worker locally
cd workers/voicedot
npm run dev

# Test Backend endpoints
curl -v http://localhost:3001/api/health
```

## 📊 **Monitoring & Maintenance**

### **Daily Checks:**
- [ ] Service health status
- [ ] Error rate monitoring
- [ ] Transaction success rates
- [ ] API response times

### **Weekly Tasks:**
- [ ] Review error logs
- [ ] Check rate limiting effectiveness
- [ ] Monitor resource usage
- [ ] Update dependencies

### **Monthly Reviews:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] Feature updates
- [ ] User feedback analysis

## 🔐 **Security Best Practices**

1. **Environment Variables:**
   - Never commit `.env` files
   - Use secure secret management
   - Rotate API keys regularly

2. **Access Control:**
   - Implement proper CORS
   - Use rate limiting
   - Validate all inputs

3. **Monitoring:**
   - Log security events
   - Monitor for suspicious activity
   - Regular security audits

## 📈 **Scaling Considerations**

1. **Database:**
   - Consider PostgreSQL for production
   - Implement connection pooling
   - Add read replicas if needed

2. **Caching:**
   - Redis for session storage
   - CDN for static assets
   - API response caching

3. **Load Balancing:**
   - Multiple backend instances
   - Worker auto-scaling
   - Geographic distribution

---

**Ready to deploy?** Start with Phase 1 (Testing) to ensure everything works locally, then proceed through Production Readiness and Deployment phases.