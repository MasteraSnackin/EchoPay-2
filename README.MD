# EchoPay
A voice-activated payment application using MetaMask and Web3.js.
# EchoPay

EchoPay is a voice-activated Ethereum transaction application that interacts with the Moonbase Alpha network (a test network for the Moonbeam blockchain). It allows users to send transactions and check balances using voice commands.

## Features

- **Voice Command Recognition**: Captures and processes voice commands using the Web Speech API.
- **Command Confirmation**: Confirms commands with the user before execution.
- **MetaMask Integration**: Connects to MetaMask and ensures the correct network (Moonbase Alpha).
- **Moonbase Alpha Transactions**: Sends transactions and provides transaction feedback.
- **Balance Checking**: Checks and displays Moonbase Alpha balances.
- **Natural Language Processing**: Parses commands to extract actionable information.

## Prerequisites

- Node.js and npm
- MetaMask extension installed in your browser

## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/echopay.git
    cd echopay
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:
    Create a `.env` file in the root directory with your private key:
    ```env
    PRIVATE_KEY=your-private-key-here
    ```

4. **Install Hardhat and set up the project**:
    ```bash
    npx hardhat
    ```

5. **Compile the smart contracts**:
    ```bash
    npx hardhat compile
    ```

6. **Deploy the smart contracts to Moonbase Alpha**:
    ```bash
    npx hardhat run scripts/deploy.js --network moonbaseAlpha
    ```

## Project Structure
echopay/
├── contracts/
│ └── SimpleToken.sol
├── scripts/
│ └── deploy.js
├── src/
│ ├── constants.js
│ ├── index.html
│ └── script.js
├── .env
├── hardhat.config.js
├── package.json
└── node_modules/

### `contracts/SimpleToken.sol`

A simple ERC-20 token contract.

### `scripts/deploy.js`

Script to deploy the `SimpleToken` contract.

### `src/constants.js`

Defines constants for network IDs and RPC URLs.

### `src/index.html`

Provides the HTML structure for the frontend.

### `src/script.js`

Contains the JavaScript logic for interacting with MetaMask and handling voice commands.

### `.env`

Stores environment variables such as private keys.

### `hardhat.config.js`

Configures the Hardhat environment.

### `package.json`

Manages your project's dependencies and scripts.

## Usage

1. **Start a local server**:
    You can use a simple HTTP server to serve your application. If you have Python installed, you can run:
    ```bash
    python -m http.server
    ```
    Open your browser and navigate to `http://localhost:8000`.

2. **Open MetaMask**:
    Make sure MetaMask is open and connected to the Moonbase Alpha network.

3. **Start Voice Recognition**:
    Click the "Start Recording" button to begin using voice commands to interact with the application.

## Commands

- **Check Balance**:
    - To check the balance of your own account: "Check my balance."
    - To check the balance of a specific address: "Check balance of 0xYourEthereumAddress."
  
- **Send Transaction**:
    - To send a transaction: "Send 1 Ether to 0xRecipientAddress."

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Hardhat](https://hardhat.org/)
- [Web3.js](https://web3js.readthedocs.io/)
- [Moonbeam](https://moonbeam.network/)
