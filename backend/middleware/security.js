const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { status: 'error', message },
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limits
const apiLimiter = createRateLimit(15 * 60 * 1000, 100, 'Too many API requests, please try again later');
const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later');
const voiceLimiter = createRateLimit(1 * 60 * 1000, 10, 'Too many voice commands, please wait before trying again');

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com', 'https://voicedot.your-worker.workers.dev']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8787'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i
  ];

  const body = JSON.stringify(req.body);
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(body) || pattern.test(query) || pattern.test(params)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input detected'
      });
    }
  }

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

// Health check middleware
const healthCheck = (req, res, next) => {
  if (req.path === '/api/health') {
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  voiceLimiter,
  corsOptions,
  validateInput,
  requestLogger,
  healthCheck
};