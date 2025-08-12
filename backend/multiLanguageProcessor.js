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
    // Payment patterns - enhanced
    manager.addDocument('es', 'pagar %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'pagar %amount% euros a %recipient%', 'payment');
    manager.addDocument('es', 'pagar %amount% dólares a %recipient%', 'payment');
    manager.addDocument('es', 'enviar %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'enviar %amount% euros a %recipient%', 'payment');
    manager.addDocument('es', 'transferir %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'transferir %amount% euros a %recipient%', 'payment');
    manager.addDocument('es', 'dar %amount% a %recipient%', 'payment');
    manager.addDocument('es', 'realizar pago de %amount% a %recipient%', 'payment');
    
    // Balance patterns - enhanced
    manager.addDocument('es', 'verificar saldo', 'balance_check');
    manager.addDocument('es', 'verificar mi saldo', 'balance_check');
    manager.addDocument('es', 'mostrar saldo', 'balance_check');
    manager.addDocument('es', 'mostrar mi saldo', 'balance_check');
    manager.addDocument('es', 'cuál es mi saldo', 'balance_check');
    manager.addDocument('es', 'cuánto tengo', 'balance_check');
    manager.addDocument('es', 'ver saldo', 'balance_check');
    manager.addDocument('es', 'consultar saldo', 'balance_check');
    
    // Transaction patterns - enhanced
    manager.addDocument('es', 'mostrar transacciones', 'transaction_history');
    manager.addDocument('es', 'mostrar mis transacciones', 'transaction_history');
    manager.addDocument('es', 'historial de transacciones', 'transaction_history');
    manager.addDocument('es', 'historial de mis transacciones', 'transaction_history');
    manager.addDocument('es', 'pagos recientes', 'transaction_history');
    manager.addDocument('es', 'mis pagos recientes', 'transaction_history');
    manager.addDocument('es', 'ver transacciones', 'transaction_history');
    manager.addDocument('es', 'ver mis transacciones', 'transaction_history');
    
    // Contact patterns - enhanced
    manager.addDocument('es', 'agregar contacto %name%', 'add_contact');
    manager.addDocument('es', 'agregar el contacto %name%', 'add_contact');
    manager.addDocument('es', 'crear contacto %name%', 'add_contact');
    manager.addDocument('es', 'crear el contacto %name%', 'add_contact');
    manager.addDocument('es', 'nuevo contacto %name%', 'add_contact');
    manager.addDocument('es', 'eliminar contacto %name%', 'remove_contact');
    manager.addDocument('es', 'eliminar el contacto %name%', 'remove_contact');
    manager.addDocument('es', 'quitar contacto %name%', 'remove_contact');
    manager.addDocument('es', 'eliminar %name%', 'remove_contact');
    
    // Recurring payment patterns - enhanced
    manager.addDocument('es', 'configurar pago recurrente %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'configurar un pago recurrente %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'programar pago %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'programar un pago %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'pago mensual %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'pago semanal %amount% a %recipient%', 'recurring_payment');
    manager.addDocument('es', 'transferencia automática %amount% a %recipient%', 'recurring_payment');
  }

  addFrenchPatterns(manager) {
    // Payment patterns - enhanced with more variations
    manager.addDocument('fr', 'payer %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'payer %amount% euros à %recipient%', 'payment');
    manager.addDocument('fr', 'payer %amount% dollars à %recipient%', 'payment');
    manager.addDocument('fr', 'envoyer %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'envoyer %amount% euros à %recipient%', 'payment');
    manager.addDocument('fr', 'transférer %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'transférer %amount% euros à %recipient%', 'payment');
    manager.addDocument('fr', 'donner %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'verser %amount% à %recipient%', 'payment');
    manager.addDocument('fr', 'effectuer un paiement de %amount% à %recipient%', 'payment');
    
    // Balance patterns - enhanced
    manager.addDocument('fr', 'vérifier solde', 'balance_check');
    manager.addDocument('fr', 'vérifier mon solde', 'balance_check');
    manager.addDocument('fr', 'afficher solde', 'balance_check');
    manager.addDocument('fr', 'afficher mon solde', 'balance_check');
    manager.addDocument('fr', 'quel est mon solde', 'balance_check');
    manager.addDocument('fr', 'combien j\'ai', 'balance_check');
    manager.addDocument('fr', 'combien ai-je', 'balance_check');
    manager.addDocument('fr', 'montrer solde', 'balance_check');
    manager.addDocument('fr', 'voir solde', 'balance_check');
    
    // Transaction patterns - enhanced
    manager.addDocument('fr', 'afficher transactions', 'transaction_history');
    manager.addDocument('fr', 'afficher mes transactions', 'transaction_history');
    manager.addDocument('fr', 'historique des transactions', 'transaction_history');
    manager.addDocument('fr', 'historique de mes transactions', 'transaction_history');
    manager.addDocument('fr', 'paiements récents', 'transaction_history');
    manager.addDocument('fr', 'mes paiements récents', 'transaction_history');
    manager.addDocument('fr', 'voir transactions', 'transaction_history');
    manager.addDocument('fr', 'voir mes transactions', 'transaction_history');
    
    // Contact patterns - enhanced
    manager.addDocument('fr', 'ajouter contact %name%', 'add_contact');
    manager.addDocument('fr', 'ajouter le contact %name%', 'add_contact');
    manager.addDocument('fr', 'créer contact %name%', 'add_contact');
    manager.addDocument('fr', 'créer le contact %name%', 'add_contact');
    manager.addDocument('fr', 'nouveau contact %name%', 'add_contact');
    manager.addDocument('fr', 'supprimer contact %name%', 'remove_contact');
    manager.addDocument('fr', 'supprimer le contact %name%', 'remove_contact');
    manager.addDocument('fr', 'enlever contact %name%', 'remove_contact');
    manager.addDocument('fr', 'supprimer %name%', 'remove_contact');
    
    // Recurring payment patterns - enhanced
    manager.addDocument('fr', 'configurer paiement récurrent %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'configurer un paiement récurrent %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'programmer paiement %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'programmer un paiement %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'paiement mensuel %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'paiement hebdomadaire %amount% à %recipient%', 'recurring_payment');
    manager.addDocument('fr', 'virement automatique %amount% à %recipient%', 'recurring_payment');
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
      // Payment examples
      'pagar 10 a alicia', 'pagar 25 euros a alicia', 'pagar 50 dólares a alicia',
      'enviar 5.5 a bob', 'enviar 15 euros a bob', 'enviar 30 dólares a bob',
      'transferir 100 a carlos', 'transferir 200 euros a carlos',
      'dar 75 a david', 'realizar pago de 120 a emma',
      
      // Balance examples
      'verificar saldo', 'verificar mi saldo', 'mostrar saldo', 'mostrar mi saldo',
      'cuál es mi saldo', 'cuánto tengo', 'ver saldo', 'consultar saldo',
      
      // Transaction examples
      'mostrar transacciones', 'mostrar mis transacciones', 'historial de transacciones',
      'historial de mis transacciones', 'pagos recientes', 'mis pagos recientes',
      'ver transacciones', 'ver mis transacciones',
      
      // Contact examples
      'agregar contacto sarah', 'agregar el contacto sarah', 'crear contacto sarah',
      'crear el contacto sarah', 'nuevo contacto sarah', 'eliminar contacto juan',
      'eliminar el contacto juan', 'quitar contacto juan', 'eliminar juan',
      
      // Recurring payment examples
      'configurar pago recurrente 100 a alicia', 'configurar un pago recurrente 100 a alicia',
      'programar pago 75 a bob', 'programar un pago 75 a bob',
      'pago mensual 200 a carlos', 'pago semanal 50 a david',
      'transferencia automática 150 a emma'
    ];
    
    examples.forEach(example => {
      const intent = this.getIntentFromExample(example);
      classifier.addDocument(example, intent);
    });
  }

  addFrenchExamples(classifier) {
    const examples = [
      // Payment examples
      'payer 10 à alice', 'payer 25 euros à alice', 'payer 50 dollars à alice',
      'envoyer 5.5 à bob', 'envoyer 15 euros à bob', 'envoyer 30 dollars à bob',
      'transférer 100 à charles', 'transférer 200 euros à charles',
      'donner 75 à david', 'verser 45 à emma', 'effectuer un paiement de 120 à françois',
      
      // Balance examples
      'vérifier solde', 'vérifier mon solde', 'afficher solde', 'afficher mon solde',
      'quel est mon solde', 'combien j\'ai', 'combien ai-je', 'montrer solde', 'voir solde',
      
      // Transaction examples
      'afficher transactions', 'afficher mes transactions', 'historique des transactions',
      'historique de mes transactions', 'paiements récents', 'mes paiements récents',
      'voir transactions', 'voir mes transactions',
      
      // Contact examples
      'ajouter contact sarah', 'ajouter le contact sarah', 'créer contact sarah',
      'créer le contact sarah', 'nouveau contact sarah', 'supprimer contact jean',
      'supprimer le contact jean', 'enlever contact jean', 'supprimer jean',
      
      // Recurring payment examples
      'configurer paiement récurrent 100 à alice', 'configurer un paiement récurrent 100 à alice',
      'programmer paiement 75 à bob', 'programmer un paiement 75 à bob',
      'paiement mensuel 200 à charles', 'paiement hebdomadaire 50 à david',
      'virement automatique 150 à emma'
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
    
    // Spanish indicators - enhanced
    const spanishWords = [
      'pagar', 'enviar', 'transferir', 'verificar', 'mostrar', 'agregar', 'eliminar', 
      'configurar', 'programar', 'dar', 'realizar', 'pago', 'transferencia', 'saldo',
      'transacciones', 'historial', 'pagos', 'contacto', 'recurrente', 'mensual',
      'semanal', 'automática', 'cuál', 'cuánto', 'mi', 'mis', 'el', 'un', 'de', 'a'
    ];
    const spanishCount = spanishWords.filter(word => lowerCommand.includes(word)).length;
    
    // French indicators - enhanced with more words and accent handling
    const frenchWords = [
      'payer', 'envoyer', 'transférer', 'vérifier', 'afficher', 'ajouter', 'supprimer', 
      'configurer', 'programmer', 'donner', 'verser', 'effectuer', 'paiement', 'virement',
      'solde', 'transactions', 'historique', 'paiements', 'contact', 'récurrent', 'mensuel',
      'hebdomadaire', 'automatique', 'combien', 'quel', 'mon', 'mes', 'le', 'un', 'de', 'à'
    ];
    const frenchCount = frenchWords.filter(word => lowerCommand.includes(word)).length;
    
    // English indicators
    const englishWords = ['pay', 'send', 'transfer', 'check', 'show', 'add', 'remove', 'set', 'schedule'];
    const englishCount = englishWords.filter(word => lowerCommand.includes(word)).length;
    
    // Special French accent patterns
    const frenchAccentPatterns = ['à', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'ç'];
    const frenchAccentCount = frenchAccentPatterns.filter(accent => lowerCommand.includes(accent)).length;
    
    // Boost French score if accents are present
    const adjustedFrenchCount = frenchCount + (frenchAccentCount * 0.5);
    

    
    // Return language with highest count, default to English
    if (spanishCount > adjustedFrenchCount && spanishCount > englishCount) return 'es';
    if (adjustedFrenchCount > spanishCount && adjustedFrenchCount > englishCount) return 'fr';
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
      processingMethods: ['fallback_english'],
      extractedData: {},
      entities: []
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