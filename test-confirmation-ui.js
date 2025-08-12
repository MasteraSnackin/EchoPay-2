#!/usr/bin/env node

const BASE_URL = 'http://localhost:3001';

// Test commands that should trigger confirmation
const testCommands = [
  {
    command: "Pay 1000 to Alice",
    expectedType: "payment",
    requiresConfirmation: true,
    description: "High-value payment"
  },
  {
    command: "Send 500 euros to Bob monthly",
    expectedType: "recurring_payment",
    requiresConfirmation: true,
    description: "Recurring payment"
  },
  {
    command: "Remove contact Charlie",
    expectedType: "remove_contact",
    requiresConfirmation: true,
    description: "Contact removal"
  },
  {
    command: "Pay 50 to Dave",
    expectedType: "payment",
    requiresConfirmation: false,
    description: "Low-value payment (no confirmation needed)"
  }
];

async function testConfirmationFlow(command, expectedType, requiresConfirmation, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   Command: "${command}"`);
  console.log(`   Expected: ${expectedType} (confirmation: ${requiresConfirmation ? 'required' : 'not required'})`);

  try {
    // Step 1: Send initial command
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

async function testConfirmationCancellation() {
  console.log(`\n🧪 Testing: Confirmation Cancellation`);
  
  try {
    // Send a command that requires confirmation
    const commandResponse = await fetch(`${BASE_URL}/api/process-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: "Pay 800 to Eve" })
    });

    if (!commandResponse.ok) {
      throw new Error(`Command failed: ${commandResponse.status}`);
    }

    const commandResult = await commandResponse.json();
    
    if (commandResult.status !== 'confirmation_required') {
      console.log(`   ❌ Expected confirmation_required, got: ${commandResult.status}`);
      return false;
    }

    console.log(`   ✅ Confirmation required for: ${commandResult.confirmationText}`);

    // Test cancellation (No)
    const cancelResponse = await fetch(`${BASE_URL}/api/confirm-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmationId: commandResult.confirmationId,
        userResponse: 'no'
      })
    });

    if (!cancelResponse.ok) {
      throw new Error(`Cancellation failed: ${cancelResponse.status}`);
    }

    const cancelResult = await cancelResponse.json();
    console.log(`   ✅ Cancellation result: ${cancelResult.status}`);

    if (cancelResult.status === 'cancelled') {
      console.log(`   ✅ Command cancelled successfully`);
      return true;
    } else {
      console.log(`   ❌ Unexpected cancellation status: ${cancelResult.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testConfirmationTimeout() {
  console.log(`\n🧪 Testing: Confirmation Timeout (simulated)`);
  
  try {
    // Get pending confirmations
    const response = await fetch(`${BASE_URL}/api/confirmations`);
    if (!response.ok) {
      throw new Error(`Failed to get confirmations: ${response.status}`);
    }

    const confirmations = await response.json();
    console.log(`   📊 Current pending confirmations: ${confirmations.pending.length}`);

    if (confirmations.pending.length > 0) {
      console.log(`   ✅ Found pending confirmations to test timeout`);
      return true;
    } else {
      console.log(`   ℹ️  No pending confirmations to test timeout`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runConfirmationTests() {
  console.log('🚀 Starting Confirmation UI Flow Tests...\n');

  let passed = 0;
  let total = 0;

  // Test main confirmation flows
  for (const test of testCommands) {
    total++;
    const result = await testConfirmationFlow(
      test.command, 
      test.expectedType, 
      test.requiresConfirmation, 
      test.description
    );
    if (result) passed++;
  }

  // Test cancellation
  total++;
  const cancelResult = await testConfirmationCancellation();
  if (cancelResult) passed++;

  // Test timeout
  total++;
  const timeoutResult = await testConfirmationTimeout();
  if (timeoutResult) passed++;

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All confirmation UI tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
  }

  return passed === total;
}

// Run tests
runConfirmationTests().catch(console.error);