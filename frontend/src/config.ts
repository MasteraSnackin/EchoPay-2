export const config = {
  // API URLs
  worker: {
    url: process.env.NODE_ENV === 'production' 
      ? 'https://voicedot.your-worker.workers.dev' 
      : 'http://localhost:8787',
    endpoints: {
      voice: '/api/voice/process',
      wallet: {
        verify: '/api/wallet/verify',
        balance: '/api/wallet/balance'
      }
    }
  },
  
  backend: {
    url: process.env.NODE_ENV === 'production' 
      ? 'https://your-backend.com' 
      : 'http://localhost:3001',
    endpoints: {
      wallet: {
        verify: '/api/wallet/verify',
        balance: '/api/wallet/balance',
        transaction: '/api/wallet/transaction',
        broadcast: '/api/wallet/broadcast'
      }
    }
  },

  // Polkadot network configuration
  polkadot: {
    rpcEndpoint: 'wss://moonbase-alpha.api.onfinality.io/public-ws',
    chainName: 'Moonbase Alpha',
    currency: 'DEV'
  },

  // Voice recognition settings
  voice: {
    language: 'en-US',
    continuous: false,
    interimResults: false,
    maxAlternatives: 1
  },

  // UI settings
  ui: {
    confirmationTimeout: 30000, // 30 seconds
    maxTransactions: 10,
    refreshInterval: 5000 // 5 seconds
  }
};

export default config;