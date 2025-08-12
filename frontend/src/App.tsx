import { useState, useEffect, useRef } from 'react';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { AccountInfo } from '@polkadot/types/interfaces';
import { formatBalance } from '@polkadot/util';
import { u8aToHex } from '@polkadot/util';
import './App.css';
import ContactList, { mockContacts, Contact } from './ContactList';
import config from './config';

// Add helper to read test mode from URL
function isTestMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('testMode') === '1';
  } catch {
    return false;
  }
}

// Check if the browser supports the Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  recipient: string;
  recipientAddress?: string;
  currency: string;
  status: string;
  confidence?: number;
  timestamp: string;
  txHash: string;
  processingMethods?: string[];
}

interface ParsedCommand {
  type: string;
  amount?: number;
  recipient?: string;
  currency?: string;
  originalCommand: string;
  message?: string;
  confidence?: number;
  processingMethods?: string[];
  extractedData?: any;
  entities?: any;
}

interface ConfirmationState {
  isRequired: boolean;
  confirmationId?: string;
  confirmationText?: string;
  timeoutMs?: number;
  deadlineTs?: number;
}

interface Contact {
  id: number;
  name: string;
  address: string;
  balance: number;
}

interface RecurringPayment {
  id: number;
  amount: number;
  recipient: string;
  currency: string;
  frequency: string;
  status: string;
  createdAt: string;
  nextPayment: string;
}

interface AIStats {
  methods: string[];
  totalTrained: number;
  nlpTrained: boolean;
}

// Enhanced voice command processing
interface VoiceCommand {
  text: string;
  audioData?: string;
  confidence?: number;
}

function App() {
  // Wallet State
  const [extensionsLoaded, setExtensionsLoaded] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>('');
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string>('');
  const [isWalletVerified, setIsWalletVerified] = useState<boolean>(false);

  // Voice Command State
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [recognizedContact, setRecognizedContact] = useState<Contact | null>(null);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ isRequired: false });
  const [countdownSec, setCountdownSec] = useState<number>(0);
  const [isProcessingCommand, setIsProcessingCommand] = useState<boolean>(false);
  const recognitionRef = useRef(recognition);

  // Enhanced voice command processing
  const [voiceCommands, setVoiceCommands] = useState<VoiceCommand[]>([]);
  const [currentAudioData, setCurrentAudioData] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Enable E2E test mode: mock a selected account to bypass wallet dependency
  useEffect(() => {
    if (isTestMode() && !selectedAccount) {
      const mockAccount: any = {
        address: '5E2ETestAccountMock111111111111111111111111111',
        meta: { name: 'E2E Test Account' },
        type: 'sr25519'
      };
      setSelectedAccount(mockAccount);
      setExtensionsLoaded(true);
    }
  }, []);

  // Countdown for confirmation
  useEffect(() => {
    if (!confirmation.isRequired || !confirmation.deadlineTs) {
      setCountdownSec(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((confirmation.deadlineTs! - Date.now()) / 1000));
      setCountdownSec(remaining);
      if (remaining === 0) {
        setConfirmation({ isRequired: false });
        setResponseMessage('Confirmation expired. Please try the command again.');
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [confirmation]);

  // Effect for Speech Recognition Setup
  useEffect(() => {
    if (!recognitionRef.current) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    const currentRecognition = recognitionRef.current;

    currentRecognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      console.log('Speech recognized:', speechResult);
      setRecognizedText(speechResult);
      setIsListening(false);
      setResponseMessage('Command recognized. Press "Process Command" to send.');
    };

    currentRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setResponseMessage(`Speech Error: ${event.error}`);
      setIsListening(false);
    };

    currentRecognition.onend = () => {
      setIsListening(false);
    };

    return () => {
        currentRecognition.onresult = null;
        currentRecognition.onerror = null;
        currentRecognition.onend = null;
        if (isListening) {
            currentRecognition.stop();
        }
    };
  }, [isListening]);

  // Recognize Contact from Speech
  useEffect(() => {
    if (!recognizedText) {
      setRecognizedContact(null);
      return;
    }

    const lowerCaseText = recognizedText.toLowerCase().trim();
    const foundContact = contacts.find((contact: Contact) => contact.name.toLowerCase() === lowerCaseText);
    setRecognizedContact(foundContact || null);
  }, [recognizedText, contacts]);

  // Fetch Account Balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!selectedAccount) {
        setAccountBalance('');
        return;
      }

      setIsBalanceLoading(true);
      setAccountBalance('');
      setWalletError('');

      const wsProvider = new WsProvider(config.polkadot.rpcEndpoint);
      let api: ApiPromise | null = null;

      try {
        api = await ApiPromise.create({ provider: wsProvider });
        await api.isReady;

        const chainDecimals = api.registry.chainDecimals[0];
        const chainTokens = api.registry.chainTokens[0];
        formatBalance.setDefaults({ decimals: chainDecimals, unit: chainTokens });

        const accountInfo = await api.query.system.account(selectedAccount.address) as AccountInfo;
        const freeBalance = accountInfo.data.free;

        setAccountBalance(formatBalance(freeBalance, { withUnit: true, withSi: false }));

      } catch (error) {
        console.error("Error fetching balance:", error);
        setWalletError(`Error fetching balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAccountBalance('');
      } finally {
        setIsBalanceLoading(false);
        if (api) {
          await api.disconnect();
        }
      }
    };

    fetchBalance();
  }, [selectedAccount]);

  // Enhanced voice command processing with Worker integration
  const processVoiceCommand = async (command: VoiceCommand) => {
    if (!selectedAccount || !isWalletVerified) {
      setResponseMessage('Please connect and verify your wallet first');
      return;
    }

    setIsProcessingCommand(true);
    setResponseMessage('Processing voice command...');

    try {
      // Send command to Worker for processing
      const response = await fetch(`${config.worker.url}${config.worker.endpoints.voice}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: command.text,
          audio_data: command.audioData,
          user_id: selectedAccount.address,
          wallet_address: selectedAccount.address
        })
      });

      if (!response.ok) {
        throw new Error(`Worker error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        setParsedCommand({
          type: result.transaction_type || 'transfer',
          amount: result.amount,
          recipient: result.recipient,
          currency: result.currency || 'DOT',
          originalCommand: command.text,
          confidence: result.confidence,
          processingMethods: result.methods || ['voice', 'nlp']
        });

        // Create transaction in backend
        await createTransaction(result);
        
        setResponseMessage('Command processed successfully! Transaction created.');
      } else {
        setResponseMessage(`Command processing failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Voice command processing error:', error);
      setResponseMessage(`Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  // Create transaction in backend
  const createTransaction = async (transactionData: any) => {
    try {
      const response = await fetch(`${config.backend.url}${config.backend.endpoints.wallet.transaction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_address: selectedAccount?.address,
          to_address: transactionData.recipient_address || transactionData.recipient,
          amount: transactionData.amount,
          currency: transactionData.currency || 'DOT',
          type: transactionData.transaction_type || 'transfer',
          metadata: {
            voice_command: transactionData.original_command,
            confidence: transactionData.confidence,
            methods: transactionData.methods
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Transaction created:', result);
      
      // Add to local transactions list
      const newTransaction: Transaction = {
        id: Date.now(),
        type: transactionData.transaction_type || 'transfer',
        amount: transactionData.amount,
        recipient: transactionData.recipient,
        currency: transactionData.currency || 'DOT',
        status: 'pending',
        timestamp: new Date().toISOString(),
        txHash: result.tx_hash || 'pending',
        confidence: transactionData.confidence,
        processingMethods: transactionData.methods
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Return the transaction for further processing
      return { ...newTransaction, backendId: result.id };
    } catch (error) {
      console.error('Transaction creation error:', error);
      throw error;
    }
  };

  // Sign and broadcast transaction
  const signAndBroadcastTransaction = async (transaction: Transaction, recipientAddress: string) => {
    if (!selectedAccount) {
      throw new Error('No account selected');
    }

    try {
      setResponseMessage('Signing transaction...');
      
      // Get the signer
      const signer = selectedAccount.meta.source;
      if (!signer) {
        throw new Error('No signer available for this account');
      }

      const injector = await web3FromSource(signer);
      if (!injector?.signer?.signRaw) {
        throw new Error('Signer does not support raw signing');
      }

      // Create the transfer extrinsic
      const wsProvider = new WsProvider(config.polkadot.rpcEndpoint);
      const api = await ApiPromise.create({ provider: wsProvider });
      await api.isReady;

      // Build transfer extrinsic
      const transfer = api.tx.balances.transfer(recipientAddress, transaction.amount * 1e10); // Convert to planck units
      
      // Sign the extrinsic
      const { signature } = await transfer.signAsync(selectedAccount.address, { signer: injector.signer });
      
      // Get the signed extrinsic as hex
      const signedTx = transfer.toHex();
      
      // Broadcast to backend
      setResponseMessage('Broadcasting transaction...');
      const broadcastResponse = await fetch(`${config.backend.url}${config.backend.endpoints.wallet.broadcast}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_tx: signedTx,
          network: config.polkadot.chainName
        })
      });

      if (!broadcastResponse.ok) {
        throw new Error(`Broadcast failed: ${broadcastResponse.statusText}`);
      }

      const broadcastResult = await broadcastResponse.json();
      
      // Update transaction with hash
      setTransactions(prev => prev.map(tx => 
        tx.id === transaction.id 
          ? { ...tx, txHash: broadcastResult.tx_hash, status: 'broadcasted' }
          : tx
      ));

      setResponseMessage(`Transaction broadcasted successfully! Hash: ${broadcastResult.tx_hash}`);
      
      // Cleanup
      await api.disconnect();
      
    } catch (error) {
      console.error('Transaction signing/broadcast error:', error);
      setResponseMessage(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setCurrentAudioData(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setResponseMessage('Recording audio... Click stop when done.');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setResponseMessage('Error starting recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setResponseMessage('Audio recorded! You can now process the command.');
    }
  };

  // Wallet verification with backend using real signature
  const verifyWallet = async () => {
    if (!selectedAccount) return;

    try {
      setResponseMessage('Verifying wallet...');
      
      // Create a message for signing
      const message = `Verify wallet for EchoPay: ${Date.now()}`;
      const messageHex = u8aToHex(new TextEncoder().encode(message));
      
      // Get the signer from the account
      const signer = selectedAccount.meta.source;
      if (!signer) {
        throw new Error('No signer available for this account');
      }

      // Get the actual signer instance
      const injector = await web3FromSource(signer);
      if (!injector?.signer?.signRaw) {
        throw new Error('Signer does not support raw signing');
      }

      // Sign the message
      const { signature } = await injector.signer.signRaw({
        address: selectedAccount.address,
        data: messageHex,
        type: 'bytes'
      });

      // Verify signature with backend
      const response = await fetch(`${config.backend.url}${config.backend.endpoints.wallet.verify}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: selectedAccount.address,
          signature: signature,
          message_hex: messageHex
        })
      });

      if (response.ok) {
        setIsWalletVerified(true);
        setResponseMessage('Wallet verified successfully!');
      } else {
        throw new Error('Wallet verification failed');
      }
    } catch (error) {
      console.error('Wallet verification error:', error);
      setResponseMessage(`Wallet verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch transactions
        const txResponse = await fetch('/api/transactions');
        if (txResponse.ok) {
          const txData = await txResponse.json();
          setTransactions(txData.transactions || []);
        }

        // Fetch contacts
        const contactResponse = await fetch('/api/contacts');
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          setContacts(contactData.contacts || []);
        }

        // Fetch recurring payments
        const recurringResponse = await fetch('/api/recurring-payments');
        if (recurringResponse.ok) {
          const recurringData = await recurringResponse.json();
          setRecurringPayments(recurringData.recurringPayments || []);
        }

        // Fetch AI stats
        const aiResponse = await fetch('/api/ai-stats');
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          setAiStats(aiData.stats || null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Wallet Connection Logic
  const handleConnectWallet = async () => {
    setWalletError('');
    setExtensionsLoaded(false);
    setAccounts([]);
    setSelectedAccount(null);
    console.log("Attempting to enable extensions...");

    try {
      const injectedExtensions = await web3Enable('EchoPay App');
      console.log("web3Enable executed. Result:", injectedExtensions);

      if (!injectedExtensions || injectedExtensions.length === 0) {
        console.error("No extensions found or enabled.");
        setWalletError('No Polkadot browser extension found, or permission denied. Please install SubWallet (or compatible) and ensure it\'s enabled and permissions are granted.');
        return;
      }

      console.log("Enabled extensions:", injectedExtensions.map(ext => ext.name));

      const subwalletExtension = injectedExtensions.find(ext => ext.name === 'subwallet-js');
      if (!subwalletExtension) {
          console.warn("SubWallet extension not found among enabled extensions. Other extensions might be available.");
      } else {
          console.log("SubWallet extension detected.");
      }

      setExtensionsLoaded(true);

      console.log("Attempting to fetch accounts...");
      const allAccounts = await web3Accounts();
      console.log("web3Accounts executed. Found accounts:", allAccounts.length);

      if (allAccounts.length === 0) {
          console.error("No accounts found in enabled extensions.");
          setWalletError('No accounts found in the extension. Please ensure you have created or imported an account and granted access.');
          setAccounts([]);
          return;
      }
      setAccounts(allAccounts);
      if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0]);
      }

    } catch (error) {
      console.error("Error during wallet connection process:", error);
      setWalletError(`Error connecting wallet: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}. Check console for details.`);
      setExtensionsLoaded(false);
      setAccounts([]);
      setSelectedAccount(null);
    }
  };

  const handleDisconnectWallet = () => {
    setSelectedAccount(null);
    setAccounts([]);
    setExtensionsLoaded(false);
    setAccountBalance('');
    setWalletError('');
  };

  // Enhanced Backend Communication
  const sendCommandToBackend = async (commandText: string) => {
    if (!commandText) return;
    setResponseMessage('Processing command with AI...');
    setConfirmation({ isRequired: false });
    try {
      const commandData = {
        command: commandText,
      };

      const response = await fetch('/api/process-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Handle confirmation-required flow
      if (result.status === 'confirmation_required') {
        setParsedCommand(result.parsedCommand || null);
        setConfirmation({
          isRequired: true,
          confirmationId: result.confirmationId,
          confirmationText: result.confirmationText,
          timeoutMs: result.timeout,
          deadlineTs: Date.now() + (result.timeout || 30000)
        });
        setResponseMessage('Confirmation required. Please confirm below.');
        return;
      }

      setResponseMessage(result.message || 'Command processed.');
      setParsedCommand(result.parsedCommand || null);
      
      // Update transactions if it's a payment
      if (result.transaction) {
        setTransactions(prev => [result.transaction, ...prev]);
      }

      // Update contacts if contact was added/removed
      if (result.contact || result.removedContact) {
        const contactResponse = await fetch('/api/contacts');
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          setContacts(contactData.contacts || []);
        }
      }

      // Update recurring payments if one was added
      if (result.recurringPayment) {
        setRecurringPayments(prev => [result.recurringPayment, ...prev]);
      }

    } catch (error) {
      console.error("Error sending command:", error);
      setResponseMessage(`Error sending command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const confirmCommand = async (accept: boolean) => {
    if (!confirmation.isRequired || !confirmation.confirmationId) return;
    setResponseMessage(accept ? 'Confirming...' : 'Cancelling...');
    try {
      const resp = await fetch('/api/confirm-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationId: confirmation.confirmationId,
          userResponse: accept ? 'yes' : 'no'
        })
      });
      const data = await resp.json();

      // Clear confirmation state regardless
      setConfirmation({ isRequired: false });

      if (data.status === 'success' && data.executionResult) {
        const exec = data.executionResult;
        setResponseMessage(exec.message || 'Command confirmed and executed.');
        setParsedCommand(exec.parsedCommand || null);
        if (exec.transaction) {
          setTransactions(prev => [exec.transaction, ...prev]);
        }
        if (exec.contact || exec.removedContact) {
          const contactResponse = await fetch('/api/contacts');
          if (contactResponse.ok) {
            const contactData = await contactResponse.json();
            setContacts(contactData.contacts || []);
          }
        }
        if (exec.recurringPayment) {
          setRecurringPayments(prev => [exec.recurringPayment, ...prev]);
        }
        return;
      }

      if (data.status === 'cancelled') {
        setResponseMessage('Command cancelled.');
        return;
      }

      if (data.status === 'clarification') {
        setResponseMessage(data.message || 'Please confirm again.');
        // Re-open confirmation prompt with same id/text
        setConfirmation({
          isRequired: true,
          confirmationId: data.confirmationId,
          confirmationText: data.message,
          timeoutMs: 15000,
          deadlineTs: Date.now() + 15000
        });
        return;
      }

      // Fallback
      setResponseMessage(data.message || 'Unable to process confirmation.');
    } catch (e) {
      console.error('Error confirming command:', e);
      setResponseMessage(`Error confirming: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setRecognizedText('');
      setResponseMessage('');
      setParsedCommand(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setResponseMessage('Listening...');
      } catch (error) {
          console.error("Error starting recognition:", error);
          setResponseMessage(`Error starting recognition: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsListening(false);
      }
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#28a745'; // Green
    if (confidence >= 0.6) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <h1>EchoPay AI Interface</h1>

        {/* AI Status Banner */}
        {aiStats && (
          <div className="ai-status-banner">
            <div className="ai-status-content">
              <span className="ai-status-icon">🤖</span>
              <span className="ai-status-text">
                AI Command Processor Active - {aiStats.methods.join(', ')} | 
                Trained on {aiStats.totalTrained} examples
              </span>
            </div>
          </div>
        )}

        {/* Wallet Section */}
        <div className="card">
        <h2>Wallet Connection</h2>
        {!extensionsLoaded && accounts.length === 0 && (
          <button data-testid="connect-wallet" onClick={handleConnectWallet}>Connect Wallet</button>
        )}
        {walletError && <p style={{ color: 'red' }}>{walletError}</p>}
        {accounts.length > 0 && (
          <div>
            <label htmlFor="account-select">Select Account: </label>
            <select
              id="account-select"
              value={selectedAccount?.address}
              onChange={(e) => {
                const selected = accounts.find(acc => acc.address === e.target.value) || null;
                setSelectedAccount(selected);
                setAccountBalance('');
              }}
            >
              {accounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.meta.name} ({account.address.substring(0, 6)}...{account.address.substring(account.address.length - 6)})
                </option>
              ))}
            </select>
            {selectedAccount && (
                <>
                    <p>Connected as: {selectedAccount.meta.name} ({selectedAccount.address})</p>
                    <p>
                        Balance: {isBalanceLoading
                                    ? <span className="loading-spinner"></span>
                                    : (accountBalance || 'N/A')
                                 }
                        {walletError && !isBalanceLoading && <span style={{ color: 'orange', marginLeft: '10px' }}>(Error fetching balance)</span>}
                    </p>
                    {!isWalletVerified ? (
                      <button 
                        onClick={verifyWallet} 
                        style={{marginTop: '10px', backgroundColor: '#ff6b6b', color: 'white'}}
                        disabled={isProcessingCommand}
                      >
                        Verify Wallet
                      </button>
                    ) : (
                      <div style={{marginTop: '10px', color: 'green', fontWeight: 'bold'}}>
                        ✓ Wallet Verified
                      </div>
                    )}
                    <button onClick={handleDisconnectWallet} style={{marginTop: '10px'}}>
                      Disconnect Wallet
                    </button>
                </>
            )}
          </div>
        )}
        {!selectedAccount && extensionsLoaded && accounts.length === 0 && (
             <button onClick={handleConnectWallet}>Connect Wallet</button>
        )}
      </div>

      {/* Voice Command Section */}
      <div className="card">
        <h2>AI Voice Command</h2>
        {!recognition && <p style={{ color: 'red' }}>Speech Recognition not available in this browser.</p>}
        {recognition && (
          <button data-testid="toggle-listen" onClick={toggleListen} disabled={!recognition || !selectedAccount}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
        )}

        {/* New: Manual command input for accessibility and E2E testing */}
        <div style={{ marginTop: 12 }}>
          <label htmlFor="command-input" style={{ display: 'block', fontWeight: 600 }}>Type a command (testing)</label>
          <input
            id="command-input"
            data-testid="command-input"
            type="text"
            placeholder="e.g., Pay 1000 to Alice"
            value={recognizedText}
            onChange={(e) => setRecognizedText(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ddd', marginTop: 6 }}
          />
        </div>

        {recognizedText && (
          <>
            <div className="recognized-text">
              <strong>Recognized:</strong> {recognizedText}
            </div>
            {recognizedContact && (
              <div className="recognized-contact-details">
                <p><strong>Matched Contact:</strong> {recognizedContact.name}</p>
                <p><strong>Address:</strong> {recognizedContact.address}</p>
              </div>
            )}
                         <button 
                           data-testid="process-command" 
                           onClick={() => processVoiceCommand({ text: recognizedText, audioData: currentAudioData })} 
                           disabled={!recognizedText || (!isTestMode() && !selectedAccount) || isProcessingCommand || !isWalletVerified}
                           style={{ backgroundColor: isProcessingCommand ? '#ccc' : '#4CAF50', color: 'white' }}
                         >
                           {isProcessingCommand ? 'Processing...' : 'Process Command with AI'}
                         </button>
                         
                         {/* Audio Recording Controls */}
                         <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                           <button
                             onClick={startRecording}
                             disabled={isRecording}
                             style={{ 
                               backgroundColor: isRecording ? '#ccc' : '#2196F3', 
                               color: 'white',
                               padding: '8px 16px',
                               borderRadius: '4px'
                             }}
                           >
                             {isRecording ? 'Recording...' : '🎤 Record Audio'}
                           </button>
                           {isRecording && (
                             <button
                               onClick={stopRecording}
                               style={{ 
                                 backgroundColor: '#f44336', 
                                 color: 'white',
                                 padding: '8px 16px',
                                 borderRadius: '4px'
                               }}
                             >
                               ⏹️ Stop Recording
                             </button>
                           )}
                         </div>
                         
                         {currentAudioData && (
                           <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                             <p style={{ margin: 0, fontSize: '14px' }}>
                               <strong>Audio recorded:</strong> Ready to process with voice command
                             </p>
                           </div>
                         )}
          </>
        )}
        </div>

        {/* Confirmation Prompt */}
        {confirmation.isRequired && (
          <div className="card confirmation-card">
            <h3>Confirm Action</h3>
            <p>{confirmation.confirmationText}</p>
            <div className="confirmation-actions">
              <button data-testid="confirm-yes" className="confirm-yes" onClick={() => confirmCommand(true)}>Yes</button>
              <button data-testid="confirm-no" className="confirm-no" onClick={() => confirmCommand(false)}>No</button>
              <span className="countdown">{countdownSec}s</span>
            </div>
          </div>
        )}

        {/* Enhanced Voice Command Section */}
        <div className="card">
          <h3>Enhanced Voice Commands</h3>
          <div style={{ marginBottom: '15px' }}>
            <p><strong>Status:</strong> {isWalletVerified ? '✓ Wallet Verified' : '⚠ Wallet Not Verified'}</p>
            <p><strong>Processing:</strong> {isProcessingCommand ? '🔄 Processing...' : '✅ Ready'}</p>
          </div>
          
          {isWalletVerified && (
            <div style={{ marginTop: '15px' }}>
              <h4>Voice Command Examples:</h4>
              <ul style={{ fontSize: '14px', color: '#666' }}>
                <li>"Pay 50 DOT to Alice"</li>
                <li>"Send 100 DOT to 5F...abc"</li>
                <li>"Transfer 25 DOT to Bob"</li>
              </ul>
              
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                <p><strong>Current Command:</strong></p>
                <p style={{ fontFamily: 'monospace', backgroundColor: 'white', padding: '8px', borderRadius: '4px' }}>
                  {recognizedText || 'No command recognized yet'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Parsed Command Display */}
        {parsedCommand && (
          <div className="card parsed-command">
            <h3>AI Command Analysis</h3>
            <div className="command-analysis-grid">
              <div className="analysis-item">
                <strong>Type:</strong> {parsedCommand.type}
              </div>
              {parsedCommand.confidence !== undefined && (
                <div className="analysis-item">
                  <strong>Confidence:</strong> 
                  <span style={{ 
                    color: getConfidenceColor(parsedCommand.confidence),
                    marginLeft: '8px',
                    fontWeight: 'bold'
                  }}>
                    {getConfidenceText(parsedCommand.confidence)} ({(parsedCommand.confidence * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
              {parsedCommand.amount && (
                <div className="analysis-item">
                  <strong>Amount:</strong> {parsedCommand.amount}
                </div>
              )}
              {parsedCommand.recipient && (
                <div className="analysis-item">
                  <strong>Recipient:</strong> {parsedCommand.recipient}
                </div>
              )}
              {parsedCommand.currency && (
                <div className="analysis-item">
                  <strong>Currency:</strong> {parsedCommand.currency}
                </div>
              )}
              {parsedCommand.processingMethods && (
                <div className="analysis-item">
                  <strong>AI Methods:</strong> {parsedCommand.processingMethods.join(', ')}
                </div>
              )}
            </div>
            <p><strong>Original:</strong> "{parsedCommand.originalCommand}"</p>
            
            {/* Transaction Execution */}
            {parsedCommand.type === 'transfer' && (
              <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '6px' }}>
                <h4>Execute Transaction</h4>
                <p><strong>Amount:</strong> {parsedCommand.amount} {parsedCommand.currency}</p>
                <p><strong>To:</strong> {parsedCommand.recipient}</p>
                <p><strong>Status:</strong> Ready to execute</p>
                
                <button
                  onClick={async () => {
                    try {
                      // For demo, use a mock address - in real app, lookup contact address
                      const mockAddress = '5F...abc'; // This should come from contact lookup
                      await signAndBroadcastTransaction(
                        { 
                          id: Date.now(), 
                          type: 'transfer', 
                          amount: parsedCommand.amount || 0, 
                          recipient: parsedCommand.recipient || '', 
                          currency: parsedCommand.currency || 'DOT',
                          status: 'pending',
                          timestamp: new Date().toISOString(),
                          txHash: 'pending',
                          confidence: parsedCommand.confidence,
                          processingMethods: parsedCommand.processingMethods
                        },
                        mockAddress
                      );
                    } catch (error) {
                      console.error('Transaction execution failed:', error);
                    }
                  }}
                  style={{ 
                    backgroundColor: '#4CAF50', 
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  🚀 Execute Transaction
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status Message Area */}
        {responseMessage && (
            <div className="card status-area">
                <p>Status: {responseMessage}</p>
            </div>
        )}

        {/* Transaction History */}
        {transactions.length > 0 && (
          <div className="card">
            <h3>Recent Transactions</h3>
            <div className="transaction-list">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-header">
                    <span className="tx-type">{tx.type}</span>
                    <span className="tx-status">{tx.status}</span>
                    {tx.confidence && (
                      <span 
                        className="tx-confidence"
                        style={{ backgroundColor: getConfidenceColor(tx.confidence) }}
                      >
                        AI: {(tx.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="tx-details">
                    <p><strong>Amount:</strong> {tx.amount} {tx.currency}</p>
                    <p><strong>To:</strong> {tx.recipient}</p>
                    {tx.recipientAddress && (
                      <p><strong>Address:</strong> <code>{tx.recipientAddress.substring(0, 10)}...</code></p>
                    )}
                    <p><strong>Time:</strong> {new Date(tx.timestamp).toLocaleString()}</p>
                    <p><strong>Hash:</strong> <code>{tx.txHash.substring(0, 10)}...</code></p>
                    {tx.processingMethods && (
                      <p><strong>AI Methods:</strong> {tx.processingMethods.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Payments */}
        {recurringPayments.length > 0 && (
          <div className="card">
            <h3>Recurring Payments</h3>
            <div className="recurring-payments-list">
              {recurringPayments.map((payment) => (
                <div key={payment.id} className="recurring-payment-item">
                  <div className="rp-header">
                    <span className="rp-amount">{payment.amount} {payment.currency}</span>
                    <span className="rp-status">{payment.status}</span>
                  </div>
                  <div className="rp-details">
                    <p><strong>To:</strong> {payment.recipient}</p>
                    <p><strong>Frequency:</strong> {payment.frequency}</p>
                    <p><strong>Next Payment:</strong> {new Date(payment.nextPayment).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Contact List Section */}
      <div className="sidebar">
        <ContactList contacts={contacts} />
      </div>
    </div>
  );
}

export default App;
