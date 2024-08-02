// Import external libraries and constants
import compromise from 'compromise';
import Web3 from 'web3';
import { MOONBASE_ALPHA_NETWORK_ID, MOONBASE_ALPHA_RPC_URL } from './constants.js';

// Enhanced speech recognition setup
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.onstart = () => updateStatus("Listening for your command...");
recognition.onspeechend = () => {
    updateStatus("Processing...");
    recognition.stop();
};
recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    confirmAndProcessCommand(transcript);
};

// Function to update status message
function updateStatus(message) {
    document.getElementById("status").textContent = message;
}

// Function to confirm command with user
function confirmAndProcessCommand(transcript) {
    const confirmMessage = `Did you say: ${transcript}?`;
    if (confirm(confirmMessage)) {
        processCommand(transcript);
    } else {
        updateStatus("Command cancelled.");
    }
}

// Initialize Web3 and connect to MetaMask
async function initializeWeb3() {
    try {
        const provider = await detectEthereumProvider();
        if (!provider) {
            throw new Error("MetaMask is not installed. Please install MetaMask and try again.");
        }

        const web3 = new Web3(provider);
        await provider.request({ method: 'eth_requestAccounts' });

        const networkId = await web3.eth.net.getId();
        if (networkId !== MOONBASE_ALPHA_NETWORK_ID) {
            throw new Error("Please switch to the Moonbase Alpha network in MetaMask.");
        }

        return web3;
    } catch (error) {
        updateStatus(error.message);
        throw error;
    }
}

// Process Commands
async function processCommand(command) {
    try {
        const web3 = await initializeWeb3();
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];

        const { amount, recipient, action } = parseCommand(command);

        if (action === "check balance") {
            await checkBalance(web3, account, recipient);
        } else if (amount && recipient) {
            await initiatePurchaseTransaction(web3, account, recipient, amount);
        } else {
            updateStatus("Invalid command.");
        }
    } catch (error) {
        updateStatus(`Error: ${error.message}`);
    }
}

// Parse the command to extract amount, recipient, and action
function parseCommand(command) {
    const doc = compromise(command);
    const amount = doc.match('#Number').text();
    const recipient = doc.match('#Hash').text();
    const action = doc.match('check balance').found ? 'check balance' : null;
    return { amount, recipient, action };
}

// Check balance of an account
async function checkBalance(web3, account, recipient) {
    try {
        const balance = await web3.eth.getBalance(recipient || account);
        const etherBalance = web3.utils.fromWei(balance, 'ether');
        updateStatus(`Balance: ${etherBalance} DEV`);
    } catch (error) {
        updateStatus(`Failed to check balance: ${error.message}`);
    }
}

// Initiate purchase transaction
async function initiatePurchaseTransaction(web3, account, recipient, amount) {
    try {
        const weiAmount = web3.utils.toWei(amount, 'ether');
        if (web3.utils.isAddress(recipient)) {
            updateStatus("Initiating purchase transaction...");
            sendTransaction(web3, account, recipient, weiAmount);
        } else {
            updateStatus("Invalid address format.");
        }
    } catch (error) {
        updateStatus(`Failed to initiate purchase transaction: ${error.message}`);
    }
}

// Send the transaction
function sendTransaction(web3, from, to, value) {
    web3.eth.sendTransaction({ from, to, value })
        .on('transactionHash', (hash) => {
            updateStatus(`Transaction sent! Hash: ${hash}`);
            waitForTransactionReceipt(web3, hash);
        })
        .on('error', (error) => updateStatus(`Error: ${error.message}`));
}

// Wait for transaction receipt
async function waitForTransactionReceipt(web3, hash) {
    try {
        let receipt = null;
        while (receipt === null) {
            receipt = await web3.eth.getTransactionReceipt(hash);
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 second
        }
        if (receipt.status) {
            updateStatus("Purchase transaction confirmed!");
        } else {
            updateStatus("Purchase transaction failed.");
        }
    } catch (error) {
        updateStatus(`Error while waiting for transaction receipt: ${error.message}`);
    }
}

// Start Voice Recognition
document.getElementById("start-record-btn").addEventListener("click", () => recognition.start());