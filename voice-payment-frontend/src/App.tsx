import React, { useState, useEffect, useRef } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ContractPromise } from '@polkadot/api-contract';
import { WeightV2 } from '@polkadot/types/interfaces';
// Import the renamed metadata file as JSON
import contractMetadata from './payment_recorder.contract.json';
import './App.css';

// --- Configuration ---
const APP_NAME = 'VoicePaymentDApp';
const LOCAL_NODE_ENDPOINT = 'ws://127.0.0.1:9944';
// !!! REPLACE WITH YOUR ACTUAL DEPLOYED CONTRACT ADDRESS !!!
const CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS_HERE'; // Example: '5EXAMPLEADDRESS...'

// --- Web Speech API Setup ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

// Type for Payment Record (mirroring the struct in the contract)
interface PaymentRecord {
  recipient: string; // AccountId string
  amount: string;    // Balance string
  timestamp: string; // Timestamp string
}

function App() {
  // API & Wallet State
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isApiError, setIsApiError] = useState(false);
  const [extensionFound, setExtensionFound] = useState(false);

  // Contract State
  const [contract, setContract] = useState<ContractPromise | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');

  // Transaction & UI State
  const [isLoading, setIsLoading] = useState(false); // General loading state
  const [status, setStatus] = useState(''); // General status messages
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const initRan = useRef(false);

  // --- Initialize API, Extension, and Contract Connection ---
  useEffect(() => {
    // Prevent double run in StrictMode
    if (initRan.current || typeof window === 'undefined') return;
    initRan.current = true;

    const setup = async () => {
      setStatus('Connecting to Node...');
      try {
        const wsProvider = new WsProvider(LOCAL_NODE_ENDPOINT);
        const apiInstance = await ApiPromise.create({ provider: wsProvider });
        setApi(apiInstance);
        setIsApiReady(true);
        setStatus('Node connected. Checking for wallet extension...');
        console.log('API connected');

        let foundAccounts: InjectedAccountWithMeta[] = [];
        try {
            const extensions = await web3Enable(APP_NAME);
            if (extensions.length === 0) {
              setStatus('Node connected. Wallet extension not found.');
              setExtensionFound(false);
            } else {
                setExtensionFound(true);
                setStatus('Node connected. Wallet extension found. Loading accounts...');
                console.log('Extension found');
                foundAccounts = await web3Accounts();
                setAccounts(foundAccounts);
                console.log('Accounts loaded:', foundAccounts);
                if (foundAccounts.length > 0) {
                  setSelectedAccount(foundAccounts[0]);
                  setStatus('Ready.');
                } else {
                    setStatus('Wallet extension found, but no accounts authorized.');
                }
            }
        } catch (extError) {
             console.error("Error enabling/fetching accounts:", extError);
             setStatus(`Wallet Error: ${extError instanceof Error ? extError.message : String(extError)}`);
             setExtensionFound(false); // Assume extension is unusable if error occurs here
        }


        // --- Setup Contract Instance ---
        if (CONTRACT_ADDRESS === 'YOUR_CONTRACT_ADDRESS_HERE') {
            console.warn("Contract address not set in App.tsx");
             if (foundAccounts.length === 0 && !extensionFound) setStatus("Ready (WARNING: Contract Address not set & No Wallet!)");
             else if (foundAccounts.length === 0) setStatus("Ready (WARNING: Contract Address not set!)");
             // else status is already set based on account loading
        } else {
            try {
                // Basic check on metadata structure
                if (!contractMetadata || typeof contractMetadata !== 'object' || !contractMetadata.spec || !contractMetadata.source) {
                     throw new Error("Imported contract metadata is invalid or missing key properties (spec, source).");
                }
                const contractInstance = new ContractPromise(apiInstance, contractMetadata, CONTRACT_ADDRESS);
                setContract(contractInstance);
                console.log("Contract instance created");
                // Update status only if it wasn't set by account loading success
                if (status === 'Wallet extension found, but no accounts authorized.' || status.startsWith('Node connected.')) {
                    setStatus("Ready (Contract Initialized)");
                }
            } catch (err) {
                 console.error("Error creating contract instance:", err);
                 setStatus(`Error initializing contract: ${err instanceof Error ? err.message : String(err)}`);
                 setContract(null); // Ensure contract is null if init fails
            }
        }

      } catch (error) {
        console.error('Initialization error:', error);
        setStatus(`Initialization Error: ${error instanceof Error ? error.message : String(error)}`);
        setIsApiError(true);
      }
    };

    setup();

    // Cleanup
    return () => {
      initRan.current = false; // Allow re-run if component remounts
      api?.disconnect().then(() => console.log('API disconnected'));
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Voice Recognition Handlers ---
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice transcript:', transcript);
      setVoiceTranscript(transcript);
      setIsListening(false);
      setVoiceError('');
      setStatus(`Processing command: "${transcript}"`);
      parseAndPay(transcript); // Process the command
    };

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      const errorMsg = `Voice Error: ${event.error}`;
      setVoiceError(errorMsg);
      setStatus(errorMsg);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended.');
    };

  }, []); // Run once on mount

  const handleListen = () => {
    if (!recognition) {
      const errorMsg = "Speech recognition not supported by this browser.";
      setVoiceError(errorMsg);
      setStatus(errorMsg);
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setVoiceTranscript('');
      setVoiceError('');
      setStatus('Listening...');
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting recognition:", err);
        const errorMsg = "Could not start voice recognition.";
        setVoiceError(errorMsg);
        setStatus(errorMsg);
        setIsListening(false);
      }
    }
  };

  // --- Main Payment Logic ---
  const parseAndPay = async (transcript: string) => {
    setIsLoading(true); // Start loading indicator
    setVoiceError(''); // Clear previous voice errors
    setStatus(`Parsing: "${transcript}"`);

    if (!selectedAccount || !api || !contract) {
      setStatus('Error: Wallet not connected or contract not initialized.');
      setIsLoading(false);
      return;
    }

    // Improved Regex: More flexible spacing, case-insensitive, stricter address length
    const match = transcript.match(/pay\s+(\d+(\.\d+)?)\s+dot\s+to\s+([a-z0-9]{47,48})/i);

    if (!match) {
      setStatus(`Could not parse command: "${transcript}". Expected format: "Pay AMOUNT DOT to ADDRESS".`);
      setIsLoading(false);
      return;
    }

    const amountStr = match[1];
    const recipient = match[3];
    const amount = parseFloat(amountStr);

    // Validate recipient address format (basic check)
    try {
      api.createType('AccountId', recipient);
    } catch (e) {
      setStatus(`Invalid recipient address format: ${recipient}`);
      setIsLoading(false);
      return;
    }

    // Convert DOT amount to Planck
    const decimals = api.registry.chainDecimals[0] || 10;
    const amountInPlanck = BigInt(Math.round(amount * (10 ** decimals)));

    console.log(`Parsed: Pay ${amount} DOT (${amountInPlanck} Planck) to ${recipient}`);
    setStatus(`Initiating payment of ${amount} DOT to ${recipient.substring(0, 8)}...`);

    let transferUnsub = () => {};
    let recordUnsub = () => {};

    try {
      const injector = await web3FromSource(selectedAccount.meta.source);

      // --- 1. Initiate DOT Transfer ---
      setStatus(`Sending ${amount} DOT transfer... Waiting for wallet confirmation...`);
      transferUnsub = await api.tx.balances
        .transferKeepAlive(recipient, amountInPlanck)
        .signAndSend(selectedAccount.address, { signer: injector.signer }, (result) => {
          console.log('Transfer status:', result.status.toHuman());
          setStatus(`Transfer status: ${result.status.toHuman()}`);

          if (result.dispatchError) {
             // Try to decode the error
             let errorInfo = result.dispatchError.toHuman();
             if (result.dispatchError.isModule) {
                 const decoded = api.registry.findMetaError(result.dispatchError.asModule);
                 errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
             }
             setStatus(`Transfer Error: ${errorInfo}`);
             setIsLoading(false);
             transferUnsub(); // Unsubscribe on dispatch error
             return; // Stop processing
          }

          if (result.status.isInBlock) {
            console.log(`Transfer included in block: ${result.status.asInBlock}`);
            setStatus(`Transfer in block ${result.status.asInBlock.toHex().substring(0, 8)}... Recording payment...`);

            // --- 2. Call record_payment on Contract ---
            const gasLimit: WeightV2 = api.registry.createType('WeightV2', {
                refTime: BigInt(3_000_000_000), // Use underscores for readability
                proofSize: BigInt(60_000)
            });

            contract.tx
              .recordPayment({ gasLimit, value: 0 }, recipient, amountInPlanck)
              .signAndSend(selectedAccount.address, { signer: injector.signer }, (recordResult) => {
                console.log('Record status:', recordResult.status.toHuman());
                setStatus(`Record status: ${recordResult.status.toHuman()}`);

                 if (recordResult.dispatchError) {
                    let recordErrorInfo = recordResult.dispatchError.toHuman();
                     if (recordResult.dispatchError.isModule) {
                         const decoded = api.registry.findMetaError(recordResult.dispatchError.asModule);
                         recordErrorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                     }
                    setStatus(`Record Error: ${recordErrorInfo}`);
                    setIsLoading(false);
                    recordUnsub(); // Unsubscribe on dispatch error
                    transferUnsub(); // Also unsub transfer
                    return; // Stop processing
                 }


                if (recordResult.status.isInBlock) {
                    setStatus(`Record in block ${recordResult.status.asInBlock.toHex().substring(0, 8)}...`);
                } else if (recordResult.status.isFinalized) {
                    setStatus(`Payment Recorded Successfully (Finalized: ${recordResult.status.asFinalized.toHex().substring(0,8)})`);
                    setIsLoading(false); // Finished
                    recordUnsub();
                    transferUnsub();
                    // Optionally fetch history automatically after success
                    fetchHistory();
                } else if (recordResult.isError) { // Catch other potential errors
                    setStatus(`Error recording payment: ${recordResult.status.toHuman()}`);
                    setIsLoading(false);
                    recordUnsub();
                    transferUnsub();
                }
              })
              .then(unsub => { recordUnsub = unsub; })
              .catch(err => {
                console.error('Error sending record transaction:', err);
                setStatus(`Error sending record tx: ${err instanceof Error ? err.message : String(err)}`);
                setIsLoading(false);
                transferUnsub(); // Still need to unsub from transfer if record fails to send
              });

          } else if (result.status.isFinalized) {
            // Transfer finalized, but recording might still be pending or failed earlier
            console.log(`Transfer finalized: ${result.status.asFinalized}`);
            // Don't stop loading here unless record call failed to send
          } else if (result.isError) { // Catch other potential errors
            setStatus(`Error during transfer: ${result.status.toHuman()}`);
            setIsLoading(false);
            transferUnsub();
          }
        });

    } catch (error) {
      console.error('Error during payment process:', error);
      setStatus(`Payment Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
      // Ensure unsub functions are called if they exist
      if (transferUnsub && typeof transferUnsub === 'function') transferUnsub();
      if (recordUnsub && typeof recordUnsub === 'function') recordUnsub();
    }
  };

  // --- Fetch Payment History ---
  const fetchHistory = async () => {
    if (!contract || !selectedAccount || !api) {
      setHistoryError('Cannot fetch history: Wallet not connected or contract not ready.');
      return;
    }
    setHistoryLoading(true);
    setHistoryError('');
    setPaymentHistory([]); // Clear previous history

    try {
       const gasLimit: WeightV2 = api.registry.createType('WeightV2', {
            refTime: BigInt(20_000_000_000), // Generous limit for query
            proofSize: BigInt(100_000)
        });

      // Use callStatic for dry run query
      const { result, output } = await contract.query.getMyPaymentHistory(
        selectedAccount.address, // Address making the call (needed for query context)
        { gasLimit, value: 0 }
      );

      if (result.isOk && output) {
        const humanOutput = output.toHuman();
        if (Array.isArray(humanOutput)) {
             const historyRecords = (humanOutput as any[]).map(record => ({
                recipient: record?.recipient?.toString() || 'N/A',
                amount: record?.amount?.toString() || 'N/A',
                timestamp: record?.timestamp?.toString() || 'N/A',
            }));
            setPaymentHistory(historyRecords);
        } else {
             console.warn("Unexpected history output format:", humanOutput);
             setHistoryError("Could not parse history data.");
        }
      } else if (result.isErr) {
        console.error('Error fetching history:', result.asErr.toHuman());
        // Try to decode module error if possible
        let errorMsg = `Error fetching history: ${JSON.stringify(result.asErr.toHuman())}`;
        if (result.asErr.isModule) {
             const dispatchError = api.registry.findMetaError(result.asErr.asModule);
             errorMsg = `Error fetching history: ${dispatchError.section}.${dispatchError.name}`;
        }
        setHistoryError(errorMsg);
      } else {
           setHistoryError("Unknown error fetching history.");
      }
    } catch (error) {
      console.error('Error calling get_my_payment_history:', error);
      setHistoryError(`Query Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Render UI ---
  return (
    <div className="App">
      <h1>Voice Payment DApp</h1>

      <section>
        <h2>Connection & Status</h2>
        <p>Status: <strong>{status}</strong></p>
        {isApiError && <p style={{ color: 'red' }}>Error connecting to Node.</p>}
        {!extensionFound && isApiReady && (
            <p style={{ color: 'orange' }}>Polkadot{.js} extension not found. Please install SubWallet or other compatible extension.</p>
        )}
         {CONTRACT_ADDRESS === 'YOUR_CONTRACT_ADDRESS_HERE' && isApiReady && (
             <p style={{ color: 'red', fontWeight: 'bold' }}>WARNING: Contract address is not set in App.tsx!</p>
         )}
      </section>

      {extensionFound && accounts.length > 0 && (
        <section>
          <h2>Select Account</h2>
          <select
            value={selectedAccount?.address}
            onChange={(e) => {
              const selected = accounts.find(acc => acc.address === e.target.value);
              setSelectedAccount(selected || null);
              setPaymentHistory([]); // Clear history when changing account
              setStatus('Ready.'); // Reset status
            }}
            disabled={!isApiReady || isLoading}
          >
            {accounts.map((account) => (
              <option key={account.address} value={account.address}>
                {account.meta.name} ({account.address.substring(0, 6)}...)
              </option>
            ))}
          </select>
          {selectedAccount && <p>Selected: {selectedAccount.meta.name} ({selectedAccount.address})</p>}
        </section>
      )}

       {recognition && selectedAccount && contract && (
         <section>
            <h2>Voice Command</h2>
            <button onClick={handleListen} disabled={!isApiReady || !selectedAccount || isLoading || !contract}>
                {isListening ? '🛑 Stop Listening' : isLoading ? 'Processing...' : '🎤 Record Payment Command'}
            </button>
            {isListening && <p>Listening...</p>}
            {voiceTranscript && <p>Transcript: <strong>{voiceTranscript}</strong></p>}
            {voiceError && <p style={{ color: 'red' }}>{voiceError}</p>}
            <p><small>Example: "Pay 5 DOT to 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"</small></p>
         </section>
       )}
       {!recognition && (
            <p style={{ color: 'orange' }}>Web Speech API not supported by this browser.</p>
       )}
       {!contract && isApiReady && CONTRACT_ADDRESS !== 'YOUR_CONTRACT_ADDRESS_HERE' && (
            <p style={{ color: 'red' }}>Contract interaction disabled. Check address and metadata.</p>
       )}


       {selectedAccount && contract && (
            <section>
                <h2>Payment History (for {selectedAccount.meta.name})</h2>
                <button onClick={fetchHistory} disabled={historyLoading || isLoading || !contract}>
                    {historyLoading ? 'Loading History...' : 'Fetch My History'}
                </button>
                {historyError && <p style={{ color: 'red' }}>{historyError}</p>}
                {paymentHistory.length > 0 ? (
                    <ul>
                        {paymentHistory.map((record, index) => (
                            <li key={index}>
                                To: {record.recipient.substring(0,8)}... | Amount: {record.amount} | Time: {new Date(parseInt(record.timestamp.replace(/,/g, ''))).toLocaleString()}
                            </li>
                        ))}
                    </ul>
                ) : (
                    !historyLoading && <p>No payment history recorded for this account.</p>
                )}
            </section>
       )}

    </div>
  );
} // End of App function

export default App;
