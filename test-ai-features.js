#!/usr/bin/env node

/**
 * EchoPay AI Features Test Script
 * This script demonstrates all the new AI-powered capabilities
 */

const BASE_URL = 'http://localhost:3001';

// Test commands to demonstrate AI capabilities
const testCommands = [
  // Payment commands
  { command: 'Pay 50 to Alice', expectedType: 'payment' },
  { command: 'Send 25.5 to Bob', expectedType: 'payment' },
  { command: 'Transfer 100 to Charlie', expectedType: 'payment' },
  { command: 'Give 75 euros to Dave', expectedType: 'payment' },
  
  // Balance commands
  { command: 'Check balance', expectedType: 'balance_check' },
  { command: 'Show balance', expectedType: 'balance_check' },
  { command: 'What is my balance', expectedType: 'balance_check' },
  { command: 'How much do I have', expectedType: 'balance_check' },
  
  // Transaction history commands
  { command: 'Show transactions', expectedType: 'transaction_history' },
  { command: 'Transaction history', expectedType: 'transaction_history' },
  { command: 'Recent payments', expectedType: 'transaction_history' },
  
  // Contact management commands
  { command: 'Add contact Sarah', expectedType: 'add_contact' },
  { command: 'Create contact Mike', expectedType: 'add_contact' },
  { command: 'Remove contact John', expectedType: 'remove_contact' },
  
  // Recurring payment commands
  { command: 'Set recurring payment 200 to Alice', expectedType: 'recurring_payment' },
  { command: 'Schedule payment 150 to Bob', expectedType: 'recurring_payment' },
  
  // Complex commands
  { command: 'Pay 500 dollars to Emma for rent', expectedType: 'payment' },
  { command: 'Send 1000 euros to Frank monthly', expectedType: 'recurring_payment' }
];

async function testAICommand(command, expectedType) {
  try {
    console.log(`\n🧪 Testing: "${command}"`);
    console.log(`   Expected Type: ${expectedType}`);
    
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
    
    // Display results
    console.log(`   ✅ Status: ${result.status}`);
    console.log(`   🤖 AI Type: ${result.parsedCommand?.type}`);
    console.log(`   🎯 Confidence: ${(result.parsedCommand?.confidence * 100).toFixed(1)}%`);
    console.log(`   🔧 Methods: ${result.parsedCommand?.processingMethods?.join(', ')}`);
    
    if (result.parsedCommand?.type === expectedType) {
      console.log(`   🎉 SUCCESS: Type matched expected!`);
    } else {
      console.log(`   ❌ FAILED: Type mismatch!`);
    }
    
    // Show additional data for payments
    if (result.parsedCommand?.type === 'payment') {
      console.log(`   💰 Amount: ${result.parsedCommand.amount} ${result.parsedCommand.currency}`);
      console.log(`   👤 Recipient: ${result.parsedCommand.recipient}`);
    }
    
    return result.parsedCommand?.type === expectedType;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`   ✅ Health: ${healthData.status}`);
    console.log(`   🤖 AI Processor: ${healthData.aiProcessor}`);
    console.log(`   👥 Contacts: ${healthData.totalContacts}`);
    console.log(`   💳 Transactions: ${healthData.totalTransactions}`);
    
    // Test AI stats
    const statsResponse = await fetch(`${BASE_URL}/api/ai-stats`);
    const statsData = await statsResponse.json();
    console.log(`   📊 AI Methods: ${statsData.stats.methods.join(', ')}`);
    console.log(`   🎓 Trained Examples: ${statsData.stats.totalTrained}`);
    
    // Test contacts endpoint
    const contactsResponse = await fetch(`${BASE_URL}/api/contacts`);
    const contactsData = await contactsResponse.json();
    console.log(`   👥 Total Contacts: ${contactsData.contacts.length}`);
    
    // Test transactions endpoint
    const txResponse = await fetch(`${BASE_URL}/api/transactions`);
    const txData = await txResponse.json();
    console.log(`   💳 Total Transactions: ${txData.transactions.length}`);
    
    // Test recurring payments endpoint
    const recurringResponse = await fetch(`${BASE_URL}/api/recurring-payments`);
    const recurringData = await recurringResponse.json();
    console.log(`   🔄 Total Recurring Payments: ${recurringData.recurringPayments.length}`);
    
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
    const success = await testAICommand(test.command, test.expectedType);
    if (success) successCount++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
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
  console.log('🚀 EchoPay AI Features Test Suite');
  console.log('=====================================');
  console.log(`Testing AI-powered voice command processing`);
  console.log(`Backend URL: ${BASE_URL}`);
  
  // Test API endpoints first
  await testAPIEndpoints();
  
  // Run performance test
  await runPerformanceTest();
  
  console.log('\n🎉 Test Suite Complete!');
  console.log('\n💡 Try these voice commands in the frontend:');
  console.log('   • "Pay 50 to Alice"');
  console.log('   • "Add contact Sarah"');
  console.log('   • "Set recurring payment 200 to Bob"');
  console.log('   • "Show transactions"');
  console.log('   • "Check balance"');
}

// Run the test suite
main().catch(console.error);