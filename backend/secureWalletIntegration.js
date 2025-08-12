const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { formatBalance, formatNumber } = require('@polkadot/util');

// Extension integration (will be null in Node.js environment)
let web3Accounts, web3Enable;
try {
  const extensionDapp = require('@polkadot/extension-dapp');
  web3Accounts = extensionDapp.web3Accounts;
  web3Enable = extensionDapp.web3Enable;
} catch (error) {
  console.log('⚠️  @polkadot/extension-dapp not available in Node.js environment');
  web3Accounts = null;
  web3Enable = null;
}

class SecureWalletIntegration {
  constructor() {
    this.api = null;
    this.keyring = null;
    this.currentAccount = null;
    this.networkName = 'moonbaseAlpha';
    this.connectionStatus = 'disconnected';
    this.supportedNetworks = {
      moonbaseAlpha: {
        name: 'Moonbase Alpha',
        rpcUrl: 'wss://wss.api.moonbase.moonbeam.network',
        chainId: 1287,
        currency: 'DEV',
        decimals: 18
      },
      westend: {
        name: 'Westend Testnet',
        rpcUrl: 'wss://westend-rpc.polkadot.io',
        chainId: 0,
        currency: 'WND',
        decimals: 10
      },
      polkadot: {
        name: 'Polkadot Mainnet',
        rpcUrl: 'wss://rpc.polkadot.io',
        chainId: 0,
        currency: 'DOT',
        decimals: 10
      }
    };
  }

  async initialize(networkName = 'moonbaseAlpha') {
    try {
      this.connectionStatus = 'connecting';
      
      // Wait for crypto to be ready
      await cryptoWaitReady();
      
      // Initialize keyring
      this.keyring = new Keyring({ type: 'sr25519' });
      
      // Connect to network
      await this.switchNetwork(networkName);
      
      this.connectionStatus = 'connected';
      console.log(`✅ Connected to ${this.networkName}`);
      return true;
    } catch (error) {
      this.connectionStatus = 'error';
      console.error('❌ Failed to initialize wallet:', error);
      throw error;
    }
  }

  async switchNetwork(networkName) {
    if (!this.supportedNetworks[networkName]) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    try {
      // Disconnect from current network
      if (this.api) {
        await this.api.disconnect();
      }

      const network = this.supportedNetworks[networkName];
      const provider = new WsProvider(network.rpcUrl);
      
      this.api = await ApiPromise.create({ provider });
      this.networkName = networkName;
      
      console.log(`✅ Switched to ${network.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to switch to ${networkName}:`, error);
      throw error;
    }
  }

  // Wallet connection methods
  async connectWallet(walletType = 'extension') {
    try {
      switch (walletType) {
        case 'extension':
          return await this.connectPolkadotExtension();
        case 'subwallet':
          return await this.connectSubWallet();
        case 'talisman':
          return await this.connectTalisman();
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      throw error;
    }
  }

  async connectPolkadotExtension() {
    try {
      if (!web3Enable || !web3Accounts) {
        throw new Error('Wallet extensions not available in this environment. Use browser with Polkadot.js extension.');
      }
      
      // Enable the Polkadot extension
      const extensions = await web3Enable('EchoPay Voice Payment System');
      
      if (extensions.length === 0) {
        throw new Error('No Polkadot extensions found. Please install Polkadot.js or SubWallet extension.');
      }
      
      // Get accounts from the extension
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet extension. Please create or import an account.');
      }
      
      // Store the accounts for later use
      this.extensionAccounts = accounts;
      
      console.log(`✅ Connected to Polkadot extension with ${accounts.length} accounts`);
      
      return {
        success: true,
        extensions: extensions.map(ext => ext.name),
        accountsCount: accounts.length,
        accounts: accounts.map(acc => ({
          address: acc.address,
          name: acc.meta.name || 'Unknown',
          type: acc.type
        }))
      };
    } catch (error) {
      console.error('❌ Failed to connect to Polkadot extension:', error);
      throw error;
    }
  }

  async connectSubWallet() {
    try {
      if (!web3Enable || !web3Accounts) {
        throw new Error('Wallet extensions not available in this environment. Use browser with SubWallet extension.');
      }
      
      // SubWallet integration would use their specific API
      // For now, we'll use the same approach as Polkadot extension
      const extensions = await web3Enable('EchoPay Voice Payment System');
      
      const subwalletExtension = extensions.find(ext => 
        ext.name.toLowerCase().includes('subwallet') || 
        ext.name.toLowerCase().includes('sub')
      );
      
      if (!subwalletExtension) {
        throw new Error('SubWallet extension not found. Please install SubWallet extension.');
      }
      
      // Get accounts from SubWallet
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found in SubWallet. Please create or import an account.');
      }
      
      // Store the accounts for later use
      this.extensionAccounts = accounts;
      
      console.log(`✅ Connected to SubWallet with ${accounts.length} accounts`);
      
      return {
        success: true,
        extension: 'SubWallet',
        accountsCount: accounts.length,
        accounts: accounts.map(acc => ({
          address: acc.address,
          name: acc.meta.name || 'Unknown',
          type: acc.type
        }))
      };
    } catch (error) {
      console.error('❌ Failed to connect to SubWallet:', error);
      throw error;
    }
  }

  async connectTalisman() {
    try {
      if (!web3Enable || !web3Accounts) {
        throw new Error('Wallet extensions not available in this environment. Use browser with Talisman extension.');
      }
      
      // Talisman integration would use their specific API
      // For now, we'll use the same approach as Polkadot extension
      const extensions = await web3Enable('EchoPay Voice Payment System');
      
      const talismanExtension = extensions.find(ext => 
        ext.name.toLowerCase().includes('talisman') || 
        ext.name.toLowerCase().includes('tal')
      );
      
      if (!talismanExtension) {
        throw new Error('Talisman extension not found. Please install Talisman extension.');
      }
      
      // Get accounts from Talisman
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found in Talisman. Please create or import an account.');
      }
      
      // Store the accounts for later use
      this.extensionAccounts = accounts;
      
      console.log(`✅ Connected to Talisman with ${accounts.length} accounts`);
      
      return {
        success: true,
        extension: 'Talisman',
        accountsCount: accounts.length,
        accounts: accounts.map(acc => ({
          address: acc.address,
          name: acc.meta.name || 'Unknown',
          type: acc.type
        }))
      };
    } catch (error) {
      console.error('❌ Failed to connect to Talisman:', error);
      throw error;
    }
  }

  // Account management
  async getAccounts() {
    // First try to get accounts from extension if connected
    if (this.extensionAccounts && this.extensionAccounts.length > 0) {
      return this.extensionAccounts.map(account => ({
        address: account.address,
        name: account.meta.name || 'Unknown',
        type: account.type,
        isCurrent: account.address === this.currentAccount?.address,
        source: 'extension'
      }));
    }
    
    // Fallback to keyring accounts
    if (this.keyring) {
      return this.keyring.getAccounts().map(account => ({
        address: account.address,
        name: account.meta.name || 'Unknown',
        type: account.type,
        isCurrent: account.address === this.currentAccount?.address,
        source: 'keyring'
      }));
    }
    
    throw new Error('No wallet accounts available');
  }

  async selectAccount(address) {
    // First try to find account in extension accounts
    if (this.extensionAccounts && this.extensionAccounts.length > 0) {
      const extensionAccount = this.extensionAccounts.find(acc => acc.address === address);
      if (extensionAccount) {
        this.currentAccount = extensionAccount;
        console.log(`✅ Selected extension account: ${extensionAccount.meta.name || address}`);
        return extensionAccount;
      }
    }
    
    // Fallback to keyring accounts
    if (this.keyring) {
      const account = this.keyring.getAccount(address);
      if (account) {
        this.currentAccount = account;
        console.log(`✅ Selected keyring account: ${account.meta.name || address}`);
        return account;
      }
    }
    
    throw new Error(`Account not found: ${address}`);
  }

  async getCurrentAccount() {
    return this.currentAccount;
  }

  // Balance and transaction methods
  async getBalance(address) {
    if (!this.api) {
      throw new Error('Not connected to network');
    }

    try {
      const { data: balance } = await this.api.query.system.account(address);
      const network = this.supportedNetworks[this.networkName];
      
      return {
        free: formatBalance(balance.free, { decimals: network.decimals, withUnit: network.currency }),
        reserved: formatBalance(balance.reserved, { decimals: network.decimals, withUnit: network.currency }),
        miscFrozen: formatBalance(balance.miscFrozen, { decimals: network.decimals, withUnit: network.currency }),
        feeFrozen: formatBalance(balance.feeFrozen, { decimals: network.decimals, withUnit: network.currency }),
        raw: balance.free.toString()
      };
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  async estimateFees(fromAddress, toAddress, amount) {
    if (!this.api || !this.currentAccount) {
      throw new Error('Not connected or no account selected');
    }

    try {
      const transfer = this.api.tx.balances.transfer(toAddress, amount);
      const { partialFee } = await transfer.paymentInfo(fromAddress);
      
      const network = this.supportedNetworks[this.networkName];
      return {
        fee: formatBalance(partialFee, { decimals: network.decimals, withUnit: network.currency }),
        raw: partialFee.toString()
      };
    } catch (error) {
      console.error('❌ Failed to estimate fees:', error);
      throw error;
    }
  }

  async executeTransfer(toAddress, amount, options = {}) {
    if (!this.api || !this.currentAccount) {
      throw new Error('Not connected or no account selected');
    }

    try {
      const transfer = this.api.tx.balances.transfer(toAddress, amount);
      
      // Get nonce
      const nonce = await this.api.rpc.system.accountNextIndex(this.currentAccount.address);
      
      // Sign and send transaction
      const txHash = await transfer.signAndSend(this.currentAccount, {
        nonce,
        ...options
      });

      return {
        hash: txHash.toHex(),
        status: 'pending',
        from: this.currentAccount.address,
        to: toAddress,
        amount: amount.toString(),
        network: this.networkName
      };
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      throw error;
    }
  }

  // Transaction status
  async getTransactionStatus(txHash) {
    if (!this.api) {
      throw new Error('Not connected to network');
    }

    try {
      const blockHash = await this.api.rpc.chain.getBlockHash();
      const block = await this.api.rpc.chain.getBlock(blockHash);
      
      // This is a simplified check - in production you'd want more detailed status tracking
      return {
        hash: txHash,
        status: 'confirmed',
        blockNumber: block.block.header.number.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to get transaction status:', error);
      return {
        hash: txHash,
        status: 'unknown',
        error: error.message
      };
    }
  }

  // Network information
  getAvailableNetworks() {
    return Object.keys(this.supportedNetworks).map(key => ({
      id: key,
      ...this.supportedNetworks[key]
    }));
  }

  async getAvailableExtensions() {
    try {
      if (!web3Enable) {
        return [];
      }
      
      const extensions = await web3Enable('EchoPay Voice Payment System');
      return extensions.map(ext => ({
        name: ext.name,
        version: ext.version,
        description: ext.description || 'Polkadot wallet extension'
      }));
    } catch (error) {
      console.error('❌ Failed to get available extensions:', error);
      return [];
    }
  }

  async checkExtensionAvailability(extensionName) {
    try {
      if (!web3Enable) {
        return { available: false, extension: null, reason: 'Extensions not available in this environment' };
      }
      
      const extensions = await web3Enable('EchoPay Voice Payment System');
      const targetExtension = extensions.find(ext => 
        ext.name.toLowerCase().includes(extensionName.toLowerCase())
      );
      
      return {
        available: !!targetExtension,
        extension: targetExtension ? {
          name: targetExtension.name,
          version: targetExtension.version
        } : null
      };
    } catch (error) {
      console.error(`❌ Failed to check ${extensionName} availability:`, error);
      return { available: false, extension: null, reason: error.message };
    }
  }

  getCurrentNetwork() {
    return {
      id: this.networkName,
      ...this.supportedNetworks[this.networkName]
    };
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  isExtensionConnected() {
    return this.extensionAccounts && this.extensionAccounts.length > 0;
  }

  getExtensionInfo() {
    if (!this.isExtensionConnected()) {
      return null;
    }
    
    return {
      connected: true,
      accountsCount: this.extensionAccounts.length,
      accounts: this.extensionAccounts.map(acc => ({
        address: acc.address,
        name: acc.meta.name || 'Unknown',
        type: acc.type
      })),
      currentAccount: this.currentAccount ? {
        address: this.currentAccount.address,
        name: this.currentAccount.meta.name || 'Unknown',
        type: this.currentAccount.type
      } : null
    };
  }

  // Security methods
  async disconnect() {
    try {
      if (this.api) {
        await this.api.disconnect();
      }
      this.currentAccount = null;
      this.extensionAccounts = null;
      this.connectionStatus = 'disconnected';
      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }

  // Wallet health check
  async getWalletHealth() {
    return {
      status: this.connectionStatus,
      network: this.getCurrentNetwork(),
      account: this.currentAccount ? {
        address: this.currentAccount.address,
        name: this.currentAccount.meta.name || 'Unknown'
      } : null,
      extension: this.getExtensionInfo(),
      timestamp: Date.now()
    };
  }
}

module.exports = SecureWalletIntegration;