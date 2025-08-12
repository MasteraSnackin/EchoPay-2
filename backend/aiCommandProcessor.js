const nlp = require('node-nlp');
const natural = require('natural');
const compromise = require('compromise');

class AICommandProcessor {
  constructor() {
    this.nlpManager = new nlp.NlpManager({ languages: ['en'] });
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    
    this.setupNLP();
    this.trainClassifier();
  }

  setupNLP() {
    // Train the NLP manager with various command patterns
    this.nlpManager.addDocument('en', 'pay %amount% to %recipient%', 'payment');
    this.nlpManager.addDocument('en', 'send %amount% to %recipient%', 'payment');
    this.nlpManager.addDocument('en', 'transfer %amount% to %recipient%', 'payment');
    this.nlpManager.addDocument('en', 'give %amount% to %recipient%', 'payment');
    
    this.nlpManager.addDocument('en', 'check balance', 'balance_check');
    this.nlpManager.addDocument('en', 'show balance', 'balance_check');
    this.nlpManager.addDocument('en', 'what is my balance', 'balance_check');
    this.nlpManager.addDocument('en', 'how much do I have', 'balance_check');
    
    this.nlpManager.addDocument('en', 'show transactions', 'transaction_history');
    this.nlpManager.addDocument('en', 'transaction history', 'transaction_history');
    this.nlpManager.addDocument('en', 'recent payments', 'transaction_history');
    this.nlpManager.addDocument('en', 'payment history', 'transaction_history');
    
    this.nlpManager.addDocument('en', 'add contact %name%', 'add_contact');
    this.nlpManager.addDocument('en', 'create contact %name%', 'add_contact');
    this.nlpManager.addDocument('en', 'save contact %name%', 'add_contact');
    
    this.nlpManager.addDocument('en', 'remove contact %name%', 'remove_contact');
    this.nlpManager.addDocument('en', 'delete contact %name%', 'remove_contact');
    
    this.nlpManager.addDocument('en', 'set recurring payment %amount% to %recipient%', 'recurring_payment');
    this.nlpManager.addDocument('en', 'schedule payment %amount% to %recipient%', 'recurring_payment');
    
    // Train the NLP manager
    this.nlpManager.train();
  }

  trainClassifier() {
    // Train the classifier with more examples
    const paymentExamples = [
      'pay 10 to alice',
      'send 5.5 to bob',
      'transfer 100 to charlie',
      'give 25 to dave',
      'pay 50 dollars to eve',
      'send 75 euros to frank'
    ];

    const balanceExamples = [
      'check balance',
      'show balance',
      'what is my balance',
      'how much do I have',
      'display balance',
      'get balance'
    ];

    const transactionExamples = [
      'show transactions',
      'transaction history',
      'recent payments',
      'payment history',
      'view transactions',
      'get transaction list'
    ];

    paymentExamples.forEach(example => this.classifier.addDocument(example, 'payment'));
    balanceExamples.forEach(example => this.classifier.addDocument(example, 'balance_check'));
    transactionExamples.forEach(example => this.classifier.addDocument(example, 'transaction_history'));

    this.classifier.train();
  }

  async processCommand(command) {
    try {
      console.log(`Processing command: "${command}"`);
      
      // Use multiple NLP approaches for better accuracy
      const results = await Promise.all([
        this.processWithNLPManager(command),
        this.processWithClassifier(command),
        this.processWithCompromise(command),
        this.processWithRegex(command)
      ]);

      // Combine and analyze results
      const bestResult = this.combineResults(results, command);
      
      console.log(`AI Processing Result:`, bestResult);
      return bestResult;
      
    } catch (error) {
      console.error('Error in AI command processing:', error);
      // Fallback to regex processing
      return this.processWithRegex(command);
    }
  }

  async processWithNLPManager(command) {
    try {
      const result = await this.nlpManager.process('en', command);
      return {
        method: 'nlp_manager',
        intent: result.intent,
        score: result.score,
        entities: result.entities || []
      };
    } catch (error) {
      return { method: 'nlp_manager', error: error.message };
    }
  }

  processWithClassifier(command) {
    try {
      const classification = this.classifier.classify(command);
      return {
        method: 'classifier',
        intent: classification,
        score: 0.8 // Default confidence for classifier
      };
    } catch (error) {
      return { method: 'classifier', error: error.message };
    }
  }

  processWithCompromise(command) {
    try {
      const doc = compromise(command);
      
      // Extract numbers and amounts
      const numbers = doc.numbers().out('array');
      const currencies = doc.currencies().out('array');
      
      // Extract people names
      const people = doc.people().out('array');
      
      // Extract verbs
      const verbs = doc.verbs().out('array');
      
      return {
        method: 'compromise',
        numbers: numbers,
        currencies: currencies,
        people: people,
        verbs: verbs
      };
    } catch (error) {
      return { method: 'compromise', error: error.message };
    }
  }

  processWithRegex(command) {
    const lowerCommand = command.toLowerCase();
    
    // Enhanced regex patterns
    const patterns = {
      payment: [
        /(?:pay|send|transfer|give)\s+(\d+(?:\.\d+)?)\s+(?:to\s+)?(\w+)/i,
        /(?:pay|send|transfer|give)\s+(\d+(?:\.\d+)?)\s+(?:dollars?|euros?|pounds?)\s+to\s+(\w+)/i
      ],
      balance_check: [
        /(?:check|show|display|get)\s+balance/i,
        /what(?:'s|\s+is)\s+my\s+balance/i,
        /how\s+much\s+do\s+I\s+have/i
      ],
      transaction_history: [
        /(?:show|display|view|get)\s+transactions/i,
        /transaction\s+history/i,
        /(?:recent|payment)\s+history/i
      ],
      add_contact: [
        /(?:add|create|save)\s+contact\s+(\w+)/i
      ],
      remove_contact: [
        /(?:remove|delete)\s+contact\s+(\w+)/i
      ],
      recurring_payment: [
        /(?:set|schedule)\s+(?:recurring\s+)?payment\s+(\d+(?:\.\d+)?)\s+to\s+(\w+)/i
      ]
    };

    for (const [intent, intentPatterns] of Object.entries(patterns)) {
      for (const pattern of intentPatterns) {
        const match = command.match(pattern);
        if (match) {
          return {
            method: 'regex',
            intent: intent,
            score: 0.9,
            entities: match.slice(1),
            pattern: pattern.source
          };
        }
      }
    }

    return {
      method: 'regex',
      intent: 'unknown',
      score: 0.0,
      entities: []
    };
  }

  combineResults(results, originalCommand) {
    // Analyze all results and combine them intelligently
    const intentScores = {};
    const entities = {};
    
    results.forEach(result => {
      if (result.error) return;
      
      if (result.intent && result.score) {
        intentScores[result.intent] = (intentScores[result.intent] || 0) + result.score;
      }
      
      if (result.entities) {
        result.entities.forEach((entity, index) => {
          if (entity) {
            entities[`entity_${index}`] = entity;
          }
        });
      }
    });

    // Find the best intent
    let bestIntent = 'unknown';
    let bestScore = 0;
    
    for (const [intent, score] of Object.entries(intentScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // Extract additional information from compromise
    const compromiseResult = results.find(r => r.method === 'compromise');
    let extractedData = {};
    
    if (compromiseResult && !compromiseResult.error) {
      if (compromiseResult.numbers && compromiseResult.numbers.length > 0) {
        extractedData.amount = parseFloat(compromiseResult.numbers[0]);
      }
      if (compromiseResult.people && compromiseResult.people.length > 0) {
        extractedData.recipient = compromiseResult.people[0];
      }
      if (compromiseResult.currencies && compromiseResult.currencies.length > 0) {
        extractedData.currency = compromiseResult.currencies[0];
      }
    }

    // Build the final result
    const finalResult = {
      type: bestIntent,
      confidence: bestScore,
      originalCommand: originalCommand,
      extractedData: extractedData,
      processingMethods: results.map(r => r.method),
      entities: entities,
      timestamp: new Date().toISOString()
    };

    // Add specific data based on intent
    switch (bestIntent) {
      case 'payment':
        finalResult.amount = extractedData.amount || this.extractAmount(originalCommand);
        finalResult.recipient = extractedData.recipient || this.extractRecipient(originalCommand);
        finalResult.currency = extractedData.currency || 'WND';
        break;
        
      case 'add_contact':
      case 'remove_contact':
        finalResult.contactName = this.extractRecipient(originalCommand);
        break;
        
      case 'recurring_payment':
        finalResult.amount = extractedData.amount || this.extractAmount(originalCommand);
        finalResult.recipient = extractedData.recipient || this.extractRecipient(originalCommand);
        finalResult.currency = extractedData.currency || 'WND';
        break;
    }

    return finalResult;
  }

  extractAmount(command) {
    const amountMatch = command.match(/(\d+(?:\.\d+)?)/);
    return amountMatch ? parseFloat(amountMatch[1]) : null;
  }

  extractRecipient(command) {
    // Look for names after "to" or at the end
    const toMatch = command.match(/(?:to|for)\s+(\w+)/i);
    if (toMatch) return toMatch[1];
    
    // Look for names at the end
    const endMatch = command.match(/(\w+)\s*$/);
    if (endMatch) return endMatch[1];
    
    return null;
  }

  // Method to get processing statistics
  getProcessingStats() {
    try {
      return {
        methods: ['nlp_manager', 'classifier', 'compromise', 'regex'],
        totalTrained: this.classifier ? this.classifier.getClassifications().length : 0,
        nlpTrained: true
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        methods: ['nlp_manager', 'classifier', 'compromise', 'regex'],
        totalTrained: 0,
        nlpTrained: true
      };
    }
  }
}

module.exports = AICommandProcessor;