const compromise = require('compromise');

class CommandConfirmation {
  constructor() {
    this.pendingConfirmations = new Map();
    this.confirmationTimeout = 30000; // 30 seconds
    this.confirmationPatterns = {
      positive: ['yes', 'yeah', 'yep', 'correct', 'right', 'confirm', 'proceed', 'go ahead', 'do it'],
      negative: ['no', 'nope', 'cancel', 'stop', 'abort', 'wrong', 'incorrect', 'don\'t do it'],
      clarification: ['what', 'repeat', 'say again', 'clarify', 'explain']
    };
  }

  // Generate confirmation prompt for critical commands
  generateConfirmationPrompt(command, parsedCommand) {
    const commandId = this.generateCommandId();
    const timestamp = Date.now();
    
    let confirmationText = '';
    let requiresConfirmation = false;
    
    switch (parsedCommand.type) {
      case 'payment':
        if (parsedCommand.amount > 100) { // Confirm payments over 100
          requiresConfirmation = true;
          confirmationText = `Did you say "Pay ${parsedCommand.amount} ${parsedCommand.currency || 'WND'} to ${parsedCommand.recipient}"? Say "Yes" to confirm or "No" to cancel.`;
        }
        break;
        
      case 'recurring_payment':
        requiresConfirmation = true; // Always confirm recurring payments
        confirmationText = `Did you say "Set recurring payment of ${parsedCommand.amount} ${parsedCommand.currency || 'WND'} to ${parsedCommand.recipient}"? This will charge you monthly. Say "Yes" to confirm or "No" to cancel.`;
        break;
        
      case 'remove_contact':
        requiresConfirmation = true; // Always confirm contact deletion
        confirmationText = `Did you say "Remove contact ${parsedCommand.contactName}"? This action cannot be undone. Say "Yes" to confirm or "No" to cancel.`;
        break;
        
      case 'add_contact':
        if (parsedCommand.contactName && parsedCommand.contactName.length > 20) {
          requiresConfirmation = true; // Confirm very long contact names
          confirmationText = `Did you say "Add contact ${parsedCommand.contactName}"? Say "Yes" to confirm or "No" to cancel.`;
        }
        break;
    }
    
    if (requiresConfirmation) {
      const confirmation = {
        id: commandId,
        command: command,
        parsedCommand: parsedCommand,
        confirmationText: confirmationText,
        timestamp: timestamp,
        expiresAt: timestamp + this.confirmationTimeout,
        status: 'pending'
      };
      
      this.pendingConfirmations.set(commandId, confirmation);
      
      // Clean up expired confirmations
      this.cleanupExpiredConfirmations();
      
      return {
        requiresConfirmation: true,
        confirmationId: commandId,
        confirmationText: confirmationText,
        timeout: this.confirmationTimeout
      };
    }
    
    return {
      requiresConfirmation: false
    };
  }

  // Process confirmation response
  processConfirmation(confirmationId, userResponse) {
    const confirmation = this.pendingConfirmations.get(confirmationId);
    
    if (!confirmation) {
      return {
        status: 'error',
        message: 'Confirmation not found or expired'
      };
    }
    
    if (Date.now() > confirmation.expiresAt) {
      this.pendingConfirmations.delete(confirmationId);
      return {
        status: 'error',
        message: 'Confirmation expired'
      };
    }
    
    const response = this.parseConfirmationResponse(userResponse);
    
    if (response.type === 'clarification') {
      return {
        status: 'clarification',
        message: confirmation.confirmationText,
        confirmationId: confirmationId
      };
    }
    
    // Update confirmation status
    confirmation.status = response.type === 'positive' ? 'confirmed' : 'cancelled';
    confirmation.userResponse = userResponse;
    confirmation.responseTime = Date.now();
    
    if (response.type === 'positive') {
      return {
        status: 'confirmed',
        message: 'Command confirmed. Processing...',
        confirmationId: confirmationId,
        originalCommand: confirmation.command,
        parsedCommand: confirmation.parsedCommand
      };
    } else {
      this.pendingConfirmations.delete(confirmationId);
      return {
        status: 'cancelled',
        message: 'Command cancelled by user',
        confirmationId: confirmationId
      };
    }
  }

  // Parse user's confirmation response
  parseConfirmationResponse(userResponse) {
    const lowerResponse = userResponse.toLowerCase().trim();
    const doc = compromise(lowerResponse);
    
    // Check for positive responses
    for (const positive of this.confirmationPatterns.positive) {
      if (lowerResponse.includes(positive)) {
        return { type: 'positive', confidence: 0.9 };
      }
    }
    
    // Check for negative responses
    for (const negative of this.confirmationPatterns.negative) {
      if (lowerResponse.includes(negative)) {
        return { type: 'negative', confidence: 0.9 };
      }
    }
    
    // Check for clarification requests
    for (const clarification of this.confirmationPatterns.clarification) {
      if (lowerResponse.includes(clarification)) {
        return { type: 'clarification', confidence: 0.8 };
      }
    }
    
    // Check for numbers (sometimes users say "one" for yes)
    const numbers = doc.numbers().out('array');
    if (numbers.length > 0) {
      const num = parseFloat(numbers[0]);
      if (num === 1) return { type: 'positive', confidence: 0.7 };
      if (num === 0) return { type: 'negative', confidence: 0.7 };
    }
    
    // Default to clarification if response is unclear
    return { type: 'clarification', confidence: 0.5 };
  }

  // Get pending confirmation
  getPendingConfirmation(confirmationId) {
    const confirmation = this.pendingConfirmations.get(confirmationId);
    
    if (!confirmation) {
      return null;
    }
    
    if (Date.now() > confirmation.expiresAt) {
      this.pendingConfirmations.delete(confirmationId);
      return null;
    }
    
    return {
      id: confirmation.id,
      command: confirmation.command,
      confirmationText: confirmation.confirmationText,
      timestamp: confirmation.timestamp,
      expiresAt: confirmation.expiresAt,
      timeRemaining: Math.max(0, confirmation.expiresAt - Date.now())
    };
  }

  // List all pending confirmations
  getPendingConfirmations() {
    this.cleanupExpiredConfirmations();
    
    const pending = [];
    for (const [id, confirmation] of this.pendingConfirmations) {
      pending.push({
        id: id,
        command: confirmation.command,
        confirmationText: confirmation.confirmationText,
        timestamp: confirmation.timestamp,
        expiresAt: confirmation.expiresAt,
        timeRemaining: Math.max(0, confirmation.expiresAt - Date.now())
      });
    }
    
    return pending;
  }

  // Clean up expired confirmations
  cleanupExpiredConfirmations() {
    const now = Date.now();
    for (const [id, confirmation] of this.pendingConfirmations) {
      if (now > confirmation.expiresAt) {
        this.pendingConfirmations.delete(id);
      }
    }
  }

  // Generate unique command ID
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get confirmation statistics
  getStats() {
    this.cleanupExpiredConfirmations();
    
    let confirmed = 0;
    let cancelled = 0;
    let expired = 0;
    
    for (const confirmation of this.pendingConfirmations.values()) {
      if (confirmation.status === 'confirmed') confirmed++;
      else if (confirmation.status === 'cancelled') cancelled++;
      else if (Date.now() > confirmation.expiresAt) expired++;
    }
    
    return {
      pending: this.pendingConfirmations.size,
      confirmed,
      cancelled,
      expired,
      total: confirmed + cancelled + expired + this.pendingConfirmations.size
    };
  }
}

module.exports = CommandConfirmation;