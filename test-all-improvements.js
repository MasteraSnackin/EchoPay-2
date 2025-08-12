#!/usr/bin/env node

const BASE_URL = 'http://localhost:3001';

// Test commands for different languages and confirmation requirements
const testCommands = [
  // English commands
  {
    command: "Pay 1000 to Alice",
    expectedType: "payment",
    requiresConfirmation: true,
    language: "en",
    description: "High-value English payment"
  },
  {
    command: "Pay 50 to Bob",
    expectedType: "payment",
    requiresConfirmation: false,
    language: "en",
    description: "Low-value English payment"
  },
  
  // Spanish commands
  {
    command: "Pagar 800 a Carlos",
    expectedType: "payment",
    requiresConfirmation: true,
    language: "es",
    description: "High-value Spanish payment"
  },
  {
    command: "Pagar 30 a David",
    expectedType: "payment",
    requiresConfirmation: false,
    language: "es",
    description: "Low-value Spanish payment"
  },
  
  // French commands - enhanced
  {
    command: "Payer 900 à Alice",
    expectedType: "payment",
    requiresConfirmation: true,
    language: "fr",
    description: "High-value French payment with accent"
  },
  {
    command: "Payer 40 euros à Bob",
    expectedType: "payment",
    requiresConfirmation: false,
    language: "fr",
    description: "Low-value French payment with currency"
  },
  {
    command: "Envoyer 75 dollars à Charles",
    expectedType: "payment",
    requiresConfirmation: false,
    language: "fr",
    description: "French payment with dollars"
  },
  {
    command: "Transférer 150 à David",
    expectedType: "payment",
    requiresConfirmation: true,
    language: "fr",
    description: "French transfer command (high value)"
  },
  {
    command: "Vérifier mon solde",
    expectedType: "balance_check",
    requiresConfirmation: false,
    language: "fr",
    description: "French balance check"
  },
  {
    command: "Afficher mes transactions",
    expectedType: "transaction_history",
    requiresConfirmation: false,
    language: "fr",
    description: "French transaction history"
  },
  {
    command: "Ajouter le contact Isabelle",
    expectedType: "add_contact",
    requiresConfirmation: false,
    language: "fr",
    description: "French add contact"
  },
  {
    command: "Configurer un paiement récurrent 200 à Emma",
    expectedType: "recurring_payment",
    requiresConfirmation: true,
    language: "fr",
    description: "French recurring payment"
  }
];

async function testCommandProcessing(command, expectedType, requiresConfirmation, language, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   Command: "${command}"`);
  console.log(`   Expected: ${expectedType} (${language}, confirmation: ${requiresConfirmation ? 'required' : 'not required'})`);

  try {
    // Step 1: Send command
    const commandResponse = await fetch(`${BASE_URL}/api/process-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    if (!commandResponse.ok) {
      throw new Error(`Command failed: ${commandResponse.status}`);
    }

    const commandResult = await commandResponse.json();
    console.log(`   ✅ Command processed: ${commandResult.status}`);
    
            // Check language detection
        const detectedLang = commandResult.detectedLanguage || (commandResult.parsedCommand && commandResult.parsedCommand.detectedLanguage);
        if (detectedLang === language) {
          console.log(`   ✅ Language detected correctly: ${detectedLang}`);
        } else {
          console.log(`   ⚠️  Language detection: expected ${language}, got ${detectedLang}`);
        }

    if (requiresConfirmation) {
      // Step 2: Verify confirmation is required
      if (commandResult.status !== 'confirmation_required') {
        console.log(`   ❌ Expected confirmation_required, got: ${commandResult.status}`);
        return false;
      }

      console.log(`   ✅ Confirmation required: ${commandResult.confirmationText}`);
      console.log(`   ✅ Confirmation ID: ${commandResult.confirmationId}`);

      // Step 3: Test confirmation (Yes)
      console.log(`   🔄 Testing confirmation (Yes)...`);
      const confirmResponse = await fetch(`${BASE_URL}/api/confirm-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationId: commandResult.confirmationId,
          userResponse: 'yes'
        })
      });

      if (!confirmResponse.ok) {
        throw new Error(`Confirmation failed: ${confirmResponse.status}`);
      }

      const confirmResult = await confirmResponse.json();
      console.log(`   ✅ Confirmation result: ${confirmResult.status}`);

      if (confirmResult.status === 'success' && confirmResult.executionResult) {
        console.log(`   ✅ Command executed successfully`);
        return true;
      } else {
        console.log(`   ❌ Command execution failed: ${confirmResult.message}`);
        return false;
      }
    } else {
      // No confirmation needed
      if (commandResult.status === 'success') {
        console.log(`   ✅ Command executed without confirmation`);
        return true;
      } else {
        console.log(`   ❌ Unexpected status: ${commandResult.status}`);
        return false;
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testSecureWalletIntegration() {
  console.log(`\n🔐 Testing: Secure Wallet Integration`);
  
  try {
    // Test wallet health
    const healthResponse = await fetch(`${BASE_URL}/api/wallet/health`);
    if (!healthResponse.ok) {
      throw new Error(`Wallet health failed: ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    console.log(`   ✅ Wallet health: ${health.health.status}`);

    // Test available networks
    const networksResponse = await fetch(`${BASE_URL}/api/wallet/switch-network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkName: 'westend' })
    });
    
    if (networksResponse.ok) {
      const networkResult = await networksResponse.json();
      console.log(`   ✅ Network switch: ${networkResult.message}`);
    } else {
      console.log(`   ⚠️  Network switch failed (expected for demo): ${networksResponse.status}`);
    }

    // Test wallet connection (will fail as expected - not implemented yet)
    try {
      const connectResponse = await fetch(`${BASE_URL}/api/wallet/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletType: 'extension' })
      });
      
      if (connectResponse.ok) {
        console.log(`   ✅ Wallet connection successful`);
      } else {
        const error = await connectResponse.json();
        console.log(`   ℹ️  Wallet connection failed as expected: ${error.message}`);
      }
    } catch (error) {
      console.log(`   ℹ️  Wallet connection error as expected: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testFrenchLanguageEnhancement() {
  console.log(`\n🇫🇷 Testing: Enhanced French Language Support`);
  
  const frenchTestCommands = [
    "Payer 25 euros à Marie",
    "Vérifier mon solde",
    "Afficher mes transactions",
    "Ajouter le contact Pierre",
    "Configurer un paiement récurrent 150 à Sophie",
    "Paiement mensuel 300 à Jean",
    "Virement automatique 80 à Claire"
  ];

  let passed = 0;
  let total = frenchTestCommands.length;

  for (const command of frenchTestCommands) {
    try {
      const response = await fetch(`${BASE_URL}/api/process-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      if (response.ok) {
        const result = await response.json();
        // Check for detectedLanguage in both the root and parsedCommand
        const detectedLang = result.detectedLanguage || (result.parsedCommand && result.parsedCommand.detectedLanguage);
        if (detectedLang === 'fr') {
          console.log(`   ✅ "${command}" → ${detectedLang} (${result.parsedCommand?.type || result.type || 'unknown'})`);
          passed++;
        } else {
          console.log(`   ❌ "${command}" → ${detectedLang} (expected fr)`);
        }
      } else {
        console.log(`   ❌ "${command}" → HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ "${command}" → Error: ${error.message}`);
    }
  }

  console.log(`   📊 French language detection: ${passed}/${total} passed`);
  return passed === total;
}

async function testAPIEndpoints() {
  console.log(`\n🔌 Testing: API Endpoints`);
  
  const endpoints = [
    { method: 'GET', path: '/api/health', description: 'Health check' },
    { method: 'GET', path: '/api/languages', description: 'Supported languages' },
    { method: 'GET', path: '/api/ai-stats', description: 'AI statistics' },
    { method: 'GET', path: '/api/contacts', description: 'Contacts list' },
    { method: 'GET', path: '/api/transactions', description: 'Transaction history' },
    { method: 'GET', path: '/api/recurring-payments', description: 'Recurring payments' }
  ];

  let passed = 0;
  let total = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`);
      if (response.ok) {
        console.log(`   ✅ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
        passed++;
      } else {
        console.log(`   ❌ ${endpoint.method} ${endpoint.path} - HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
    }
  }

  console.log(`   📊 API endpoints: ${passed}/${total} passed`);
  return passed === total;
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Test Suite...\n');
  console.log('Testing:');
  console.log('1. Confirmation UI Flow');
  console.log('2. Secure Wallet Integration');
  console.log('3. Enhanced French Language Support');
  console.log('4. API Endpoints\n');

  let passed = 0;
  let total = 0;

  // Test command processing and confirmation flow
  for (const test of testCommands) {
    total++;
    const result = await testCommandProcessing(
      test.command, 
      test.expectedType, 
      test.requiresConfirmation, 
      test.language, 
      test.description
    );
    if (result) passed++;
  }

  // Test secure wallet integration
  total++;
  const walletResult = await testSecureWalletIntegration();
  if (walletResult) passed++;

  // Test French language enhancement
  total++;
  const frenchResult = await testFrenchLanguageEnhancement();
  if (frenchResult) passed++;

  // Test API endpoints
  total++;
  const apiResult = await testAPIEndpoints();
  if (apiResult) passed++;

  console.log(`\n📊 Final Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! EchoPay is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }

  return passed === total;
}

// Run all tests
runAllTests().catch(console.error);