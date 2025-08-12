# EchoPay Development Guide

## Overview

This guide provides detailed information for developers working on the EchoPay project, including setup, development workflow, and contribution guidelines.

## Prerequisites

- Node.js 18+ and npm
- Git
- A Polkadot-compatible browser extension (SubWallet, Talisman, etc.)
- Basic knowledge of React, TypeScript, and Solidity

## Development Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd echopay
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Set `PRIVATE_KEY` to a test account private key
- Optionally customize RPC endpoints

### 3. Smart Contract Development

#### Compile Contracts
```bash
npx hardhat compile
```

#### Run Tests
```bash
npx hardhat test
```

#### Deploy to Local Network
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

#### Deploy to Moonbase Alpha
```bash
npx hardhat run scripts/deploy.js --network moonbaseAlpha
```

### 4. Backend Development

#### Start Development Server
```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:3001` with hot reloading.

#### API Endpoints

- `POST /api/process-command` - Process voice commands
- `GET /api/transactions` - Get transaction history
- `GET /api/health` - Health check

### 5. Frontend Development

#### Start Development Server
```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173` with hot reloading.

#### Development Scripts

```bash
# Run both frontend and backend
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend
npm run dev:backend

# Build frontend
npm run build
```

## Project Architecture

### Smart Contracts (`/contracts`)

- **EchoPayToken.sol**: ERC20 token with voice transfer functionality
- Features: Authorization system, voice transfer, minting capabilities

### Backend (`/backend`)

- **server.js**: Express server with command parsing and transaction simulation
- **Features**: Voice command parsing, mock transaction processing, REST API

### Frontend (`/frontend`)

- **App.tsx**: Main application component
- **ContactList.tsx**: Contact management component
- **Features**: Wallet connection, voice recognition, transaction display

## Development Workflow

### 1. Feature Development

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Implement your changes
3. Write/update tests
4. Test locally
5. Commit with descriptive messages
6. Push and create a pull request

### 2. Testing

#### Smart Contract Tests
```bash
npx hardhat test
npx hardhat test --grep "EchoPayToken"
```

#### Frontend Testing
```bash
cd frontend
npm run test
```

#### Backend Testing
```bash
cd backend
npm test
```

### 3. Code Quality

- Use ESLint for code linting
- Follow TypeScript best practices
- Write meaningful commit messages
- Include tests for new functionality

## Voice Command System

### Supported Commands

#### Payment Commands
- "Pay 10 to Alice"
- "Send 5.5 to Bob"
- "Transfer 100 to Charlie"

#### Balance Commands
- "Check balance"
- "Show balance"
- "What's my balance"

#### Transaction Commands
- "Show transactions"
- "Transaction history"
- "Recent payments"

### Adding New Commands

1. Update the `parseVoiceCommand` function in `backend/server.js`
2. Add new regex patterns
3. Implement command handling logic
4. Update tests
5. Update frontend to display new command types

## Smart Contract Development

### Adding New Functions

1. Define the function in the contract
2. Add appropriate access controls
3. Include input validation
4. Emit events for important actions
5. Write comprehensive tests
6. Update deployment scripts if needed

### Security Considerations

- Always validate inputs
- Use access control modifiers
- Implement proper error handling
- Test edge cases thoroughly
- Follow OpenZeppelin best practices

## Frontend Development

### Component Structure

- **App.tsx**: Main application logic and state management
- **ContactList.tsx**: Contact display and management
- **CSS Modules**: Styled components with modern design

### State Management

- React hooks for local state
- Context API for global state (if needed)
- Proper cleanup in useEffect hooks

### Wallet Integration

- Polkadot extension support
- Account selection and management
- Balance display and updates
- Error handling and user feedback

## Backend Development

### Command Parsing

The backend uses regex patterns to parse natural language commands into structured data:

```javascript
function parseVoiceCommand(command) {
  // Payment patterns
  const paymentPatterns = [
    /pay\s+(\d+(?:\.\d+)?)\s+(?:to\s+)?(\w+)/i,
    /send\s+(\d+(?:\.\d+)?)\s+(?:to\s+)?(\w+)/i
  ];
  
  // Implementation...
}
```

### Adding New Command Types

1. Define regex patterns
2. Add parsing logic
3. Implement command handling
4. Update response structure
5. Test with various inputs

## Testing Strategy

### Smart Contract Testing

- Unit tests for all functions
- Edge case testing
- Access control testing
- Event emission testing
- Integration testing

### Frontend Testing

- Component rendering tests
- User interaction tests
- Wallet integration tests
- Error handling tests

### Backend Testing

- API endpoint tests
- Command parsing tests
- Error handling tests
- Integration tests

## Deployment

### Local Development

```bash
# Start local blockchain
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev
```

### Testnet Deployment

```bash
# Deploy to Moonbase Alpha
npx hardhat run scripts/deploy.js --network moonbaseAlpha

# Update frontend configuration with contract addresses
# Start backend and frontend
```

## Troubleshooting

### Common Issues

1. **Wallet Connection Fails**
   - Check browser extension installation
   - Verify permissions are granted
   - Check console for error messages

2. **Smart Contract Compilation Errors**
   - Verify Solidity version compatibility
   - Check import paths
   - Ensure all dependencies are installed

3. **Voice Recognition Issues**
   - Check microphone permissions
   - Verify browser compatibility
   - Test with different browsers

4. **Backend Connection Issues**
   - Verify backend is running
   - Check CORS configuration
   - Verify API endpoint URLs

### Getting Help

- Check the console for error messages
- Review the test suite for examples
- Check the README for setup instructions
- Create an issue with detailed error information

## Contributing

### Code Style

- Use consistent formatting
- Follow existing naming conventions
- Include JSDoc comments for complex functions
- Write self-documenting code

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Submit a pull request with detailed description

### Review Process

- All PRs require review
- Tests must pass
- Code must meet quality standards
- Documentation must be updated

## Future Enhancements

### Planned Features

- AI-powered command parsing
- Cross-chain transaction support
- Advanced contact management
- Transaction scheduling
- Multi-language support

### Technical Improvements

- Performance optimization
- Enhanced error handling
- Better test coverage
- CI/CD pipeline
- Monitoring and logging

## Resources

- [Polkadot Documentation](https://docs.polkadot.network/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)