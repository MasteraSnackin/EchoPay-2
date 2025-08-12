const nlp = require('node-nlp');
const natural = require('natural');
const compromise = require('compromise');

class MultiLanguageProcessor {
  constructor() {
    this.supportedLanguages = ['en', 'es', 'fr'];
    this.nlpManagers = {};
    this.classifiers = {};
    this.languageDetectors = {};
    
    this.setupLanguages();
    this.trainClassifiers();
  }

  setupLanguages() {
    this.supportedLanguages.forEach(lang => {
      // Initialize NLP manager for each language
      this.nlpManagers[lang] = new nlp.NlpManager({ languages: [lang] });
      
      // Initialize classifier for each language
      this.classifiers[lang] = new natural.BayesClassifier();
      
      // Train NLP manager with language-specific patterns
      this.trainNLPManager(lang);
    });
  }

  trainNLPManager(language) {
    const manager = this.nlpManagers[language];
    
    switch (language) {
      case 'en': // English
        this.addEnglishPatterns(manager);
        break;
      case 'es': // Spanish
        this.addSpanishPatterns(manager);
        break;
      case 'fr': // French
        this.addFrenchPatterns(manager);
        break;
    }
    
    // Train the manager
    manager.train();
  }

  addEnglishPatterns(manager) {
    // Payment patterns
    manager.addDocument('en', 'pay %amount% to %recipient%', 'payment');
    manager.addDocument('en', 'send %amount% to %recipient%', 'payment');
    manager.addDocument('en', 'transfer %amount% to %recipient%', 'payment');
    manager.addDocument('en', 'give %amount% to %recipient%', 'payment');
    
    // Balance patterns
    manager.addDocument('en', 'check balance', 'balance_check');
    manager.addDocument('en', 'show balance', 'balance_check');
    manager.addDocument('en', 'what is my balance', 'balance_check');
    manager.addDocument('en', 'how much do I have', 'balance_check');
    
    // Transaction patterns
    manager.addDocument('en', 'show transactions', 'transaction_history');
    manager.addDocument('en', 'transaction history', 'transaction_history');
    manager.addDocument('en', 'recent payments', 'transaction_history');
    
    // Contact patterns
    manager.addDocument('en', 'add contact %name%', 'add_contact');
    manager.addDocument('en', 'create contact %name%', 'add_contact');
    manager.addDocument('en', 'remove contact %name%', 'remove_contact');
    
    // Recurring payment patterns
    manager.addDocument('en', 'set recurring payment %amount% to %recipient%', 'recurring_payment');
    manager.addDocument('en', 'schedule payment %amount% to %recipient%', 'recurring_payment');
  }

  addSpanishPatterns(manager) {
    // Payment patterns
    manager.addDocument('es', 'pagar %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'enviar %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'transferir %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'dar %amount% a %recipient%', 'payment');
    
    // Balance patterns
    manager.addDocument('es', 'verificar saldo', 'balance_check');
    manager.addDocument('es', 'mostrar saldo', 'balance_check');
    manager.addDocument('es', 'cuál es mi saldo', 'balance_check');
    manager.addDocument('es', 'cuánto tengo', 'balance_check');
    
    // Transaction patterns
    manager.addDocument('es', 'mostrar transacciones', 'transaction_history');
    manager.addDocument('es', 'historial de transacciones', 'transaction_history');
    manager.addDocument('es', 'pagos recientes', 'transaction_history');
    
    // Contact patterns
    manager.addDocument('es', 'agregar contacto %name%', 'add_contact');
    manager.addDocument('es', 'crear contacto %name%', 'add_contact');
    manager.addDocument('es', 'eliminar contacto %name%', 'remove_contact');
    
    // Recurring payment patterns
    manager.addDocument('es', 'configurar pago recurrente %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'programar pago %amount% a %recipient%', 'recurring_payment');
  }

  addFrenchPatterns(manager) {
    // Payment patterns
    manager.addDocument('fr', 'payer %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'envoyer %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'transférer %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'donner %amount% à %recipient%', 'payment');
    
    // Balance patterns
    manager.addDocument('fr', 'vérifier solde', 'balance_check');
    manager.addDocument('fr', 'afficher solde', 'balance_check');
    manager.addDocument('fr', 'quel est mon solde', 'balance_check');
    manager.addDocument('fr', 'combien j\'ai', 'balance_check');
    
    // Transaction patterns
    manager.addDocument('fr', 'afficher transactions', 'transaction_history');
    manager.addDocument('fr', 'historique des transactions', 'transaction_history');
    manager.addDocument('fr', 'paiements récents', 'transaction_history');
    
    // Contact patterns
    manager.addDocument('fr', 'ajouter contact %name%', 'add_contact');
    manager.addDocument('fr', 'créer contact %name%', 'add_contact');
    manager.addDocument('fr', 'supprimer contact %name%', 'remove_contact');
    
    // Recurring payment patterns
    manager.addDocument('fr', 'configurer paiement récurrent %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'programmer paiement %amount% à %recipient%', 'recurring_payment');
  }

  trainClassifiers() {
    this.supportedLanguages.forEach(lang => {
      const classifier = this.classifiers[lang];
      
      switch (lang) {
        case 'en':
          this.addEnglishExamples(classifier);
          break;
        case 'es':
          this.addSpanishExamples(classifier);
          break;
        case 'fr':
          this.addFrenchExamples(classifier);
          break;
      }
      
      classifier.train();
    });
  }

  addEnglishExamples(classifier) {
    const examples = [
      'pay 10 to alice', 'send 5.5 to bob', 'transfer 100 to charlie',
      'check balance', 'show balance', 'what is my balance',
      'show transactions', 'transaction history', 'recent payments',
      'add contact sarah', 'remove contact john'
    ];
    
    examples.forEach(example => {
      const intent = this.getIntentFromExample(example);
      classifier.addDocument(example, intent);
    });
  }

  addSpanishExamples(classifier) {
    const examples = [
      'pagar 10 a alicia', 'enviar 5.5 a bob', 'transferir 100 a carlos',
      'verificar saldo', 'mostrar saldo', 'cuál es mi saldo',
      'mostrar transacciones', 'historial de transacciones', 'pagos recientes',
      'agregar contacto sarah', 'eliminar contacto juan'
    ];
    
    examples.forEach(example => {
      const intent = this.getIntentFromExample(example);
      classifier.addDocument(example, intent);
    });
  }

  addFrenchExamples(classifier) {
    const examples = [
      'payer 10 à alice', 'envoyer 5.5 à bob', 'transférer 100 à charles',
      'vérifier solde', 'afficher solde', 'quel est mon solde',
      'afficher transactions', 'historique des transactions', 'paiements récents',
      'ajouter contact sarah', 'supprimer contact jean'
    ];
    
    examples.forEach(example => {
      const intent = this.getIntentFromExample(example);
      classifier.addDocument(example, intent);
    });
  }

  getIntentFromExample(example) {
    if (example.includes('pay') || example.includes('enviar') || example.includes('envoyer') || example.includes('payer') || example.includes('transferir') || example.includes('transférer')) {
      return 'payment';
    } else if (example.includes('balance') || example.includes('saldo') || example.includes('solde')) {
      return 'balance_check';
    } else if (example.includes('transaction') || example.includes('transaccion') || example.includes('paiement')) {
      return 'transaction_history';
    } else if (example.includes('add') || example.includes('agregar') || example.includes('ajouter')) {
      return 'add_contact';
    } else if (example.includes('remove') || example.includes('eliminar') || example.includes('supprimer')) {
      return 'remove_contact';
    }
    return 'unknown';
  }

  // Detect language from command
  detectLanguage(command) {
    const lowerCommand = command.toLowerCase();
    
    // Spanish indicators
    const spanishWords = ['pagar', 'enviar', 'transferir', 'verificar', 'mostrar', 'agregar', 'eliminar', 'configurar', 'programar'];
    const spanishCount = spanishWords.filter(word => lowerCommand.includes(word)).length;
    
    // French indicators
    const frenchWords = ['payer', 'envoyer', 'transférer', 'vérifier', 'afficher', 'ajouter', 'supprimer', 'configurer', 'programmer'];
    const frenchCount = frenchWords.filter(word => lowerCommand.includes(word)).length;
    
    // English indicators
    const englishWords = ['pay', 'send', 'transfer', 'check', 'show', 'add', 'remove', 'set', 'schedule'];
    const englishCount = englishWords.filter(word => lowerCommand.includes(word)).length;
    
    // Return language with highest count, default to English
    if (spanishCount > frenchCount && spanishCount > englishCount) return 'es';
    if (frenchCount > spanishCount && frenchCount > englishCount) return 'fr';
    return 'en';
  }

  // Process command in detected language
  async processCommand(command) {
    const detectedLanguage = this.detectLanguage(command);
    console.log(`Detected language: ${detectedLanguage} for command: "${command}"`);
    
    try {
      // Use language-specific NLP manager
      const nlpResult = await this.nlpManagers[detectedLanguage].process(detectedLanguage, command);
      
      // Use language-specific classifier
      const classification = this.classifiers[detectedLanguage].classify(command);
      
      // Extract entities using compromise (works well with multiple languages)
      const compromiseResult = this.processWithCompromise(command);
      
      // Combine results
      const combinedResult = this.combineResults(nlpResult, classification, compromiseResult, command, detectedLanguage);
      
      return combinedResult;
      
    } catch (error) {
      console.error(`Error processing command in ${detectedLanguage}:`, error);
      // Fallback to English processing
      return this.fallbackToEnglish(command);
    }
  }

  processWithCompromise(command) {
    try {
      const doc = compromise(command);
      
      return {
        numbers: doc.numbers().out('array'),
        currencies: doc.currencies().out('array'),
        people: doc.people().out('array'),
        verbs: doc.verbs().out('array')
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  combineResults(nlpResult, classification, compromiseResult, originalCommand, language) {
    // Build the final result
    const finalResult = {
      type: nlpResult.intent || classification || 'unknown',
      confidence: nlpResult.score || 0.8,
      originalCommand: originalCommand,
      detectedLanguage: language,
      extractedData: {},
      processingMethods: ['multi_language_nlp', 'multi_language_classifier', 'compromise'],
      entities: nlpResult.entities || [],
      timestamp: new Date().toISOString()
    };

    // Extract additional data from compromise
    if (compromiseResult && !compromiseResult.error) {
      if (compromiseResult.numbers && compromiseResult.numbers.length > 0) {
        finalResult.extractedData.amount = parseFloat(compromiseResult.numbers[0]);
      }
      if (compromiseResult.people && compromiseResult.people.length > 0) {
        finalResult.extractedData.recipient = compromiseResult.people[0];
      }
      if (compromiseResult.currencies && compromiseResult.currencies.length > 0) {
        finalResult.extractedData.currency = compromiseResult.currencies[0];
      }
    }

    // Add specific data based on intent
    switch (finalResult.type) {
      case 'payment':
        finalResult.amount = finalResult.extractedData.amount || this.extractAmount(originalCommand, language);
        finalResult.recipient = finalResult.extractedData.recipient || this.extractRecipient(originalCommand, language);
        finalResult.currency = finalResult.extractedData.currency || this.getDefaultCurrency(language);
        break;
        
      case 'add_contact':
      case 'remove_contact':
        finalResult.contactName = finalResult.extractedData.recipient || this.extractRecipient(originalCommand, language);
        break;
        
      case 'recurring_payment':
        finalResult.amount = finalResult.extractedData.amount || this.extractAmount(originalCommand, language);
        finalResult.recipient = finalResult.extractedData.recipient || this.extractRecipient(originalCommand, language);
        finalResult.currency = finalResult.extractedData.currency || this.getDefaultCurrency(language);
        break;
    }

    return finalResult;
  }

  extractAmount(command, language) {
    const amountMatch = command.match(/(\d+(?:\.\d+)?)/);
    return amountMatch ? parseFloat(amountMatch[1]) : null;
  }

  extractRecipient(command, language) {
    // Language-specific recipient extraction patterns
    const patterns = {
      en: /(?:to|for)\s+(\w+)/i,
      es: /(?:a|para)\s+(\w+)/i,
      fr: /(?:à|pour)\s+(\w+)/i
    };
    
    const pattern = patterns[language] || patterns.en;
    const match = command.match(pattern);
    
    if (match) return match[1];
    
    // Look for names at the end
    const endMatch = command.match(/(\w+)\s*$/);
    if (endMatch) return endMatch[1];
    
    return null;
  }

  getDefaultCurrency(language) {
    const currencies = {
      en: 'WND',
      es: 'WND',
      fr: 'WND'
    };
    return currencies[language] || 'WND';
  }

  fallbackToEnglish(command) {
    // Basic English fallback processing
    return {
      type: 'unknown',
      originalCommand: command,
      detectedLanguage: 'en',
      confidence: 0.3,
      message: 'Command not recognized. Please try again in English, Spanish, or French.',
      processingMethods: ['fallback_english']
    };
  }

  // Get supported languages
  getSupportedLanguages() {
    return this.supportedLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang),
      examples: this.getLanguageExamples(lang)
    }));
  }

  getLanguageName(code) {
    const names = {
      en: 'English',
      es: 'Español',
      fr: 'Français'
    };
    return names[code] || code;
  }

  getLanguageExamples(code) {
    const examples = {
      en: ['Pay 10 to Alice', 'Check balance', 'Add contact John'],
      es: ['Pagar 10 a Alicia', 'Verificar saldo', 'Agregar contacto Juan'],
      fr: ['Payer 10 à Alice', 'Vérifier solde', 'Ajouter contact Jean']
    };
    return examples[code] || [];
  }

  // Get processing statistics
  getProcessingStats() {
    return {
      supportedLanguages: this.supportedLanguages.length,
      languages: this.supportedLanguages,
      nlpManagers: Object.keys(this.nlpManagers).length,
      classifiers: Object.keys(this.classifiers).length
    };
  }
}

module.exports = MultiLanguageProcessor;