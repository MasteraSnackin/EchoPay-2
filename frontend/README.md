# EchoPay Frontend

A React-based frontend for the EchoPay voice-controlled cryptocurrency payment system.

## Features

- **Voice Command Processing**: Use voice commands to create cryptocurrency transactions
- **Polkadot Wallet Integration**: Connect with Polkadot.js compatible wallets
- **Real-time Transaction Management**: Monitor transaction status and history
- **AI-Powered Command Parsing**: Intelligent voice command interpretation
- **Responsive Design**: Modern UI with Tailwind CSS

## Prerequisites

- Node.js 18+ 
- Polkadot.js browser extension (SubWallet, Talisman, etc.)
- EchoPay Worker running (for voice processing)
- EchoPay Backend running (for blockchain operations)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Update `src/config.ts` with your Worker and Backend URLs
   - Set production URLs when deploying

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   Navigate to `http://localhost:5173`

## Configuration

Edit `src/config.ts` to customize:

- **Worker URL**: Your Cloudflare Worker endpoint
- **Backend URL**: Your backend server endpoint  
- **Polkadot Network**: RPC endpoint and chain settings
- **Voice Settings**: Speech recognition configuration
- **UI Settings**: Timeouts and refresh intervals

## Usage

### 1. Connect Wallet
- Click "Connect Wallet" 
- Select your Polkadot account
- Verify wallet ownership

### 2. Voice Commands
- Click "Start Listening" or type commands manually
- Say commands like:
  - "Pay 50 DOT to Alice"
  - "Send 100 DOT to 5F...abc"
  - "Transfer 25 DOT to Bob"

### 3. Transaction Processing
- Commands are processed by AI Worker
- Transactions created in backend
- Monitor status in transaction history

### 4. Voice Confirmation
- Confirm transactions with voice
- Say "Yes" or "No" when prompted
- Automatic timeout for security

## Architecture

```
Frontend → Worker (Voice Processing) → Backend (Blockchain) → Polkadot Network
```

- **Frontend**: React UI with voice recognition
- **Worker**: ElevenLabs STT + AI command parsing
- **Backend**: Transaction creation and blockchain submission
- **Polkadot**: Final transaction execution

## Development

### Project Structure
```
src/
├── App.tsx          # Main application component
├── config.ts        # Configuration and constants
├── ContactList.tsx  # Contact management component
├── App.css          # Main styles
└── main.tsx         # Application entry point
```

### Key Components
- **Wallet Management**: Polkadot extension integration
- **Voice Processing**: Web Speech API + Worker integration
- **Transaction Flow**: Command → Parse → Create → Execute
- **State Management**: React hooks for application state

### Testing
- **E2E Mode**: Add `?testMode=1` to URL for testing without wallet
- **Manual Input**: Type commands for accessibility and testing
- **Error Handling**: Comprehensive error states and user feedback

## Deployment

1. **Build for production**:
   ```bash
   npm run build
   ```

2. **Deploy to your hosting service**:
   - Vercel, Netlify, or static hosting
   - Update production URLs in config

3. **Environment variables**:
   - Set `NODE_ENV=production`
   - Configure Worker and Backend URLs

## Troubleshooting

### Common Issues
- **Wallet Connection**: Ensure Polkadot extension is installed and enabled
- **Voice Recognition**: Check browser compatibility and microphone permissions
- **Network Errors**: Verify Worker and Backend URLs are correct
- **Transaction Failures**: Check wallet balance and network status

### Debug Mode
- Open browser console for detailed logs
- Check Network tab for API calls
- Verify environment configuration

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details
