module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },

  // Security configuration
  security: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://your-frontend-domain.com',
        'https://voicedot.your-worker.workers.dev'
      ],
      credentials: true
    },
    rateLimit: {
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.API_RATE_LIMIT) || 100
      },
      auth: {
        windowMs: 15 * 60 * 1000,
        max: parseInt(process.env.AUTH_RATE_LIMIT) || 5
      },
      voice: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: parseInt(process.env.VOICE_RATE_LIMIT) || 10
      }
    }
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
  },

  // Polkadot network configuration
  polkadot: {
    networks: {
      moonbaseAlpha: {
        name: 'Moonbase Alpha',
        rpcEndpoint: process.env.MOONBASE_RPC_ENDPOINT || 'wss://moonbase-alpha.api.onfinality.io/public-ws',
        currency: 'DEV',
        decimals: 18
      },
      westend: {
        name: 'Westend',
        rpcEndpoint: process.env.WESTEND_RPC_ENDPOINT || 'wss://westend-rpc.polkadot.io',
        currency: 'WND',
        decimals: 12
      }
    },
    defaultNetwork: process.env.DEFAULT_NETWORK || 'moonbaseAlpha'
  },

  // ElevenLabs configuration
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'dev',
    transports: process.env.NODE_ENV === 'production' ? ['file', 'console'] : ['console']
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      port: parseInt(process.env.METRICS_PORT) || 9090
    },
    healthCheck: {
      enabled: true,
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    }
  },

  // Feature flags
  features: {
    voiceCommands: process.env.VOICE_COMMANDS_ENABLED !== 'false',
    blockchainIntegration: process.env.BLOCKCHAIN_INTEGRATION_ENABLED !== 'false',
    multiLanguage: process.env.MULTI_LANGUAGE_ENABLED !== 'false'
  }
};