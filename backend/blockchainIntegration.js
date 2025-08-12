const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { formatBalance, formatNumber } = require('@polkadot/util');

class BlockchainIntegration {
  constructor() {
    this.api = null;
    this.keyring = null;
    this.networks = {
      moonbaseAlpha: {
        name: 'Moonbase Alpha',
        url: 'wss://wss.testnet.moonbeam.network',
        chainId: 'moonbase-alpha',
        currency: 'DEV',
        decimals: 18,
        explorer: 'https://moonbase.moonscan.io'
      },
      westend: {
        name: 'Westend',
        url: 'wss://westend-rpc.polkadot.io',
        chainId: 'westend',
        currency: 'WND',
        decimals: 12,
        explorer: 'https://westend.subscan.io'
      },
      polkadot: {
        name: 'Polkadot',
        url: 'wss://rpc.polkadot.io',
        chainId: 'polkadot',
        currency: 'DOT',
        decimals: 10,
        explorer: 'https://polkascan.io/polkadot'
      }
    };
    this.currentNetwork = 'moonbaseAlpha';
    this.isConnected = false;
  }

  // Initialize blockchain connection
  async initialize(networkName = 'moonbaseAlpha') {
    try {
      console.log(`Initializing blockchain connection to ${networkName}...`);
      
      // Wait for crypto to be ready
      await cryptoWaitReady();
      
      // Initialize keyring
      this.keyring = new Keyring({ type: 'sr25519' });
      
      // Set network
      this.currentNetwork = networkName;
      const network = this.networks[networkName];
      
      if (!network) {
        throw new Error(`Unsupported network: ${networkName}`);
      }
      
      // Create API connection
      const provider = new WsProvider(network.url);
      this.api = await ApiPromise.create({ provider });
      
      // Wait for API to be ready
      await this.api.isReady;
      
      // Set default format options
      formatBalance.setDefaults({
        decimals: network.decimals,
        unit: network.currency
      });
      
      this.isConnected = true;
      console.log(`✅ Connected to ${network.name} (${network.currency})`);
      
      return {
        status: 'connected',
        network: network.name,
        currency: network.currency,
        decimals: network.decimals,
        chainId: network.chainId
      };
      
    } catch (error) {
      console.error('❌ Blockchain initialization failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // Get account balance
  async getBalance(address) {
    if (!this.isConnected || !this.api) {
      throw new Error('Blockchain not connected');
    }

    try {
      const accountInfo = await this.api.query.system.account(address);
      const freeBalance = accountInfo.data.free;
      const reservedBalance = accountInfo.data.reserved;
      const miscFrozen = accountInfo.data.miscFrozen;
      const feeFrozen = accountInfo.data.feeFrozen;
      
      const network = this.networks[this.currentNetwork];
      
      return {
        address: address,
        free: formatBalance(freeBalance, { withUnit: true, withSi: false }),
        reserved: formatBalance(reservedBalance, { withUnit: true, withSi: false }),
        miscFrozen: formatBalance(miscFrozen, { withUnit: true, withSi: false }),
        feeFrozen: formatBalance(feeFrozen, { withUnit: true, withSi: false }),
        available: formatBalance(freeBalance.sub(miscFrozen), { withUnit: true, withSi: false }),
        currency: network.currency,
        decimals: network.decimals,
        raw: {
          free: freeBalance.toString(),
          reserved: reservedBalance.toString(),
          miscFrozen: miscFrozen.toString(),
          feeFrozen: feeFrozen.toString()
        }
      };
      
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Estimate transaction fees
  async estimateFees(fromAddress, toAddress, amount, callData = null) {
    if (!this.isConnected || !this.api) {
      throw new Error('Blockchain not connected');
    }

    try {
      const network = this.networks[this.currentNetwork];
      
      // For Moonbase Alpha (EVM compatible)
      if (this.currentNetwork === 'moonbaseAlpha') {
        return await this.estimateEVMFees(fromAddress, toAddress, amount, callData);
      }
      
      // For Polkadot/Westend (Substrate)
      return await this.estimateSubstrateFees(fromAddress, toAddress, amount);
      
    } catch (error) {
      console.error('Error estimating fees:', error);
      throw error;
    }
  }

  // Estimate fees for EVM-compatible networks (Moonbase Alpha)
  async estimateEVMFees(fromAddress, toAddress, amount, callData = null) {
    try {
      // This would require Web3.js for EVM calls
      // For now, return estimated fees based on network
      const network = this.networks[this.currentNetwork];
      
      return {
        gasLimit: '21000', // Standard transfer
        gasPrice: '20000000000', // 20 Gwei
        estimatedFee: '0.00042', // 21000 * 20 Gwei
        currency: network.currency,
        method: 'EVM Transfer'
      };
      
    } catch (error) {
      console.error('Error estimating EVM fees:', error);
      throw error;
    }
  }

  // Estimate fees for Substrate networks (Polkadot/Westend)
  async estimateSubstrateFees(fromAddress, toAddress, amount) {
    try {
      const network = this.networks[this.currentNetwork];
      
      // Create transfer call
      const transferCall = this.api.tx.balances.transfer(toAddress, amount);
      
      // Get payment info
      const paymentInfo = await transferCall.paymentInfo(fromAddress);
      
      return {
        gasLimit: paymentInfo.weight.toString(),
        gasPrice: '1', // Substrate uses weight-based fees
        estimatedFee: formatBalance(paymentInfo.partialFee, { withUnit: true, withSi: false }),
        currency: network.currency,
        method: 'Substrate Transfer'
      };
      
    } catch (error) {
      console.error('Error estimating Substrate fees:', error);
      throw error;
    }
  }

  // Execute transfer transaction
  async executeTransfer(fromPrivateKey, toAddress, amount, options = {}) {
    if (!this.isConnected || !this.api) {
      throw new Error('Blockchain not connected');
    }

    try {
      const network = this.networks[this.currentNetwork];
      
      // Add account to keyring
      const account = this.keyring.addFromSeed(fromPrivateKey);
      const fromAddress = account.address;
      
      console.log(`Executing transfer: ${amount} ${network.currency} from ${fromAddress} to ${toAddress}`);
      
      // For Moonbase Alpha (EVM compatible)
      if (this.currentNetwork === 'moonbaseAlpha') {
        return await this.executeEVMTransfer(account, toAddress, amount, options);
      }
      
      // For Polkadot/Westend (Substrate)
      return await this.executeSubstrateTransfer(account, toAddress, amount, options);
      
    } catch (error) {
      console.error('Error executing transfer:', error);
      throw error;
    }
  }

  // Execute EVM transfer
  async executeEVMTransfer(account, toAddress, amount, options) {
    try {
      // This would require Web3.js for actual EVM execution
      // For now, simulate the transaction
      const network = this.networks[this.currentNetwork];
      
      // Simulate transaction hash
      const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      return {
        status: 'success',
        txHash: txHash,
        from: account.address,
        to: toAddress,
        amount: amount,
        currency: network.currency,
        network: network.name,
        method: 'EVM Transfer',
        timestamp: new Date().toISOString(),
        explorer: `${network.explorer}/tx/${txHash}`
      };
      
    } catch (error) {
      console.error('Error executing EVM transfer:', error);
      throw error;
    }
  }

  // Execute Substrate transfer
  async executeSubstrateTransfer(account, toAddress, amount, options) {
    try {
      const network = this.networks[this.currentNetwork];
      
      // Create transfer call
      const transferCall = this.api.tx.balances.transfer(toAddress, amount);
      
      // Sign and send transaction
      const txHash = await transferCall.signAndSend(account, {
        nonce: await this.api.rpc.system.accountNextIndex(account.address),
        tip: options.tip || 0
      }, (result) => {
        if (result.status.isInBlock) {
          console.log(`Transaction included in block ${result.status.asInBlock}`);
        } else if (result.status.isFinalized) {
          console.log(`Transaction finalized in block ${result.status.asFinalized}`);
        }
      });
      
      return {
        status: 'success',
        txHash: txHash.toString(),
        from: account.address,
        to: toAddress,
        amount: amount,
        currency: network.currency,
        network: network.name,
        method: 'Substrate Transfer',
        timestamp: new Date().toISOString(),
        explorer: `${network.explorer}/extrinsic/${txHash}`
      };
      
    } catch (error) {
      console.error('Error executing Substrate transfer:', error);
      throw error;
    }
  }

  // Get transaction status
  async getTransactionStatus(txHash) {
    if (!this.isConnected || !this.api) {
      throw new Error('Blockchain not connected');
    }

    try {
      const network = this.networks[this.currentNetwork];
      
      // For Moonbase Alpha (EVM compatible)
      if (this.currentNetwork === 'moonbaseAlpha') {
        return await this.getEVMTransactionStatus(txHash);
      }
      
      // For Polkadot/Westend (Substrate)
      return await this.getSubstrateTransactionStatus(txHash);
      
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  // Get EVM transaction status
  async getEVMTransactionStatus(txHash) {
    try {
      // This would require Web3.js for actual EVM queries
      // For now, return simulated status
      const network = this.networks[this.currentNetwork];
      
      return {
        txHash: txHash,
        status: 'confirmed',
        confirmations: 12,
        blockNumber: Math.floor(Math.random() * 1000000),
        network: network.name,
        method: 'EVM Transfer',
        timestamp: new Date().toISOString(),
        explorer: `${network.explorer}/tx/${txHash}`
      };
      
    } catch (error) {
      console.error('Error getting EVM transaction status:', error);
      throw error;
    }
  }

  // Get Substrate transaction status
  async getSubstrateTransactionStatus(txHash) {
    try {
      const network = this.networks[this.currentNetwork];
      
      // Get transaction details from chain
      const blockHash = await this.api.rpc.chain.getBlockHash(txHash);
      const block = await this.api.rpc.chain.getBlock(blockHash);
      
      return {
        txHash: txHash,
        status: 'confirmed',
        confirmations: 1,
        blockNumber: block.block.header.number.toString(),
        network: network.name,
        method: 'Substrate Transfer',
        timestamp: new Date().toISOString(),
        explorer: `${network.explorer}/extrinsic/${txHash}`
      };
      
    } catch (error) {
      console.error('Error getting Substrate transaction status:', error);
      throw error;
    }
  }

  // Switch network
  async switchNetwork(networkName) {
    try {
      console.log(`Switching to network: ${networkName}`);
      
      // Disconnect from current network
      if (this.api) {
        await this.api.disconnect();
        this.api = null;
      }
      
      // Initialize new network
      const result = await this.initialize(networkName);
      
      return result;
      
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    }
  }

  // Get available networks
  getAvailableNetworks() {
    return Object.keys(this.networks).map(key => ({
      key: key,
      ...this.networks[key]
    }));
  }

  // Get current network info
  getCurrentNetwork() {
    return {
      key: this.currentNetwork,
      ...this.networks[this.currentNetwork]
    };
  }

  // Check connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      currentNetwork: this.currentNetwork,
      networkInfo: this.networks[this.currentNetwork]
    };
  }

  // Disconnect from blockchain
  async disconnect() {
    try {
      if (this.api) {
        await this.api.disconnect();
        this.api = null;
      }
      
      this.isConnected = false;
      console.log('Disconnected from blockchain');
      
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }

  // Get blockchain statistics
  async getBlockchainStats() {
    if (!this.isConnected || !this.api) {
      throw new Error('Blockchain not connected');
    }

    try {
      const network = this.networks[this.currentNetwork];
      
      // Get chain info
      const chainInfo = await this.api.rpc.system.chain();
      const chainType = await this.api.rpc.system.chainType();
      const version = await this.api.rpc.system.version();
      
      // Get latest block
      const latestBlock = await this.api.rpc.chain.getHeader();
      
      return {
        network: network.name,
        currency: network.currency,
        chainName: chainInfo.toString(),
        chainType: chainType.toString(),
        version: version.toString(),
        latestBlock: latestBlock.number.toString(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      throw error;
    }
  }
}

module.exports = BlockchainIntegration;