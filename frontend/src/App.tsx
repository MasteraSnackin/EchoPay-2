import { useState, useEffect, useRef } from 'react';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { AccountInfo } from '@polkadot/types/interfaces'; // Import AccountInfo type
import { formatBalance } from '@polkadot/util';
import './App.css';
import ContactList, { mockContacts, Contact } from './ContactList'; // Import the new component AND mock data/type

// Check if the browser supports the Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false; // Process single utterances
  recognition.lang = 'en-US'; // Set language
  recognition.interimResults = false; // We only want final results
  recognition.maxAlternatives = 1; // Get the single best result
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
  const [recognizedContact, setRecognizedContact] = useState<Contact | null>(null); // State for matched contact
  const recognitionRef = useRef(recognition); // Use ref to avoid issues with state closure in callbacks

  // Effect for Speech Recognition Setup
  useEffect(() => {
    if (!recognitionRef.current) {
      // Don't overwrite wallet messages if speech isn't supported
      // setResponseMessage("Speech recognition not supported by this browser.");
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    const currentRecognition = recognitionRef.current;

    currentRecognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      console.log('Speech recognized:', speechResult);
      setRecognizedText(speechResult);
      setIsListening(false); // Stop listening visually
      // Don't automatically send, wait for button press
      // sendCommandToBackend(speechResult);
      setResponseMessage('Command recognized. Press "Process Command" to send.'); // Update status
    };

    currentRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setResponseMessage(`Speech Error: ${event.error}`);
      setIsListening(false);
    };

    currentRecognition.onend = () => {
      // Ensure listening state is false when recognition ends naturally
      // (e.g., after a period of silence)
      setIsListening(false);
    };

    // Cleanup function to remove listeners when component unmounts
    return () => {
        currentRecognition.onresult = null;
        currentRecognition.onerror = null;
        currentRecognition.onend = null;
        if (isListening) {
            currentRecognition.stop();
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run speech setup once on mount

  // --- Recognize Contact from Speech ---
  useEffect(() => {
    if (!recognizedText) {
      setRecognizedContact(null);
      return;
    }

    const lowerCaseText = recognizedText.toLowerCase().trim();
    // Explicitly type 'contact' parameter
    const foundContact = mockContacts.find((contact: Contact) => contact.name.toLowerCase() === lowerCaseText);

    setRecognizedContact(foundContact || null);

  }, [recognizedText]); // Re-run when recognizedText changes


  // --- Fetch Account Balance ---
  useEffect(() => {
    const fetchBalance = async () => {
      if (!selectedAccount) {
        setAccountBalance('');
        return;
      }

      setIsBalanceLoading(true);
      setAccountBalance(''); // Clear previous balance
      setWalletError(''); // Clear previous errors

      // Connect to a Westend node
      const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');
      let api: ApiPromise | null = null;

      try {
        api = await ApiPromise.create({ provider: wsProvider });
        await api.isReady;

        // Get chain properties once
        const chainDecimals = api.registry.chainDecimals[0];
        const chainTokens = api.registry.chainTokens[0];
        formatBalance.setDefaults({ decimals: chainDecimals, unit: chainTokens });


        // Query account info and cast to the correct type
        const accountInfo = await api.query.system.account(selectedAccount.address) as AccountInfo;
        const freeBalance = accountInfo.data.free;

        // Format and set balance
        setAccountBalance(formatBalance(freeBalance, { withUnit: true, withSi: false }));

      } catch (error) {
        console.error("Error fetching balance:", error);
        setWalletError(`Error fetching balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAccountBalance(''); // Clear balance on error
      } finally {
        setIsBalanceLoading(false);
        // Disconnect API
        if (api) {
          await api.disconnect();
        }
      }
    };

    fetchBalance();
  }, [selectedAccount]); // Re-run when selectedAccount changes


  // --- Wallet Connection Logic ---
  const handleConnectWallet = async () => {
    setWalletError('');
    setExtensionsLoaded(false); // Reset state initially
    setAccounts([]);
    setSelectedAccount(null);
    console.log("Attempting to enable extensions..."); // Log start

    try {
      // Request permission to access extensions
      const injectedExtensions = await web3Enable('EchoPay App');
      console.log("web3Enable executed. Result:", injectedExtensions); // Log result

      if (!injectedExtensions || injectedExtensions.length === 0) {
        console.error("No extensions found or enabled.");
        setWalletError('No Polkadot browser extension found, or permission denied. Please install SubWallet (or compatible) and ensure it\'s enabled and permissions are granted.');
        return;
      }

      console.log("Enabled extensions:", injectedExtensions.map(ext => ext.name));

      // Check specifically for SubWallet
      const subwalletExtension = injectedExtensions.find(ext => ext.name === 'subwallet-js');
      if (!subwalletExtension) {
          console.warn("SubWallet extension not found among enabled extensions. Other extensions might be available.");
          // Optionally, you could set a non-blocking warning message here.
          // setWalletError("SubWallet not detected, but other extensions might work.");
      } else {
          console.log("SubWallet extension detected.");
      }

      setExtensionsLoaded(true); // Mark extensions as loaded *after* successful enable

      // Get accounts from ALL enabled extensions (including SubWallet if present)
      console.log("Attempting to fetch accounts...");
      const allAccounts = await web3Accounts();
      console.log("web3Accounts executed. Found accounts:", allAccounts.length);

      if (allAccounts.length === 0) {
          console.error("No accounts found in enabled extensions.");
          setWalletError('No accounts found in the extension. Please ensure you have created or imported an account and granted access.');
          setAccounts([]); // Keep accounts empty
          // Keep extensionsLoaded true, as extensions *were* enabled
          return;
      }
      setAccounts(allAccounts);
      // Optionally select the first account by default
      if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0]);
      }

    } catch (error) {
      console.error("Error during wallet connection process:", error);
      // Display a more user-friendly error
      setWalletError(`Error connecting wallet: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}. Check console for details.`);
      // Reset state fully on error
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
    // Note: This doesn't revoke permissions in the extension itself,
    // just disconnects the app's state.
  };

  // --- Mock Backend Communication ---
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
      setRecognizedText(''); // Clear previous text
      setResponseMessage(''); // Clear previous response
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setResponseMessage('Listening...');
      } catch (error) {
          // Handle cases where recognition might already be active or other errors
          console.error("Error starting recognition:", error);
          setResponseMessage(`Error starting recognition: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsListening(false); // Ensure state is consistent
      }
    }
  };


  return (
    <div className="app-container"> {/* Add a container for layout */}
      <div className="main-content"> {/* Container for the main interface */}
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
                setAccountBalance(''); // Clear balance when changing account
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
                                    ? <span className="loading-spinner"></span> /* Use spinner class */
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
        {/* Show Connect button again if disconnected but extensions were loaded */}
        {!selectedAccount && extensionsLoaded && accounts.length === 0 && (
             <button onClick={handleConnectWallet}>Connect Wallet</button>
        )}
      </div>

      {/* Voice Command Section */}
      <div className="card">
        <h2>Voice Command</h2>
        {!recognition && <p style={{ color: 'red' }}>Speech Recognition not available in this browser.</p>}
        {recognition && (
          <button onClick={toggleListen} disabled={!recognition || !selectedAccount}> {/* Disable if no wallet connected */}
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
        )}
        {recognizedText && (
          <>
            <p>Recognized: "{recognizedText}"</p>
            {/* Display recognized contact details */}
            {recognizedContact && (
              <div className="recognized-contact-details">
                <p><strong>Matched Contact:</strong> {recognizedContact.name}</p>
                <p><strong>Address:</strong> {recognizedContact.address}</p>
              </div>
            )}
            {/* Disable processing if no wallet connected */}
            <button onClick={() => sendCommandToBackend(recognizedText)} disabled={!recognizedText || !selectedAccount || responseMessage.startsWith('Processing')}>
              Process Command (Mock)
            </button>
          </>
        )}
          {/* Remove status message display from here */}
          {/* {responseMessage && <p>Status: {responseMessage}</p>} */}
        </div>

        {/* Dedicated Status Message Area */}
        {responseMessage && (
            <div className="card status-area">
                <p>Status: {responseMessage}</p>
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
