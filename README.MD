# EchoPay: Voice-Activated Cross-Chain Payment System (Proof of Concept)

EchoPay is an innovative payment platform concept enabling users to conduct secure, cross-chain transactions through voice commands. This repository contains the initial proof-of-concept implementation focusing on the frontend interface, wallet connection, and voice input simulation.

Demo: https://www.youtube.com/watch?v=lrFvO2qnxU0

## Overview (Vision)

By integrating advanced AI voice recognition with Polkadot’s blockchain infrastructure, EchoPay aims to eliminate traditional payment friction while prioritizing accessibility, security, and interoperability. The ultimate goal is to allow users to execute transactions via natural language (e.g., “Pay 50 DOT to Alice on Ethereum”).

*(Note: The AI/ML layer and actual blockchain transaction signing/cross-chain functionality are **not** implemented in this current PoC).*

## Features (Current Implementation)

*   **React Frontend:** User interface built with React and Vite (TypeScript).
*   **Wallet Connection:** Connects to Polkadot JS compatible browser extensions (e.g., SubWallet, Talisman) using `@polkadot/extension-dapp`.
*   **Account Selection:** Lists accounts from the connected extension and allows selection.
*   **Balance Display:** Shows the selected account's balance by querying the Westend testnet using `@polkadot/api`.
*   **Voice Input:** Uses the browser's Web Speech API to capture voice commands.
*   **Manual Processing Trigger:** Requires clicking a button to process the recognized voice command (currently sends to a mock backend).
*   **Mock Backend:** A simple Node.js/Express server that simulates receiving and acknowledging commands.
*   **Contact List:** Displays a static, hardcoded list of contacts in a sidebar.
*   **Disconnect:** Allows disconnecting the wallet within the application's state.

## Tech Stack

*   **Frontend:** React, Vite, TypeScript, CSS
*   **Blockchain Interaction (Client-side):** `@polkadot/api`, `@polkadot/extension-dapp`, `@polkadot/util`
*   **Voice Input:** Web Speech API (Browser-native)
*   **Mock Backend:** Node.js, Express, CORS


Technical consideration regarding how smart contract work on polkadot
![Technical consideration regarding how smart contract work on polkadot
](docs/Screenshot%202025-04-19%20174748.png)

Smart Contract Plan (ink!)
![Smart Contract Plan (ink!)](docs/Screenshot%202025-04-19%20175055.png)

Summary of Workflow:
![Summary of Workflow:](docs/Screenshot%202025-04-19%20175150.png)


## Project Structure

```
.
├── backend/         # Mock Node.js backend server
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── docs/            # Original project description
│   └── README.md
├── frontend/        # React frontend application
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── ContactList.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .gitignore       # (Optional: Add a root gitignore if needed)
└── README.md        # This file
```

## Setup and Running

**Prerequisites:**

*   Node.js (v18 or later recommended)
*   npm (usually comes with Node.js)
*   A Polkadot JS compatible browser extension (e.g., SubWallet, Talisman) installed in your browser.
*   An account within the extension, preferably funded on the **Westend testnet** (for balance display).

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```
3.  **Install Frontend Dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```
4.  **Run Backend Server:**
    *   Open a terminal in the `backend` directory.
    *   Run: `node server.js`
    *   *(Expected output: `Mock backend server listening at http://localhost:3001`)*
5.  **Run Frontend Development Server:**
    *   Open a *separate* terminal in the `frontend` directory.
    *   Run: `npm run dev`
    *   Open the URL provided (usually `http://localhost:5173`) in your browser.

**Using the App:**

1.  Click "Connect Wallet" and approve the connection request in your browser extension.
2.  Select an account from the dropdown (balance from Westend should appear).
3.  Click "Start Listening", grant microphone permission if requested, and speak a command (e.g., "Pay 1 WND to Bob").
4.  Click "Process Command (Mock)" to send the recognized text to the mock backend.
5.  Observe the status updates.
6.  Use the "Disconnect Wallet" button to clear the app's connection state.

## Current Status & Future Work

This is a proof-of-concept demonstrating the basic UI flow and integration points.

**Next Steps / Potential Improvements:**

*   **Actual Transaction Signing:** Integrate `@polkadot/extension-dapp` signer to sign real transactions based on voice commands.
*   **Backend Logic:** Replace the mock backend with actual logic to parse commands and construct transactions.
*   **AI/ML Integration:** Integrate a real voice processing pipeline (like the envisioned Gemma model) to parse natural language commands into structured transaction data.
*   **Parachain/Smart Contract:** Connect to the actual EchoPay parachain runtime or smart contracts on Westend/Polkadot.
*   **Dynamic Contact List:** Fetch contacts from on-chain storage, user settings, or other sources.
*   **Error Handling:** More robust error handling and user feedback.
*   **UI/UX Refinements:** Improve the overall user experience.

UPDATE:
*  Colour scheme
*  GUI interefe from CLI
*  Link to subWallet / Acitivation 
*  Animation for loading
*  Better Layout
*  Better AI for voice input
*  Create dedicated status message area
*  Responsive layout (stacking columns)
*  Can now read the balance from wallet 
*  By signing out of wallet from echo pay doesn't sign up or lock you out of subwallet
*  Let you select multiple wallet
*  Moved off moonbase network


