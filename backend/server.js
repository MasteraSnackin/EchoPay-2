const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for transactions
let transactions = [];
let transactionId = 1;

// Enhanced command parsing
function parseVoiceCommand(command) {
  const lowerCommand = command.toLowerCase();
  
  // Payment patterns
  const paymentPatterns = [
    /pay\s+(\d+(?:\.\d+)?)\s+(?:to\s+)?(\w+)/i,
    /send\s+(\d+(?:\.\d+)?)\s+(?:to\s+)?(\w+)/i,
    /transfer\s+(\d+(?:\.\d+)?)\s+(?:to\s+)?(\w+)/i
  ];
  
  for (const pattern of paymentPatterns) {
    const match = command.match(pattern);
    if (match) {
      return {
        type: 'payment',
        amount: parseFloat(match[1]),
        recipient: match[2],
        currency: 'WND', // Default to Westend tokens
        originalCommand: command
      };
    }
  }
  
  // Balance check patterns
  const balancePatterns = [
    /check\s+balance/i,
    /show\s+balance/i,
    /what's\s+my\s+balance/i
  ];
  
  for (const pattern of balancePatterns) {
    if (pattern.test(command)) {
      return {
        type: 'balance_check',
        originalCommand: command
      };
    }
  }
  
  // Transaction history patterns
  const historyPatterns = [
    /show\s+transactions/i,
    /transaction\s+history/i,
    /recent\s+payments/i
  ];
  
  for (const pattern of historyPatterns) {
    if (pattern.test(command)) {
      return {
        type: 'transaction_history',
        originalCommand: command
      };
    }
  }
  
  return {
    type: 'unknown',
    originalCommand: command,
    message: 'Command not recognized. Try saying "Pay 10 to Alice" or "Check balance"'
  };
}

// Mock API endpoints
app.post('/api/process-command', (req, res) => {
  const commandData = req.body;
  console.log('Received command data:', commandData);

  if (!commandData.command) {
    return res.status(400).json({
      status: 'error',
      message: 'No command provided'
    });
  }

  try {
    const parsedCommand = parseVoiceCommand(commandData.command);
    
    switch (parsedCommand.type) {
      case 'payment':
        // Simulate payment processing
        const transaction = {
          id: transactionId++,
          type: 'payment',
          amount: parsedCommand.amount,
          recipient: parsedCommand.recipient,
          currency: parsedCommand.currency,
          status: 'completed',
          timestamp: new Date().toISOString(),
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        };
        
        transactions.push(transaction);
        
        res.json({
          status: 'success',
          message: `Successfully sent ${parsedCommand.amount} ${parsedCommand.currency} to ${parsedCommand.recipient}`,
          transaction: transaction,
          parsedCommand: parsedCommand
        });
        break;
        
      case 'balance_check':
        res.json({
          status: 'success',
          message: 'Balance check requested',
          parsedCommand: parsedCommand
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
        
      default:
        res.json({
          status: 'error',
          message: parsedCommand.message,
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(port, () => {
  console.log(`EchoPay backend server listening at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  POST /api/process-command - Process voice commands');
  console.log('  GET  /api/transactions  - Get transaction history');
  console.log('  GET  /api/health        - Health check');
});
