#!/usr/bin/env node

/**
 * EchoPay All Features Test Suite
 * Tests Command Confirmation, Multi-language Support, and Blockchain Integration
 */

const BASE_URL = 'http://localhost:3001';

// Test commands in multiple languages
const testCommands = [
  // English commands
  { command: 'Pay 150 to Alice', expectedType: 'payment', language: 'en', requiresConfirmation: true },
  { command: 'Add contact Sarah', expectedType: 'add_contact', language: 'en', requiresConfirmation: false },
  { command: 'Check balance', expectedType: 'balance_check', language: 'en', requiresConfirmation: false },
  
  // Spanish commands
  { command: 'Pagar 200 a Bob', expectedType: 'payment', language: 'es', requiresConfirmation: true },
  { command: 'Agregar contacto Juan', expectedType: 'add_contact', language: 'es', requiresConfirmation: false },
  { command: 'Verificar saldo', expectedType: 'balance_check', language: 'es', requiresConfirmation: false },
  
  // French commands
  { command: 'Payer 300 à Charlie', expectedType: 'payment', language: 'fr', requiresConfirmation: true },
  { command: 'Ajouter contact Marie', expectedType: 'add_contact', language: 'fr', requiresConfirmation: false },
  { command: 'Vérifier solde', expectedType: 'balance_check', language: 'fr', requiresConfirmation: false },
  
  // High-value commands that require confirmation
  { command: 'Pay 1000 to Dave', expectedType: 'payment', language: 'en', requiresConfirmation: true },
  { command: 'Set recurring payment 500 to Alice', expectedType: 'recurring_payment', language: 'en', requiresConfirmation: true },
  { command: 'Remove contact Bob', expectedType: 'remove_contact', language: 'en', requiresConfirmation: true }
];

async function testCommandConfirmation(command, expectedType, language, requiresConfirmation) {
  try {
    console.log(`\n🧪 Testing: "${command}" (${language})`);
    console.log(`   Expected Type: ${expectedType}`);
    console.log(`   Requires Confirmation: ${requiresConfirmation}`);
    
    // Step 1: Process the command
    const response = await fetch(`${BASE_URL}/api/process-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Display initial results
    console.log(`   ✅ Status: ${result.status}`);
    console.log(`   🤖 AI Type: ${result.parsedCommand?.type}`);
    console.log(`   🌍 Detected Language: ${result.parsedCommand?.detectedLanguage}`);
    console.log(`   🎯 Confidence: ${(result.parsedCommand?.confidence * 100).toFixed(1)}%`);
    
    // Check if confirmation is required
    if (result.status === 'confirmation_required') {
      console.log(`   🔒 Confirmation Required: ${result.confirmationText}`);
      
      // Step 2: Test confirmation flow
      const confirmationResult = await testConfirmationFlow(result.confirmationId, result.confirmationText);
      
      if (confirmationResult.status === 'confirmed') {
        console.log(`   🎉 SUCCESS: Command confirmed and executed!`);
        return true;
      } else if (confirmationResult.status === 'success' && confirmationResult.executionResult) {
        console.log(`   🎉 SUCCESS: Command confirmed and executed!`);
        return true;
      } else {
        console.log(`   ❌ FAILED: Confirmation failed - ${confirmationResult.message}`);
        return false;
      }
      
    } else if (result.status === 'success') {
      console.log(`   🎉 SUCCESS: Command executed immediately!`);
      return true;
    } else {
      console.log(`   ❌ FAILED: Command processing failed - ${result.message}`);
      return false;
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testConfirmationFlow(confirmationId, confirmationText) {
  try {
    console.log(`   🔄 Testing confirmation flow...`);
    
    // Test positive confirmation
    const confirmResponse = await fetch(`${BASE_URL}/api/confirm-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        confirmationId: confirmationId, 
        userResponse: 'Yes, confirm the transaction' 
      }),
    });

    if (!confirmResponse.ok) {
      throw new Error(`HTTP error! status: ${confirmResponse.status}`);
    }

    const confirmResult = await confirmResponse.json();
    console.log(`   📝 Confirmation Response: ${confirmResult.message}`);
    
    return confirmResult;
    
  } catch (error) {
    console.error(`   ❌ Confirmation Error: ${error.message}`);
    return { status: 'error', message: error.message };
  }
}

async function testMultiLanguageSupport() {
  console.log('\n🌍 Testing Multi-Language Support...');
  
  try {
    // Get supported languages
    const languagesResponse = await fetch(`${BASE_URL}/api/languages`);
    const languagesData = await languagesResponse.json();
    
    console.log(`   ✅ Supported Languages: ${languagesData.languages.length}`);
    languagesData.languages.forEach(lang => {
      console.log(`      - ${lang.name} (${lang.code}): ${lang.examples.join(', ')}`);
    });
    
    // Test language detection
    const testLanguages = [
      { command: 'Pay 10 to Alice', expected: 'en' },
      { command: 'Pagar 10 a Alicia', expected: 'es' },
      { command: 'Payer 10 à Alice', expected: 'fr' }
    ];
    
    for (const test of testLanguages) {
      const response = await fetch(`${BASE_URL}/api/process-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: test.command }),
      });
      
      const result = await response.json();
      const detected = result.parsedCommand?.detectedLanguage;
      
      if (detected === test.expected) {
        console.log(`   ✅ Language Detection: "${test.command}" → ${detected}`);
      } else {
        console.log(`   ❌ Language Detection: "${test.command}" → ${detected} (expected ${test.expected})`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Multi-language Test Error: ${error.message}`);
  }
}

async function testBlockchainIntegration() {
  console.log('\n⛓️  Testing Blockchain Integration...');
  
  try {
    // Test blockchain status
    const statusResponse = await fetch(`${BASE_URL}/api/blockchain/status`);
    const statusData = await statusResponse.json();
    
    console.log(`   ✅ Blockchain Status: ${statusData.connection.isConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`   🌐 Current Network: ${statusData.connection.networkInfo?.name || 'Unknown'}`);
    console.log(`   🔗 Available Networks: ${statusData.networks.map(n => n.name).join(', ')}`);
    
    // Test blockchain connection
    if (!statusData.connection.isConnected) {
      console.log(`   🔌 Attempting to connect to Moonbase Alpha...`);
      
      const connectResponse = await fetch(`${BASE_URL}/api/blockchain/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: 'moonbaseAlpha' }),
      });
      
      const connectData = await connectResponse.json();
      console.log(`   📡 Connection Result: ${connectData.message}`);
    }
    
    // Test blockchain stats
    try {
      const statsResponse = await fetch(`${BASE_URL}/api/blockchain/stats`);
      const statsData = await statsResponse.json();
      
      console.log(`   📊 Blockchain Stats: ${statsData.stats.network} - Block ${statsData.stats.latestBlock}`);
      
    } catch (error) {
      console.log(`   ⚠️  Blockchain Stats: Not available (${error.message})`);
    }
    
    // Test fee estimation
    try {
      const feeResponse = await fetch(`${BASE_URL}/api/blockchain/estimate-fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          toAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          amount: '1000000000000000000' // 1 token in smallest unit
        }),
      });
      
      const feeData = await feeResponse.json();
      console.log(`   💰 Fee Estimation: ${feeData.fees.estimatedFee} ${feeData.fees.currency}`);
      
    } catch (error) {
      console.log(`   ⚠️  Fee Estimation: Not available (${error.message})`);
    }
    
  } catch (error) {
    console.error(`   ❌ Blockchain Test Error: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`   ✅ Health: ${healthData.status}`);
    console.log(`   🤖 Multi-Language Processor: ${healthData.multiLanguageProcessor}`);
    console.log(`   🔒 Command Confirmation: ${healthData.commandConfirmation}`);
    console.log(`   ⛓️  Blockchain: ${healthData.blockchain?.isConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`   🌍 Supported Languages: ${healthData.supportedLanguages}`);
    console.log(`   👥 Contacts: ${healthData.totalContacts}`);
    console.log(`   💳 Transactions: ${healthData.totalTransactions}`);
    
    // Test AI stats
    const statsResponse = await fetch(`${BASE_URL}/api/ai-stats`);
    const statsData = await statsResponse.json();
    console.log(`   📊 AI Methods: ${statsData.stats.methods.join(', ')}`);
    console.log(`   🎓 Trained Examples: ${statsData.stats.totalTrained}`);
    
    // Test confirmation stats
    const confirmStatsResponse = await fetch(`${BASE_URL}/api/confirmation-stats`);
    const confirmStatsData = await confirmStatsResponse.json();
    console.log(`   🔒 Confirmation Stats: ${confirmStatsData.stats.pending} pending, ${confirmStatsData.stats.confirmed} confirmed`);
    
  } catch (error) {
    console.error(`   ❌ API Test Error: ${error.message}`);
  }
}

async function runPerformanceTest() {
  console.log('\n⚡ Performance Test...');
  
  const startTime = Date.now();
  let successCount = 0;
  let totalCount = 0;
  
  for (const test of testCommands) {
    totalCount++;
    const success = await testCommandConfirmation(
      test.command, 
      test.expectedType, 
      test.language, 
      test.requiresConfirmation
    );
    if (success) successCount++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / totalCount;
  
  console.log(`\n📊 Performance Results:`);
  console.log(`   ⏱️  Total Time: ${totalTime}ms`);
  console.log(`   📈 Average Time: ${avgTime.toFixed(2)}ms per command`);
  console.log(`   ✅ Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  console.log(`   🎯 Success Count: ${successCount}/${totalCount}`);
}

async function main() {
  console.log('🚀 EchoPay All Features Test Suite');
  console.log('=====================================');
  console.log(`Testing Command Confirmation, Multi-language Support, and Blockchain Integration`);
  console.log(`Backend URL: ${BASE_URL}`);
  
  // Test API endpoints first
  await testAPIEndpoints();
  
  // Test multi-language support
  await testMultiLanguageSupport();
  
  // Test blockchain integration
  await testBlockchainIntegration();
  
  // Run performance test
  await runPerformanceTest();
  
  console.log('\n🎉 All Features Test Suite Complete!');
  console.log('\n💡 Try these voice commands in the frontend:');
  console.log('   • English: "Pay 150 to Alice" (requires confirmation)');
  console.log('   • Spanish: "Pagar 200 a Bob" (requires confirmation)');
  console.log('   • French: "Payer 300 à Charlie" (requires confirmation)');
  console.log('   • "Add contact Sarah" (no confirmation needed)');
  console.log('   • "Set recurring payment 500 to Alice" (requires confirmation)');
  console.log('\n🔗 Blockchain Features:');
  console.log('   • Real-time balance checking');
  console.log('   • Transaction fee estimation');
  console.log('   • Multi-network support (Moonbase Alpha, Westend, Polkadot)');
  console.log('   • Actual transaction execution');
}

// Run the test suite
main().catch(console.error);