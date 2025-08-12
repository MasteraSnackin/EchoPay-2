import { useState, useEffect, useRef } from 'react';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { AccountInfo } from '@polkadot/types/interfaces';
import { formatBalance } from '@polkadot/util';
import './App.css';
import ContactList, { mockContacts, Contact } from './ContactList';

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
  currency: string;
  status: string;
  timestamp: string;
  txHash: string;
}

interface ParsedCommand {
  type: string;
  amount?: number;
  recipient?: string;
  currency?: string;
  originalCommand: string;
  message?: string;
}

function App() {
  // Wallet State
  const [extensionsLoaded, setExtensionsLoaded] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>('');
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string>('');

  // Voice Command State
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [recognizedContact, setRecognizedContact] = useState<Contact | null>(null);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const recognitionRef = useRef(recognition);

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
    const foundContact = mockContacts.find((contact: Contact) => contact.name.toLowerCase() === lowerCaseText);
    setRecognizedContact(foundContact || null);
  }, [recognizedText]);

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

      const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');
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

  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
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
    setResponseMessage('Processing command...');
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
      setResponseMessage(result.message || 'Command processed.');
      setParsedCommand(result.parsedCommand || null);
      
      // Update transactions if it's a payment
      if (result.transaction) {
        setTransactions(prev => [result.transaction, ...prev]);
      }

    } catch (error) {
      console.error("Error sending command:", error);
      setResponseMessage(`Error sending command: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  return (
    <div className="app-container">
      <div className="main-content">
        <h1>EchoPay Interface</h1>

        {/* Wallet Section */}
        <div className="card">
        <h2>Wallet Connection</h2>
        {!extensionsLoaded && accounts.length === 0 && (
          <button onClick={handleConnectWallet}>Connect Wallet</button>
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
        <h2>Voice Command</h2>
        {!recognition && <p style={{ color: 'red' }}>Speech Recognition not available in this browser.</p>}
        {recognition && (
          <button onClick={toggleListen} disabled={!recognition || !selectedAccount}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
        )}
        {recognizedText && (
          <>
            <p>Recognized: "{recognizedText}"</p>
            {recognizedContact && (
              <div className="recognized-contact-details">
                <p><strong>Matched Contact:</strong> {recognizedContact.name}</p>
                <p><strong>Address:</strong> {recognizedContact.address}</p>
              </div>
            )}
            <button onClick={() => sendCommandToBackend(recognizedText)} disabled={!recognizedText || !selectedAccount || responseMessage.startsWith('Processing')}>
              Process Command
            </button>
          </>
        )}
        </div>

        {/* Parsed Command Display */}
        {parsedCommand && (
          <div className="card parsed-command">
            <h3>Command Analysis</h3>
            <p><strong>Type:</strong> {parsedCommand.type}</p>
            {parsedCommand.amount && <p><strong>Amount:</strong> {parsedCommand.amount}</p>}
            {parsedCommand.recipient && <p><strong>Recipient:</strong> {parsedCommand.recipient}</p>}
            {parsedCommand.currency && <p><strong>Currency:</strong> {parsedCommand.currency}</p>}
            <p><strong>Original:</strong> "{parsedCommand.originalCommand}"</p>
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
                  </div>
                  <div className="tx-details">
                    <p><strong>Amount:</strong> {tx.amount} {tx.currency}</p>
                    <p><strong>To:</strong> {tx.recipient}</p>
                    <p><strong>Time:</strong> {new Date(tx.timestamp).toLocaleString()}</p>
                    <p><strong>Hash:</strong> <code>{tx.txHash.substring(0, 10)}...</code></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Contact List Section */}
      <div className="sidebar">
        <ContactList />
      </div>
    </div>
  );
}

export default App;
