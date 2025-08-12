const express = require('express');
const cors = require('cors');
const MultiLanguageProcessor = require('./multiLanguageProcessor');
const CommandConfirmation = require('./commandConfirmation');
const SecureWalletIntegration = require('./secureWalletIntegration');

const app = express();
const port = 3001;

// Initialize multi-language processor, confirmation system, and secure wallet integration
const multiLangProcessor = new MultiLanguageProcessor();
const commandConfirmation = new CommandConfirmation();
const secureWallet = new SecureWalletIntegration();

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for transactions and contacts
let transactions = [];
let transactionId = 1;
let contacts = [
  { id: 1, name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQg', balance: 1000 },
  { id: 2, name: 'Bob', address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', balance: 500 },
  { id: 3, name: 'Charlie', address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59K', balance: 750 },
  { id: 4, name: 'Dave', address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', balance: 300 }
];

// Mock database for recurring payments
let recurringPayments = [];
let recurringPaymentId = 1;

// Initialize secure wallet connection on startup
async function initializeSecureWallet() {
  try {
    console.log('Initializing secure wallet connection...');
    await secureWallet.initialize('moonbaseAlpha');
    console.log('✅ Secure wallet connection established');
  } catch (error) {
    console.error('❌ Secure wallet initialization failed:', error);
    console.log('Continuing with mock blockchain mode...');
  }
}

// Enhanced command processing with multi-language AI and confirmation
async function processVoiceCommand(command) {
  try {
    console.log(`Processing command: "${command}"`);
    
    // Use multi-language processor for enhanced understanding
    const aiResult = await multiLangProcessor.processCommand(command);
    
    // If AI processing failed, fallback to basic processing
    if (!aiResult || aiResult.type === 'unknown') {
      return {
        type: 'unknown',
        originalCommand: command,
        message: 'Command not recognized. Try saying "Pay 10 to Alice" or "Check balance" in English, Spanish, or French.',
        confidence: 0.0,
        detectedLanguage: 'en'
      };
    }

    // Check if command requires confirmation
    const confirmation = commandConfirmation.generateConfirmationPrompt(command, aiResult);
    
    if (confirmation.requiresConfirmation) {
      return {
        ...aiResult,
        requiresConfirmation: true,
        confirmationId: confirmation.confirmationId,
        confirmationText: confirmation.confirmationText,
        timeout: confirmation.timeout
      };
    }

    return aiResult;
    
  } catch (error) {
    console.error('Error in multi-language command processing:', error);
    // Fallback to basic processing
    return {
      type: 'unknown',
      originalCommand: command,
      message: 'Error processing command. Please try again in English, Spanish, or French.',
      confidence: 0.0,
      detectedLanguage: 'en'
    };
  }
}

// Mock API endpoints
app.post('/api/process-command', async (req, res) => {
  const commandData = req.body;
  console.log('Received command data:', commandData);

  if (!commandData.command) {
    return res.status(400).json({
      status: 'error',
      message: 'No command provided'
    });
  }

  try {
    const parsedCommand = await processVoiceCommand(commandData.command);
    
    // If command requires confirmation, return confirmation request
    if (parsedCommand.requiresConfirmation) {
      return res.json({
        status: 'confirmation_required',
        message: 'Command requires confirmation',
        parsedCommand: parsedCommand,
        confirmationId: parsedCommand.confirmationId,
        confirmationText: parsedCommand.confirmationText,
        timeout: parsedCommand.timeout,
        detectedLanguage: parsedCommand.detectedLanguage
      });
    }
    
    // Process command immediately if no confirmation needed
    const result = await executeCommand(parsedCommand);
    res.json(result);
    
  } catch (error) {
    console.error('Error processing command:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing command',
      error: error.message
    });
  }
});

// New endpoint for command confirmation
app.post('/api/confirm-command', async (req, res) => {
  const { confirmationId, userResponse } = req.body;
  
  if (!confirmationId || !userResponse) {
    return res.status(400).json({
      status: 'error',
      message: 'Confirmation ID and user response required'
    });
  }

  try {
    const confirmationResult = commandConfirmation.processConfirmation(confirmationId, userResponse);
    
    if (confirmationResult.status === 'confirmed') {
      // Execute the confirmed command
      const result = await executeCommand(confirmationResult.parsedCommand);
      res.json({
        status: 'success',
        message: 'Command confirmed and executed successfully',
        confirmationResult: confirmationResult,
        executionResult: result
      });
    } else {
      res.json(confirmationResult);
    }
    
  } catch (error) {
    console.error('Error processing confirmation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing confirmation',
      error: error.message
    });
  }
});

// Execute confirmed commands
async function executeCommand(parsedCommand) {
  switch (parsedCommand.type) {
    case 'payment':
      // Validate payment data
      if (!parsedCommand.amount || !parsedCommand.recipient) {
        return {
          status: 'error',
          message: 'Payment command missing amount or recipient',
          parsedCommand: parsedCommand
        };
      }

      // Check if recipient exists in contacts
      const recipientContact = contacts.find(c => 
        c.name.toLowerCase() === parsedCommand.recipient.toLowerCase()
      );

      if (!recipientContact) {
        return {
          status: 'error',
          message: `Recipient "${parsedCommand.recipient}" not found in contacts`,
          parsedCommand: parsedCommand
        };
      }

      // Execute real blockchain transaction if secure wallet is connected
      let transactionResult;
      if (secureWallet.getConnectionStatus() === 'connected') {
        try {
          // For demo purposes, use mock transaction
          // In production, this would use secure wallet integration
          console.log('Secure wallet connected, would execute real transaction here');
          transactionResult = {
            hash: 'mock_tx_' + Date.now(),
            status: 'pending',
            from: 'mock_address',
            to: recipientContact.address,
            amount: parsedCommand.amount.toString(),
            network: 'mock'
          };
          
        } catch (walletError) {
          console.error('Secure wallet transaction failed, falling back to mock:', walletError);
          transactionResult = null;
        }
      }

      // If blockchain transaction failed or not connected, use mock transaction
      if (!transactionResult) {
        transactionResult = {
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          status: 'completed',
          method: 'Mock Transfer'
        };
      }

      // Create transaction record
      const transaction = {
        id: transactionId++,
        type: 'payment',
        amount: parsedCommand.amount,
        recipient: parsedCommand.recipient,
        recipientAddress: recipientContact.address,
        currency: parsedCommand.currency || secureWallet.getCurrentNetwork().currency,
        status: 'completed',
        confidence: parsedCommand.confidence,
        timestamp: new Date().toISOString(),
        txHash: transactionResult.txHash,
        processingMethods: parsedCommand.processingMethods || [],
        confirmed: true,
        language: parsedCommand.detectedLanguage || 'en',
        blockchainMethod: transactionResult.method,
        network: secureWallet.getCurrentNetwork().name
      };
      
      transactions.push(transaction);
      
      return {
        status: 'success',
        message: `Successfully sent ${parsedCommand.amount} ${transaction.currency} to ${parsedCommand.recipient}`,
        transaction: transaction,
        parsedCommand: parsedCommand,
        blockchainResult: transactionResult,
        detectedLanguage: parsedCommand.detectedLanguage
      };
      
    case 'balance_check':
      return {
        status: 'success',
        message: 'Balance check requested',
        parsedCommand: parsedCommand,
        suggestedResponse: 'Your current balance is 1,250 WND',
        detectedLanguage: parsedCommand.detectedLanguage
      };
      
    case 'transaction_history':
      return {
        status: 'success',
        message: `Showing ${transactions.length} recent transactions`,
        transactions: transactions.slice(-5), // Last 5 transactions
        parsedCommand: parsedCommand,
        detectedLanguage: parsedCommand.detectedLanguage
      };

    case 'add_contact':
      if (!parsedCommand.contactName) {
        return {
          status: 'error',
          message: 'Contact name not specified',
          parsedCommand: parsedCommand
        };
      }

      // Check if contact already exists
      const existingContact = contacts.find(c => 
        c.name.toLowerCase() === parsedCommand.contactName.toLowerCase()
      );

      if (existingContact) {
        return {
          status: 'error',
          message: `Contact "${parsedCommand.contactName}" already exists`,
          parsedCommand: parsedCommand
        };
      }

      // Generate mock address for new contact
      const newContact = {
        id: contacts.length + 1,
        name: parsedCommand.contactName,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        balance: 0
      };

      contacts.push(newContact);

      return {
        status: 'success',
        message: `Contact "${parsedCommand.contactName}" added successfully`,
        contact: newContact,
        parsedCommand: parsedCommand
      };

    case 'remove_contact':
      if (!parsedCommand.contactName) {
        return {
          status: 'error',
          message: 'Contact name not specified',
          parsedCommand: parsedCommand
        };
      }

      const contactIndex = contacts.findIndex(c => 
        c.name.toLowerCase() === parsedCommand.contactName.toLowerCase()
      );

      if (contactIndex === -1) {
        return {
          status: 'error',
          message: `Contact "${parsedCommand.contactName}" not found`,
          parsedCommand: parsedCommand
        };
      }

      const removedContact = contacts.splice(contactIndex, 1)[0];

      return {
        status: 'success',
        message: `Contact "${parsedCommand.contactName}" removed successfully`,
        removedContact: removedContact,
        parsedCommand: parsedCommand
      };

    case 'recurring_payment':
      if (!parsedCommand.amount || !parsedCommand.recipient) {
        return {
          status: 'error',
          message: 'Recurring payment missing amount or recipient',
          parsedCommand: parsedCommand
        };
      }

      const recurringPayment = {
        id: recurringPaymentId++,
        amount: parsedCommand.amount,
        recipient: parsedCommand.recipient,
        currency: parsedCommand.currency || secureWallet.getCurrentNetwork().currency,
        frequency: 'monthly', // Default frequency
        status: 'active',
        createdAt: new Date().toISOString(),
        nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };

      recurringPayments.push(recurringPayment);

      return {
        status: 'success',
        message: `Recurring payment of ${parsedCommand.amount} ${parsedCommand.currency || secureWallet.getCurrentNetwork().currency} to ${parsedCommand.recipient} set up successfully`,
        recurringPayment: recurringPayment,
        parsedCommand: parsedCommand
      };
      
    default:
      return {
        status: 'error',
        message: parsedCommand.message || 'Command not recognized',
        parsedCommand: parsedCommand
      };
  }
}

// Blockchain endpoints
app.post('/api/blockchain/connect', async (req, res) => {
  const { network } = req.body;
  
  try {
    const result = await secureWallet.initialize(network || 'moonbaseAlpha');
    res.json({
      status: 'success',
      message: `Connected to ${result.network}`,
      connection: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to blockchain',
      error: error.message
    });
  }
});

app.get('/api/blockchain/status', (req, res) => {
  res.json({
    status: 'success',
    connection: secureWallet.getConnectionStatus(),
    networks: secureWallet.getAvailableNetworks()
  });
});

app.post('/api/blockchain/switch-network', async (req, res) => {
  const { network } = req.body;
  
  try {
    const result = await secureWallet.switchNetwork(network);
    res.json({
      status: 'success',
      message: `Switched to ${result.network}`,
      connection: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to switch network',
      error: error.message
    });
  }
});

app.get('/api/blockchain/balance/:address', async (req, res) => {
  const { address } = req.params;
  
  try {
    const balance = await secureWallet.getBalance(address);
    res.json({
      status: 'success',
      balance: balance
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get balance',
      error: error.message
    });
  }
});

app.post('/api/blockchain/estimate-fees', async (req, res) => {
  const { fromAddress, toAddress, amount } = req.body;
  
  try {
    const fees = await secureWallet.estimateFees(fromAddress, toAddress, amount);
    res.json({
      status: 'success',
      fees: fees
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to estimate fees',
      error: error.message
    });
  }
});

app.get('/api/blockchain/stats', async (req, res) => {
  try {
    const stats = await secureWallet.getBlockchainStats();
    res.json({
      status: 'success',
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get blockchain stats',
      error: error.message
    });
  }
});

app.get('/api/blockchain/transaction/:txHash', async (req, res) => {
  const { txHash } = req.params;
  
  try {
    const status = await secureWallet.getTransactionStatus(txHash);
    res.json({
      status: 'success',
      transaction: status
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get transaction status',
      error: error.message
    });
  }
});

// Get transaction history
app.get('/api/transactions', (req, res) => {
  res.json({
    status: 'success',
    transactions: transactions
  });
});

// Get contacts
app.get('/api/contacts', (req, res) => {
  res.json({
    status: 'success',
    contacts: contacts
  });
});

// Get recurring payments
app.get('/api/recurring-payments', (req, res) => {
  res.json({
    status: 'success',
    recurringPayments: recurringPayments
  });
});

// Get pending confirmations
app.get('/api/confirmations', (req, res) => {
  res.json({
    status: 'success',
    confirmations: commandConfirmation.getPendingConfirmations()
  });
});

// Get confirmation statistics
app.get('/api/confirmation-stats', (req, res) => {
  res.json({
    status: 'success',
    stats: commandConfirmation.getStats()
  });
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    status: 'success',
    languages: multiLangProcessor.getSupportedLanguages()
  });
});

// Get multi-language processing statistics
app.get('/api/ai-stats', (req, res) => {
  res.json({
    status: 'success',
    stats: multiLangProcessor.getProcessingStats(),
    totalCommands: transactions.length + recurringPayments.length
  });
});

// Secure Wallet API endpoints
app.post('/api/wallet/connect', async (req, res) => {
  try {
    const { walletType } = req.body;
    const result = await secureWallet.connectWallet(walletType || 'extension');
    res.json({
      status: 'success',
      message: 'Wallet connected successfully',
      walletType,
      result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.get('/api/wallet/accounts', async (req, res) => {
  try {
    const accounts = await secureWallet.getAccounts();
    res.json({
      status: 'success',
      accounts
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.post('/api/wallet/select-account', async (req, res) => {
  try {
    const { address } = req.body;
    const account = await secureWallet.selectAccount(address);
    res.json({
      status: 'success',
      message: 'Account selected successfully',
      account: {
        address: account.address,
        name: account.meta.name || 'Unknown'
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.get('/api/wallet/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await secureWallet.getBalance(address);
    res.json({
      status: 'success',
      balance
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.post('/api/wallet/estimate-fees', async (req, res) => {
  try {
    const { fromAddress, toAddress, amount } = req.body;
    const fees = await secureWallet.estimateFees(fromAddress, toAddress, amount);
    res.json({
      status: 'success',
      fees
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.get('/api/wallet/health', async (req, res) => {
  try {
    const health = await secureWallet.getWalletHealth();
    res.json({
      status: 'success',
      health
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

app.post('/api/wallet/switch-network', async (req, res) => {
  try {
    const { networkName } = req.body;
    await secureWallet.switchNetwork(networkName);
    res.json({
      status: 'success',
      message: `Switched to ${networkName}`,
      network: secureWallet.getCurrentNetwork()
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    multiLanguageProcessor: 'active',
    commandConfirmation: 'active',
    secureWallet: secureWallet.getConnectionStatus(),
    supportedLanguages: multiLangProcessor.getSupportedLanguages().length,
    totalContacts: contacts.length,
    totalTransactions: transactions.length,
    totalRecurringPayments: recurringPayments.length,
    pendingConfirmations: commandConfirmation.getPendingConfirmations().length
  });
});

// Initialize secure wallet on startup
initializeSecureWallet();

app.listen(port, () => {
  console.log(`EchoPay Multi-Language AI-powered backend with blockchain integration listening at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  POST /api/process-command           - Process voice commands with multi-language AI');
  console.log('  POST /api/confirm-command           - Confirm pending commands');
  console.log('  GET  /api/confirmations             - Get pending confirmations');
  console.log('  GET  /api/confirmation-stats        - Get confirmation statistics');
  console.log('  GET  /api/languages                 - Get supported languages');
  console.log('  POST /api/wallet/connect            - Connect to wallet (extension/subwallet/talisman)');
  console.log('  GET  /api/wallet/accounts           - Get available accounts');
  console.log('  POST /api/wallet/select-account     - Select account for transactions');
  console.log('  GET  /api/wallet/balance/:addr      - Get account balance');
  console.log('  POST /api/wallet/estimate-fees      - Estimate transaction fees');
  console.log('  GET  /api/wallet/health             - Get wallet health status');
  console.log('  POST /api/wallet/switch-network     - Switch blockchain network');
  console.log('  GET  /api/transactions              - Get transaction history');
  console.log('  GET  /api/contacts                  - Get contact list');
  console.log('  GET  /api/recurring-payments        - Get recurring payments');
  console.log('  GET  /api/ai-stats                  - Get AI processing statistics');
  console.log('  GET  /api/health                    - Health check');
  console.log('');
  console.log('Multi-Language AI Command Processor, Confirmation System, and Blockchain Integration initialized!');
  console.log(`Supported Languages: ${multiLangProcessor.getSupportedLanguages().map(l => l.name).join(', ')}`);
  console.log(`Available Networks: ${secureWallet.getAvailableNetworks().map(n => n.name).join(', ')}`);
});
