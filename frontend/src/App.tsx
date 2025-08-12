import { useState, useEffect, useRef, useMemo } from 'react';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { AccountInfo } from '@polkadot/types/interfaces';
import { formatBalance } from '@polkadot/util';
import './App.css';
import ContactList, { mockContacts, Contact } from './ContactList';
import { parseCommandText, type ParsedCommand } from './utils/parseCommand';
import { toPlanckFromDecimal } from './utils/amount';
import { createContactSearcher, type ContactSuggestion } from './utils/contacts';
import { getLocalJSON, setLocalJSON } from './utils/storage';
import Identicon from '@polkadot/react-identicon';
import { isAddress } from '@polkadot/util-crypto';

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

  // Chain metadata and numeric balances (planck)
  const [chainDecimals, setChainDecimals] = useState<number | null>(null);
  const [accountBalancePlanck, setAccountBalancePlanck] = useState<bigint | null>(null);

  // Voice Command State
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [recognizedContact, setRecognizedContact] = useState<Contact | null>(null); // State for matched contact
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const recognitionRef = useRef(recognition); // Use ref to avoid issues with state closure in callbacks

  // Live transfer feature toggle and confirmation state
  const [isLiveTransferEnabled, setIsLiveTransferEnabled] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastTxHash, setLastTxHash] = useState<string>('');

  // Fee estimation state
  const [isEstimatingFee, setIsEstimatingFee] = useState<boolean>(false);
  const [estimatedFee, setEstimatedFee] = useState<string>('');
  const [estimateError, setEstimateError] = useState<string>('');
  const [estimatedFeePlanck, setEstimatedFeePlanck] = useState<bigint | null>(null);
  const [existentialDepositPlanck, setExistentialDepositPlanck] = useState<bigint | null>(null);

  // Preflight checks
  const [hasSufficientBalance, setHasSufficientBalance] = useState<boolean>(true);
  const [reapRiskWarning, setReapRiskWarning] = useState<string>('');

  // Typed command form state
  const [typedAmount, setTypedAmount] = useState<string>('');
  const [typedToken, setTypedToken] = useState<string>('WND');
  const [typedRecipient, setTypedRecipient] = useState<string>('');
  const [typedErrors, setTypedErrors] = useState<string>('');

  // Recipient suggestions
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  // Recent recipients
  const [recentRecipients, setRecentRecipients] = useState<Contact[]>(() => getLocalJSON<Contact[]>('recentRecipients', []));
  const addRecentRecipient = (contact: Contact) => {
    if (!contact) return;
    setRecentRecipients(prev => {
      const exists = prev.some(c => c.address === contact.address);
      const updated = exists ? prev : [contact, ...prev].slice(0, 10);
      setLocalJSON('recentRecipients', updated);
      return updated;
    });
  };

  // Fuzzy searcher
  const contactSearcher = useMemo(() => createContactSearcher([...recentRecipients, ...mockContacts]), [recentRecipients]);

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
      setIsListening(false); // Stop listening visually
      setResponseMessage('Command recognized. Press "Process Command" to send.'); // Update status
    };

    currentRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setResponseMessage(`Speech Error: ${event.error}`);
      setIsListening(false);
    };

    currentRecognition.onend = () => {
      setIsListening(false);
    };

    // Cleanup
    return () => {
      currentRecognition.onresult = null;
      currentRecognition.onerror = null;
      currentRecognition.onend = null;
      if (isListening) {
        currentRecognition.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Recognize Contact and Parse Command ---
  useEffect(() => {
    if (!recognizedText) {
      setRecognizedContact(null);
      setParsedCommand(null);
      return;
    }

    const parsed = parseCommandText(recognizedText);
    setParsedCommand(parsed);

    const lowerCaseText = recognizedText.toLowerCase().trim();
    const exactMatch = mockContacts.find((contact: Contact) => contact.name.toLowerCase() === lowerCaseText);

    if (exactMatch) {
      setRecognizedContact(exactMatch);
    } else {
      const fuzzy = contactSearcher.searchByNameOrAddress(lowerCaseText);
      setRecognizedContact(fuzzy);
    }

    if (parsed && parsed.recipientName) {
      const fuzzyByParsed = contactSearcher.searchByNameOrAddress(parsed.recipientName);
      if (fuzzyByParsed) {
        setRecognizedContact(fuzzyByParsed);
      }
    }
  }, [recognizedText, contactSearcher]);

  // Prefill typed form when parsedCommand changes
  useEffect(() => {
    if (!parsedCommand) return;
    setTypedAmount(String(parsedCommand.amount));
    setTypedToken(parsedCommand.token);
    setTypedRecipient(parsedCommand.recipientName || '');
  }, [parsedCommand]);

  // --- Fetch Account Balance ---
  useEffect(() => {
    const fetchBalance = async () => {
      if (!selectedAccount) {
        setAccountBalance('');
        setAccountBalancePlanck(null);
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
        const decimals = api.registry.chainDecimals[0];
        const token = api.registry.chainTokens[0];
        setChainDecimals(decimals);
        formatBalance.setDefaults({ decimals, unit: token });

        // Query account info and cast to the correct type
        const accountInfo = await api.query.system.account(selectedAccount.address) as AccountInfo;
        const freeBalance = accountInfo.data.free; // BN
        setAccountBalancePlanck(BigInt(freeBalance.toString()));

        // Format and set balance
        setAccountBalance(formatBalance(freeBalance, { withUnit: true, withSi: false }));

      } catch (error) {
        console.error("Error fetching balance:", error);
        setWalletError(`Error fetching balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setAccountBalance(''); // Clear balance on error
        setAccountBalancePlanck(null);
      } finally {
        setIsBalanceLoading(false);
        // Disconnect API
        if (api) {
          await api.disconnect();
        }
      }
    };

    fetchBalance();
  }, [selectedAccount]);

  // --- Estimate fee when confirmation opens ---
  useEffect(() => {
    const estimate = async () => {
      if (!isConfirmOpen || !parsedCommand || !recognizedContact || !selectedAccount) return;
      setIsEstimatingFee(true);
      setEstimateError('');
      setEstimatedFee('');
      setEstimatedFeePlanck(null);
      setExistentialDepositPlanck(null);

      let api: ApiPromise | null = null;
      try {
        const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');
        api = await ApiPromise.create({ provider: wsProvider });
        await api.isReady;

        const decimals = api.registry.chainDecimals[0];
        const token = api.registry.chainTokens[0];
        formatBalance.setDefaults({ decimals, unit: token });

        const amountPlanck = toPlanckFromDecimal(parsedCommand.amount, decimals);
        const tx = api.tx.balances.transferKeepAlive(recognizedContact.address, amountPlanck);

        const info = await tx.paymentInfo(selectedAccount.address);
        const partialFee = info.partialFee?.toString?.() || info.partialFee.toString();
        setEstimatedFee(formatBalance(partialFee, { withUnit: true, withSi: false }));
        setEstimatedFeePlanck(BigInt(partialFee));

        // existential deposit
        const edConst = api.consts.balances.existentialDeposit;
        setExistentialDepositPlanck(BigInt(edConst.toString()));
      } catch (error) {
        console.error('Fee estimation error', error);
        setEstimateError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsEstimatingFee(false);
        if (api) {
          try { await api.disconnect(); } catch {}
        }
      }
    };

    estimate();
  }, [isConfirmOpen, parsedCommand, recognizedContact, selectedAccount]);

  // --- Preflight checks whenever inputs/estimates change ---
  useEffect(() => {
    if (!parsedCommand || chainDecimals == null || accountBalancePlanck == null) {
      setHasSufficientBalance(true);
      setReapRiskWarning('');
      return;
    }

    try {
      const amountPlanck = toPlanckFromDecimal(parsedCommand.amount, chainDecimals);
      const feePlanck = estimatedFeePlanck ?? BigInt(0);
      const required = amountPlanck + feePlanck;
      const sufficient = accountBalancePlanck >= required;
      setHasSufficientBalance(sufficient);

      if (existentialDepositPlanck != null) {
        const remaining = accountBalancePlanck - required;
        if (remaining < existentialDepositPlanck) {
          setReapRiskWarning('Warning: Balance after transfer may be below existential deposit (account reaping risk).');
        } else {
          setReapRiskWarning('');
        }
      } else {
        setReapRiskWarning('');
      }
    } catch (e) {
      // On parse error, be conservative
      setHasSufficientBalance(true);
      setReapRiskWarning('');
    }
  }, [parsedCommand, chainDecimals, accountBalancePlanck, estimatedFeePlanck, existentialDepositPlanck]);

  // --- Wallet Connection Logic ---
  const handleConnectWallet = async () => {
    setWalletError('');
    setExtensionsLoaded(false); // Reset state initially
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

  // --- Mock Backend Communication ---
  const sendCommandToBackend = async (commandText: string) => {
    if (!commandText) return;
    setResponseMessage('Processing command...');

    // Build payload
    const parsed = parseCommandText(commandText);
    const contactForRecipient = parsed?.recipientName
      ? mockContacts.find(c => c.name.toLowerCase() === parsed.recipientName!.toLowerCase())
      : null;

    const payload: Record<string, unknown> = {
      command: commandText,
      parsed: parsed ? {
        ...parsed,
        recipientAddress: contactForRecipient?.address || undefined,
      } : null,
      fromAddress: selectedAccount?.address || null,
    };

    try {
      const response = await fetch('/api/process-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      setRecognizedText('');
      setParsedCommand(null);
      setResponseMessage('');
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

  // Execute on-chain transfer on Westend
  const executeOnChainTransfer = async () => {
    if (!isLiveTransferEnabled) {
      setResponseMessage('Live transfer is disabled.');
      return;
    }
    if (!selectedAccount) {
      setResponseMessage('No account selected.');
      return;
    }
    if (!parsedCommand || !recognizedContact) {
      setResponseMessage('Missing parsed command or recipient.');
      return;
    }
    if (!hasSufficientBalance) {
      setResponseMessage('Insufficient balance for amount + fee.');
      return;
    }

    setIsSubmitting(true);
    setResponseMessage('Submitting transfer...');

    let api: ApiPromise | null = null;
    try {
      const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');
      api = await ApiPromise.create({ provider: wsProvider });
      await api.isReady;

      const decimals = api.registry.chainDecimals[0];
      const amountPlanck = toPlanckFromDecimal(parsedCommand.amount, decimals);

      const injector = await web3FromAddress(selectedAccount.address);
      api.setSigner(injector.signer);

      const tx = api.tx.balances.transferKeepAlive(recognizedContact.address, amountPlanck);

      const unsub = await tx.signAndSend(selectedAccount.address, ({ status, dispatchError, txHash }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api!.registry.findMetaError(dispatchError.asModule);
            const { section, name, docs } = decoded;
            setResponseMessage(`On-chain error: ${section}.${name} - ${docs.join(' ')}`);
          } else {
            setResponseMessage(`On-chain error: ${dispatchError.toString()}`);
          }
          setIsSubmitting(false);
          unsub();
          return;
        }

        if (status.isInBlock) {
          setResponseMessage(`Included in block. Tx: ${txHash?.toString()}`);
          setLastTxHash(txHash?.toString() || '');
        } else if (status.isFinalized) {
          setResponseMessage(`Finalized. Tx: ${txHash?.toString()}`);
          // persist recent recipient
          if (recognizedContact) addRecentRecipient(recognizedContact);
          setIsSubmitting(false);
          unsub();
        } else {
          setResponseMessage(`Status: ${status.type}`);
        }
      });
    } catch (error) {
      console.error('Transfer error', error);
      setResponseMessage(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    } finally {
      if (api) {
        try { await api.disconnect(); } catch {}
      }
    }
  };

  // Compute suggestions for typed recipient
  const currentSuggestions: ContactSuggestion[] = useMemo(() => {
    if (!showSuggestions) return [];
    const q = typedRecipient.trim();
    const suggestions = q ? contactSearcher.suggest(q, 5) : recentRecipients.map(c => ({ contact: c, score: 0.5 }));
    if (q && isAddress(q)) {
      // Prepend direct address suggestion
      return [{ contact: { name: q, address: q }, score: 0 }, ...suggestions].slice(0, 5);
    }
    return suggestions.slice(0, 5);
  }, [showSuggestions, typedRecipient, recentRecipients, contactSearcher]);

  // Determine identicon preview address
  const identiconAddress: string | null = useMemo(() => {
    const q = typedRecipient.trim();
    if (isAddress(q)) return q;
    const match = contactSearcher.searchByNameOrAddress(q || (parsedCommand?.recipientName || ''));
    return match?.address || null;
  }, [typedRecipient, parsedCommand, contactSearcher]);

  // ARIA ids
  const listboxId = 'recipient-suggestions';
  const activeOptionId = activeSuggestionIndex >= 0 ? `recipient-option-${activeSuggestionIndex}` : undefined;

  // Keyboard handling for suggestions
  const onRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    const max = currentSuggestions.length;
    if (max === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % max);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev - 1 + max) % max);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0;
      const pick = currentSuggestions[idx];
      if (pick) {
        setTypedRecipient(pick.contact.name);
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }
  };

  // Open confirm from typed form
  const openConfirmFromTyped = () => {
    const result = validateTyped();
    if (!result) return;

    const provisional: ParsedCommand = {
      action: 'pay',
      amount: Number(typedAmount.replace(/,/g, '.')),
      token: typedToken.toUpperCase(),
      recipientName: result.contact!.name,
      recipientAddress: result.contact!.address,
    };

    setParsedCommand(provisional);
    setRecognizedContact(result.contact);
    setIsConfirmOpen(true);
  };

  // Validate typed form
  const validateTyped = (): { contact: Contact | null } | null => {
    setTypedErrors('');

    if (!typedAmount || !/^\d+(?:[.,]\d+)?$/.test(typedAmount)) {
      setTypedErrors('Enter a valid amount.');
      return null;
    }
    if (!typedToken || !/^[A-Za-z]{2,5}$/.test(typedToken)) {
      setTypedErrors('Enter a valid token symbol (2-5 letters).');
      return null;
    }
    if (!typedRecipient) {
      setTypedErrors('Enter a recipient name or address.');
      return null;
    }

    const q = typedRecipient.trim();
    if (isAddress(q)) {
      return { contact: { name: q, address: q } };
    }

    const match = contactSearcher.searchByNameOrAddress(q);
    if (!match) {
      setTypedErrors('Could not match recipient. Check the name/address.');
      return null;
    }

    return { contact: match };
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <h1>EchoPay Interface</h1>

        {/* Wallet Section */}
        <div className="card">
          <h2>Wallet Connection</h2>
          {/* Feature toggle */}
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input
                type="checkbox"
                checked={isLiveTransferEnabled}
                onChange={(e) => setIsLiveTransferEnabled(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable live on-chain transfer (Westend)
            </label>
          </div>
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

              {/* Parsed Preview */}
              {parsedCommand && (
                <div className="recognized-contact-details">
                  <p><strong>Parsed:</strong> {parsedCommand.action} {parsedCommand.amount} {parsedCommand.token} to {parsedCommand.recipientName || 'Unknown'}</p>
                </div>
              )}

              {/* Display recognized contact details */}
              {recognizedContact && (
                <div className="recognized-contact-details">
                  <p><strong>Matched Contact:</strong> {recognizedContact.name}</p>
                  <p><strong>Address:</strong> {recognizedContact.address}</p>
                </div>
              )}
              <button onClick={() => sendCommandToBackend(recognizedText)} disabled={!recognizedText || !selectedAccount || responseMessage.startsWith('Processing')}>
                Process Command (Mock)
              </button>
            </>
          )}

          {parsedCommand && recognizedContact && (
            <div style={{ marginTop: '10px' }}>
              <button
                disabled={!isLiveTransferEnabled || !selectedAccount || isSubmitting}
                onClick={() => setIsConfirmOpen(true)}
              >
                Execute On-Chain Transfer
              </button>
            </div>
          )}
        </div>

        {/* Typed Command Fallback */}
        <div className="card">
          <h2>Typed Command (Fallback)</h2>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr 2fr' }}>
            <div>
              <label>Amount</label>
              <input
                type="text"
                value={typedAmount}
                onChange={(e) => setTypedAmount(e.target.value)}
                placeholder="e.g., 1.25"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>Token</label>
              <input
                type="text"
                value={typedToken}
                onChange={(e) => setTypedToken(e.target.value.toUpperCase())}
                placeholder="WND"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label id="recipient-label">Recipient (name or address)</label>
              <div
                className="suggestions"
                role="combobox"
                aria-haspopup="listbox"
                aria-owns={listboxId}
                aria-expanded={showSuggestions}
              >
                <input
                  type="text"
                  role="textbox"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  aria-labelledby="recipient-label"
                  value={typedRecipient}
                  onChange={(e) => { setTypedRecipient(e.target.value); setActiveSuggestionIndex(-1); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={onRecipientKeyDown}
                  placeholder="Alice"
                  style={{ width: '100%' }}
                />
                {identiconAddress && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Identicon value={identiconAddress} size={24} theme="polkadot" />
                    <span style={{ fontSize: '0.85em', opacity: 0.8 }}>{identiconAddress.substring(0, 10)}...{identiconAddress.substring(identiconAddress.length - 8)}</span>
                  </div>
                )}
                {showSuggestions && currentSuggestions.length > 0 && (
                  <div id={listboxId} role="listbox" className="suggestions-list">
                    {currentSuggestions.map((s, idx) => (
                      <div
                        key={s.contact.address}
                        id={`recipient-option-${idx}`}
                        role="option"
                        aria-selected={idx === activeSuggestionIndex}
                        className="suggestions-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTypedRecipient(s.contact.name);
                          setShowSuggestions(false);
                          setActiveSuggestionIndex(-1);
                        }}
                        title={s.contact.address}
                      >
                        <strong>{s.contact.name}</strong>
                        <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
                          {s.contact.address.substring(0, 8)}...{s.contact.address.substring(s.contact.address.length - 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {typedErrors && <p style={{ color: 'orange', marginTop: '8px' }}>{typedErrors}</p>}
          <div style={{ marginTop: '10px' }}>
            <button disabled={!selectedAccount} onClick={openConfirmFromTyped}>Review and Confirm</button>
          </div>
        </div>

        {/* Confirmation Section */}
        {isConfirmOpen && parsedCommand && (
          <div className="card" style={{ borderColor: '#4a90e2' }}>
            <h2>Confirm Transfer</h2>
            <p><strong>From</strong>: {selectedAccount?.meta?.name} ({selectedAccount?.address})</p>
            <p><strong>To</strong>: {recognizedContact?.name} ({recognizedContact?.address})</p>
            <p><strong>Amount</strong>: {parsedCommand.amount} {parsedCommand.token}</p>
            <p>
              <strong>Estimated Fee</strong>: {isEstimatingFee ? 'Estimating...' : (estimateError ? `Error: ${estimateError}` : (estimatedFee || 'N/A'))}
            </p>
            {!hasSufficientBalance && (
              <p style={{ color: 'salmon' }}>Insufficient funds for amount + estimated fee.</p>
            )}
            {reapRiskWarning && (
              <p style={{ color: 'khaki' }}>{reapRiskWarning}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button disabled={isSubmitting || !hasSufficientBalance} onClick={() => { setIsConfirmOpen(false); executeOnChainTransfer(); }}>Confirm</button>
              <button disabled={isSubmitting} onClick={() => setIsConfirmOpen(false)}>Cancel</button>
              <button disabled={isSubmitting || isEstimatingFee} onClick={() => setIsConfirmOpen(true)}>
                Re-estimate
              </button>
            </div>
            {lastTxHash && <p style={{ marginTop: '10px' }}>Last Tx: {lastTxHash}</p>}
          </div>
        )}

        {/* Status Area */}
        {responseMessage && (
          <div className="card status-area">
            <p>Status: {responseMessage}</p>
          </div>
        )}

      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <ContactList />
      </div>
    </div>
  );
}

export default App;
