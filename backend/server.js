const express = require('express');
const cors = require('cors');
const AICommandProcessor = require('./aiCommandProcessor');

const app = express();
const port = 3001;

// Initialize AI command processor
const aiProcessor = new AICommandProcessor();

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for transactions and contacts
let transactions = [];
let transactionId = 1;
let contacts = [
  { id: 1, name: 'Alice', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', balance: 1000 },
  { id: 2, name: 'Bob', address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', balance: 500 },
  { id: 3, name: 'Charlie', address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59K', balance: 750 },
  { id: 4, name: 'Dave', address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', balance: 300 }
];

// Mock database for recurring payments
let recurringPayments = [];
let recurringPaymentId = 1;

// Enhanced command processing with AI
async function processVoiceCommand(command) {
  try {
    // Use AI processor for enhanced understanding
    const aiResult = await aiProcessor.processCommand(command);
    
    // If AI processing failed, fallback to basic processing
    if (!aiResult || aiResult.type === 'unknown') {
      return {
        type: 'unknown',
        originalCommand: command,
        message: 'Command not recognized. Try saying "Pay 10 to Alice" or "Check balance"',
        confidence: 0.0
      };
    }

    return aiResult;
  } catch (error) {
    console.error('Error in AI command processing:', error);
    // Fallback to basic processing
    return {
      type: 'unknown',
      originalCommand: command,
      message: 'Error processing command. Please try again.',
      confidence: 0.0
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
    
    switch (parsedCommand.type) {
      case 'payment':
        // Validate payment data
        if (!parsedCommand.amount || !parsedCommand.recipient) {
          return res.status(400).json({
            status: 'error',
            message: 'Payment command missing amount or recipient',
            parsedCommand: parsedCommand
          });
        }

        // Check if recipient exists in contacts
        const recipientContact = contacts.find(c => 
          c.name.toLowerCase() === parsedCommand.recipient.toLowerCase()
        );

        if (!recipientContact) {
          return res.status(400).json({
            status: 'error',
            message: `Recipient "${parsedCommand.recipient}" not found in contacts`,
            parsedCommand: parsedCommand
          });
        }

        // Simulate payment processing
        const transaction = {
          id: transactionId++,
          type: 'payment',
          amount: parsedCommand.amount,
          recipient: parsedCommand.recipient,
          recipientAddress: recipientContact.address,
          currency: parsedCommand.currency || 'WND',
          status: 'completed',
          confidence: parsedCommand.confidence,
          timestamp: new Date().toISOString(),
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          processingMethods: parsedCommand.processingMethods || []
        };
        
        transactions.push(transaction);
        
        res.json({
          status: 'success',
          message: `Successfully sent ${parsedCommand.amount} ${parsedCommand.currency || 'WND'} to ${parsedCommand.recipient}`,
          transaction: transaction,
          parsedCommand: parsedCommand
        });
        break;
        
      case 'balance_check':
        res.json({
          status: 'success',
          message: 'Balance check requested',
          parsedCommand: parsedCommand,
          suggestedResponse: 'Your current balance is 1,250 WND'
        });
        break;
        
      case 'transaction_history':
        res.json({
          status: 'success',
          message: `Showing ${transactions.length} recent transactions`,
          transactions: transactions.slice(-5), // Last 5 transactions
          parsedCommand: parsedCommand
        });
        break;

      case 'add_contact':
        if (!parsedCommand.contactName) {
          return res.status(400).json({
            status: 'error',
            message: 'Contact name not specified',
            parsedCommand: parsedCommand
          });
        }

        // Check if contact already exists
        const existingContact = contacts.find(c => 
          c.name.toLowerCase() === parsedCommand.contactName.toLowerCase()
        );

        if (existingContact) {
          return res.status(400).json({
            status: 'error',
            message: `Contact "${parsedCommand.contactName}" already exists`,
            parsedCommand: parsedCommand
          });
        }

        // Generate mock address for new contact
        const newContact = {
          id: contacts.length + 1,
          name: parsedCommand.contactName,
          address: `0x${Math.random().toString(16).substr(2, 40)}`,
          balance: 0
        };

        contacts.push(newContact);

        res.json({
          status: 'success',
          message: `Contact "${parsedCommand.contactName}" added successfully`,
          contact: newContact,
          parsedCommand: parsedCommand
        });
        break;

      case 'remove_contact':
        if (!parsedCommand.contactName) {
          return res.status(400).json({
            status: 'error',
            message: 'Contact name not specified',
            parsedCommand: parsedCommand
          });
        }

        const contactIndex = contacts.findIndex(c => 
          c.name.toLowerCase() === parsedCommand.contactName.toLowerCase()
        );

        if (contactIndex === -1) {
          return res.status(400).json({
            status: 'error',
            message: `Contact "${parsedCommand.contactName}" not found`,
            parsedCommand: parsedCommand
          });
        }

        const removedContact = contacts.splice(contactIndex, 1)[0];

        res.json({
          status: 'success',
          message: `Contact "${parsedCommand.contactName}" removed successfully`,
          removedContact: removedContact,
          parsedCommand: parsedCommand
        });
        break;

      case 'recurring_payment':
        if (!parsedCommand.amount || !parsedCommand.recipient) {
          return res.status(400).json({
            status: 'error',
            message: 'Recurring payment missing amount or recipient',
            parsedCommand: parsedCommand
          });
        }

        const recurringPayment = {
          id: recurringPaymentId++,
          amount: parsedCommand.amount,
          recipient: parsedCommand.recipient,
          currency: parsedCommand.currency || 'WND',
          frequency: 'monthly', // Default frequency
          status: 'active',
          createdAt: new Date().toISOString(),
          nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };

        recurringPayments.push(recurringPayment);

        res.json({
          status: 'success',
          message: `Recurring payment of ${parsedCommand.amount} ${parsedCommand.currency || 'WND'} to ${parsedCommand.recipient} set up successfully`,
          recurringPayment: recurringPayment,
          parsedCommand: parsedCommand
        });
        break;
        
      default:
        res.json({
          status: 'error',
          message: parsedCommand.message || 'Command not recognized',
          parsedCommand: parsedCommand
        });
    }
  } catch (error) {
    console.error('Error processing command:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing command',
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

// Get AI processing statistics
app.get('/api/ai-stats', (req, res) => {
  res.json({
    status: 'success',
    stats: aiProcessor.getProcessingStats(),
    totalCommands: transactions.length + recurringPayments.length
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    aiProcessor: 'active',
    totalContacts: contacts.length,
    totalTransactions: transactions.length,
    totalRecurringPayments: recurringPayments.length
  });
});

app.listen(port, () => {
  console.log(`EchoPay AI-powered backend server listening at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  POST /api/process-command    - Process voice commands with AI');
  console.log('  GET  /api/transactions       - Get transaction history');
  console.log('  GET  /api/contacts           - Get contact list');
  console.log('  GET  /api/recurring-payments - Get recurring payments');
  console.log('  GET  /api/ai-stats           - Get AI processing statistics');
  console.log('  GET  /api/health             - Health check');
  console.log('');
  console.log('AI Command Processor initialized and ready!');
});
