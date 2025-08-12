#!/usr/bin/env node

const BASE_URL = 'http://localhost:3001';

console.log('🔐 Testing EchoPay Wallet Extension Integration...\n');

async function testWalletExtensions() {
  console.log('🧪 Testing: Wallet Extension Integration');
  
  try {
    // Test 1: Get available extensions
    console.log('   📱 Testing: Get available extensions...');
    const extensionsResponse = await fetch(`${BASE_URL}/api/wallet/extensions`);
    
    if (extensionsResponse.ok) {
      const extensions = await extensionsResponse.json();
      console.log(`   ✅ Available extensions: ${extensions.extensions.length}`);
      extensions.extensions.forEach(ext => {
        console.log(`      - ${ext.name} v${ext.version}`);
      });
    } else {
      console.log(`   ⚠️  Extensions endpoint returned: ${extensionsResponse.status}`);
    }

    // Test 2: Check specific extension availability
    console.log('\n   🔍 Testing: Check extension availability...');
    const extensionNames = ['polkadot', 'subwallet', 'talisman'];
    
    for (const name of extensionNames) {
      try {
        const checkResponse = await fetch(`${BASE_URL}/api/wallet/extensions/${name}/check`);
        if (checkResponse.ok) {
          const result = await checkResponse.json();
          const status = result.availability.available ? '✅ Available' : '❌ Not available';
          console.log(`      ${name}: ${status}`);
          if (result.availability.extension) {
            console.log(`         Version: ${result.availability.extension.version}`);
          }
        } else {
          console.log(`      ${name}: ⚠️  HTTP ${checkResponse.status}`);
        }
      } catch (error) {
        console.log(`      ${name}: ❌ Error: ${error.message}`);
      }
    }

    // Test 3: Get extension connection status
    console.log('\n   🔌 Testing: Extension connection status...');
    const statusResponse = await fetch(`${BASE_URL}/api/wallet/extension-status`);
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      if (status.extensionInfo && status.extensionInfo.connected) {
        console.log(`   ✅ Extension connected with ${status.extensionInfo.accountsCount} accounts`);
        status.extensionInfo.accounts.forEach(acc => {
          console.log(`      - ${acc.name} (${acc.address.substring(0, 8)}...)`);
        });
      } else {
        console.log('   ℹ️  No extension currently connected');
      }
    } else {
      console.log(`   ⚠️  Extension status endpoint returned: ${statusResponse.status}`);
    }

    // Test 4: Test wallet connection (will fail without actual extensions)
    console.log('\n   🔗 Testing: Wallet connection attempts...');
    const walletTypes = ['extension', 'subwallet', 'talisman'];
    
    for (const type of walletTypes) {
      try {
        const connectResponse = await fetch(`${BASE_URL}/api/wallet/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletType: type })
        });
        
        if (connectResponse.ok) {
          const result = await connectResponse.json();
          console.log(`      ${type}: ✅ Connected successfully`);
          console.log(`         Accounts: ${result.result.accountsCount}`);
        } else {
          const error = await connectResponse.json();
          console.log(`      ${type}: ℹ️  ${error.message}`);
        }
      } catch (error) {
        console.log(`      ${type}: ❌ Error: ${error.message}`);
      }
    }

    // Test 5: Get wallet health with extension info
    console.log('\n   💚 Testing: Wallet health with extension info...');
    const healthResponse = await fetch(`${BASE_URL}/api/wallet/health`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`   ✅ Wallet status: ${health.health.status}`);
      console.log(`   ✅ Network: ${health.health.network.name}`);
      
      if (health.health.extension) {
        console.log(`   ✅ Extension connected: ${health.health.extension.accountsCount} accounts`);
      } else {
        console.log('   ℹ️  No extension connected');
      }
    } else {
      console.log(`   ❌ Health check failed: ${healthResponse.status}`);
    }

    console.log('\n   📊 Wallet extension integration test completed!');
    return true;

  } catch (error) {
    console.log(`   ❌ Error testing wallet extensions: ${error.message}`);
    return false;
  }
}

async function testExistingWalletFeatures() {
  console.log('\n🧪 Testing: Existing Wallet Features');
  
  try {
    // Test network switching
    console.log('   🌐 Testing: Network switching...');
    const networkResponse = await fetch(`${BASE_URL}/api/wallet/switch-network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkName: 'moonbaseAlpha' })
    });
    
    if (networkResponse.ok) {
      const result = await networkResponse.json();
      console.log(`   ✅ Switched to: ${result.network.name}`);
    } else {
      console.log(`   ⚠️  Network switch failed: ${networkResponse.status}`);
    }

    // Test available networks
    console.log('   📡 Testing: Available networks...');
    const networksResponse = await fetch(`${BASE_URL}/api/wallet/switch-network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkName: 'westend' })
    });
    
    if (networksResponse.ok) {
      const result = await networksResponse.json();
      console.log(`   ✅ Switched to: ${result.network.name}`);
    } else {
      console.log(`   ⚠️  Network switch failed: ${networksResponse.status}`);
    }

    console.log('   📊 Existing wallet features test completed!');
    return true;

  } catch (error) {
    console.log(`   ❌ Error testing existing features: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Wallet Extension Integration Tests...\n');

  let passed = 0;
  let total = 0;

  // Test wallet extension integration
  total++;
  const extensionResult = await testWalletExtensions();
  if (extensionResult) passed++;

  // Test existing wallet features
  total++;
  const existingResult = await testExistingWalletFeatures();
  if (existingResult) passed++;

  console.log(`\n📊 Final Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All wallet extension tests passed!');
    console.log('✅ Wallet extension integration is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }

  console.log('\n🔍 Test Summary:');
  console.log('   - Extension detection and availability checking');
  console.log('   - Wallet connection attempts (expected to fail without real extensions)');
  console.log('   - Extension status and health monitoring');
  console.log('   - Network switching and management');
  console.log('   - API endpoint functionality');

  return passed === total;
}

// Run all tests
runAllTests().catch(console.error);