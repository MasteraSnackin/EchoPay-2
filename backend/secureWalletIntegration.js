const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { formatBalance, formatNumber } = require('@polkadot/util');

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
    // This would integrate with @polkadot/extension-dapp
    // For now, we'll simulate the connection flow
    throw new Error('Polkadot extension integration not yet implemented');
  }

  async connectSubWallet() {
    // This would integrate with SubWallet's API
    // For now, we'll simulate the connection flow
    throw new Error('SubWallet integration not yet implemented');
  }

  async connectTalisman() {
    // This would integrate with Talisman's API
    // For now, we'll simulate the connection flow
    throw new Error('Talisman integration not yet implemented');
  }

  // Account management
  async getAccounts() {
    if (!this.keyring) {
      throw new Error('Wallet not initialized');
    }
    
    return this.keyring.getAccounts().map(account => ({
      address: account.address,
      name: account.meta.name || 'Unknown',
      type: account.type,
      isCurrent: account.address === this.currentAccount?.address
    }));
  }

  async selectAccount(address) {
    if (!this.keyring) {
      throw new Error('Wallet not initialized');
    }

    const account = this.keyring.getAccount(address);
    if (!account) {
      throw new Error(`Account not found: ${address}`);
    }

    this.currentAccount = account;
    console.log(`✅ Selected account: ${account.meta.name || address}`);
    return account;
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

  getCurrentNetwork() {
    return {
      id: this.networkName,
      ...this.supportedNetworks[this.networkName]
    };
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Security methods
  async disconnect() {
    try {
      if (this.api) {
        await this.api.disconnect();
      }
      this.currentAccount = null;
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
      timestamp: Date.now()
    };
  }
}

module.exports = SecureWalletIntegration;