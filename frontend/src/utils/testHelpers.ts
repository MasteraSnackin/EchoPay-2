// Test helpers for validating the complete EchoPay flow
export const testHelpers = {
  // Mock responses for testing without real services
  mockWorkerResponse: {
    status: 'confirmation_required',
    transaction_id: 'test_tx_123',
    transaction_type: 'transfer',
    amount: '50',
    recipient: 'Alice',
    currency: 'DOT',
    confidence: 0.95,
    methods: ['voice', 'nlp'],
    response_text: 'Do you want to send 50 DOT to Alice?'
  },

  mockBackendResponse: {
    status: 'success',
    id: 1,
    transaction: {
      id: 1,
      type: 'transfer',
      amount: 50,
      recipient: 'Alice',
      currency: 'DOT',
      status: 'created',
      timestamp: new Date().toISOString()
    }
  },

  mockBroadcastResponse: {
    status: 'success',
    tx_hash: '0x1234567890abcdef...',
    network: 'Moonbase Alpha'
  },

  // Test flow validation
  validateCompleteFlow: async (steps: string[]) => {
    const results = [];
    for (const step of steps) {
      try {
        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 100));
        results.push({ step, status: 'passed', timestamp: new Date().toISOString() });
      } catch (error) {
        results.push({ step, status: 'failed', error: error.message, timestamp: new Date().toISOString() });
      }
    }
    return results;
  },

  // Mock audio recording for testing
  createMockAudioData: () => {
    // Create a small mock audio blob
    const mockAudio = new Blob(['mock audio data'], { type: 'audio/webm' });
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(mockAudio);
    });
  },

  // Test wallet verification flow
  testWalletVerification: async (address: string) => {
    const message = `Verify wallet for EchoPay: ${Date.now()}`;
    const messageHex = btoa(message); // Simple encoding for testing
    
    return {
      message,
      messageHex,
      signature: 'mock_signature_for_testing',
      address
    };
  }
};

export default testHelpers;