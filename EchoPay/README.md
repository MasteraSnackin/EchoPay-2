# EchoPay Project

This repository contains the EchoPay project, which includes several components: a backend service, multiple frontend applications, and a Polkadot-based voice payment proof-of-concept.

## Project Structure

```
EchoPay/
├── backend/                 # Node.js backend service
│   ├── server.js
│   └── package.json
├── docs/                    # Documentation files
│   └── README.md
├── EchoPay/                 # Original Vite React TS frontend (?)
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
├── frontend/                # Another Vite React TS frontend (?)
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
├── payment_recorder_contract/ # Polkadot ink! Smart Contract
│   └── payment_recorder/
│       ├── lib.rs
│       └── Cargo.toml
├── voice-payment-frontend/  # Frontend for Polkadot Voice Payment PoC
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
├── README.md                # This file
└── ... (other config files)
```

## Components

### 1. Backend (`backend/`)

*   **Technology:** Node.js
*   **Description:** Contains a simple backend service (`server.js`). (Further details about its purpose and API should be added here).
*   **To Run:**
    ```bash
    cd backend
    npm install
    node server.js # Or npm start if defined in package.json
    ```

### 2. EchoPay Frontend (`EchoPay/`)

*   **Technology:** React + TypeScript + Vite
*   **Description:** Appears to be the original frontend application. (Further details about its purpose should be added here).
*   **To Run:**
    ```bash
    cd EchoPay
    npm install
    npm run dev
    ```

### 3. Frontend (`frontend/`)

*   **Technology:** React + TypeScript + Vite
*   **Description:** Another frontend application. (Clarification needed on its purpose relative to `EchoPay/`).
*   **To Run:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

### 4. Polkadot Voice Payment Proof-of-Concept

This is a demonstration of initiating and recording Polkadot (DOT) payments using voice commands. It consists of a smart contract and a dedicated frontend.

####    a. Smart Contract (`payment_recorder_contract/`)

*   **Technology:** Rust / Polkadot `ink!` Framework
*   **Purpose:** An on-chain program deployed to a Polkadot-compatible network (local node or testnet). Its sole function is to *record* payment details (sender, recipient, amount, timestamp) provided by the frontend. It **does not** hold funds or initiate transfers itself.
*   **Key Files:** `payment_recorder/lib.rs` (contract logic).
*   **Prerequisites:** Rust toolchain, `cargo-contract` CLI.
*   **Build:**
    ```bash
    cd payment_recorder_contract/payment_recorder
    cargo contract build
    ```
    *(Output artifacts are in `target/ink/`)*

####    b. Voice Payment Frontend (`voice-payment-frontend/`)

*   **Technology:** React + TypeScript + Vite
*   **Purpose:** Provides the UI to interact with the voice payment system. It connects to a Polkadot node and browser wallet (e.g., SubWallet), uses the Web Speech API for voice input, parses commands, initiates the actual DOT transfer via the user's wallet, and then calls the smart contract to record the transaction details.
*   **Prerequisites:** Node.js, npm, a Polkadot-compatible browser wallet extension.
*   **Setup:**
    ```bash
    cd voice-payment-frontend
    npm install
    # **IMPORTANT:** Copy payment_recorder.contract from the contract's target/ink/ dir
    # into voice-payment-frontend/src/ AND rename it to payment_recorder.contract.json
    cp ../payment_recorder_contract/payment_recorder/target/ink/payment_recorder.contract ./src/payment_recorder.contract.json

    # **IMPORTANT:** Edit src/App.tsx and replace 'YOUR_CONTRACT_ADDRESS_HERE'
    # with the actual address of the deployed smart contract.
    ```
*   **Run:**
    ```bash
    # Ensure local node is running and contract is deployed (see below)
    cd voice-payment-frontend
    npm run dev
    ```

## Running the Polkadot Voice Payment PoC (Local Development)

1.  **Install Prerequisites:**
    *   Node.js, npm, Rust, `cargo-contract`.
    *   Install `substrate-contracts-node`: Follow the [official guide](https://use.ink/getting-started/setup#installing-substrate-contracts-node) or use:
        ```bash
        cargo install contracts-node --git https://github.com/paritytech/substrate-contracts-node.git --tag v0.34.0 --force --locked
        ```
    *   Install a browser wallet extension (e.g., SubWallet).

2.  **Start Local Node:**
    *   Open a terminal:
        ```bash
        substrate-contracts-node --dev --tmp
        ```
    *   Keep this terminal running.

3.  **Build Smart Contract:**
    *   Open another terminal:
        ```bash
        cd payment_recorder_contract/payment_recorder
        cargo contract build
        ```

4.  **Deploy Smart Contract:**
    *   In the same terminal as step 3:
        ```bash
        cargo contract upload_and_instantiate --suri //Alice --contract target/ink/payment_recorder.contract --args --skip-confirm
        ```
    *   **Copy the `Contract Address`** from the output (e.g., `5EXAMPLE...`).

5.  **Configure & Run Frontend:**
    *   Copy the metadata file:
        ```bash
        # From the EchoPay root directory:
        cp payment_recorder_contract/payment_recorder/target/ink/payment_recorder.contract voice-payment-frontend/src/payment_recorder.contract.json
        ```
    *   Edit `voice-payment-frontend/src/App.tsx`: Replace `YOUR_CONTRACT_ADDRESS_HERE` with the copied contract address.
    *   Install frontend dependencies:
        ```bash
        cd voice-payment-frontend
        npm install
        ```
    *   Run the frontend:
        ```bash
        npm run dev
        ```
    *   Open the localhost URL (e.g., `http://localhost:5173`) in your browser. Configure your wallet extension to connect to the local node (`ws://127.0.0.1:9944`).

## Usage (Voice Payment Frontend)

1.  Ensure the local node is running.
2.  Open the frontend app in your browser.
3.  Connect your wallet and select an account (e.g., Alice).
4.  Click "Record Payment Command", allow microphone access.
5.  Speak a command like: "Pay 5 DOT to 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY".
6.  The app will parse the command.
7.  Your wallet extension will pop up **twice**:
    *   First, to confirm the actual DOT transfer (`balances.transferKeepAlive`).
    *   Second, to confirm the transaction calling the smart contract's `record_payment` function.
8.  Check the status messages in the app.
9.  Click "Fetch My History" to see recorded payments for the selected account.
