# Solana RWA Token Platform

A complete implementation for compliant Real World Asset (RWA) tokenization on Solana, built with Anchor Framework and Next.js. Create and manage security tokens with built-in KYC/AML compliance, transfer restrictions, and regulatory controls.

## 🎯 Features

### Smart Contracts (Rust + Anchor)

**Core Programs:**

| Program | Description | Program ID (Localnet) |
|---------|-------------|----------------------|
| **solana-rwa** | Main token program for RWA token management | `7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L` |
| **identity-registry** | On-chain identity verification and management | `3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5` |
| **compliance-aggregator** | Modular compliance rules enforcement | `EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT` |

**Operations:**
- `initialize()` - Register new compliant token
- `mint()` - Create new tokens (agents only)
- `burn()` - Destroy tokens permanently
- `transfer()` - Transfer between accounts
- `freeze_account()` / `unfreeze_account()` - Freeze/unfreeze accounts
- `add_agent()` / `remove_agent()` - Manage authorized agents

### Web Application (Next.js + Solana Web3)

- **Home Page** - Platform overview with feature cards
- **Deploy Page** - Create new tokens with customizable parameters
- **Manage Page** - Transfer, mint, burn, freeze tokens and manage agents
- **Wallet Integration** - Phantom, Solflare, Ledger, Trezor, Coinbase
- **Real-time Network Status** - Live slot number and connection status
- **Dark Futuristic Theme** - Glassmorphism, gradients, animations

## 📁 Project Structure

```
rwa/
├── sc/                    # Ethereum Smart Contracts (Legacy - ERC-3643)
│   ├── src/               # Solidity contracts
│   ├── test/              # Foundry tests
│   └── script/            # Deployment scripts
│
├── solana-rwa/            # Solana Smart Contracts (Anchor)
│   ├── programs/          # Rust programs
│   │   ├── solana-rwa/    # Main token program
│   │   ├── identity-registry/    # Identity management
│   │   └── compliance-aggregator # Compliance rules
│   ├── tests/             # Integration tests (TypeScript)
│   ├── Anchor.toml        # Anchor configuration
│   ├── Cargo.toml         # Rust workspace configuration
│   └── tsconfig.json      # TypeScript configuration
│
├── web/                   # Next.js Frontend Application
│   ├── src/
│   │   ├── app/           # App Router (Next.js 14)
│   │   │   ├── layout.tsx # Root layout with SolanaProvider
│   │   │   ├── page.tsx   # Home page
│   │   │   ├── deploy/    # Token deployment page
│   │   │   └── manage/    # Token management page
│   │   ├── components/    # React components
│   │   │   ├── WalletConnect.tsx      # Wallet connection
│   │   │   ├── NetworkStatus.tsx      # Network indicator
│   │   │   └── NotificationContainer.tsx # Notifications
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useTokenActions.ts     # Token operations
│   │   │   ├── useTokenState.ts       # Token state management
│   │   │   ├── useSolanaConnection.ts # Connection management
│   │   │   └── useWalletBalance.ts    # Balance tracking
│   │   ├── providers/     # React context providers
│   │   │   └── SolanaProvider.tsx     # Solana context
│   │   ├── anchor/        # Anchor client
│   │   │   └── client.ts              # Instruction builders
│   │   ├── config/        # Configuration
│   │   │   └── solana.ts              # Network & program IDs
│   │   ├── utils/         # Utility functions
│   │   │   └── solana.ts              # Solana helpers
│   │   └── app/globals.css  # Global styles (TailwindCSS v4)
│   ├── package.json       # Dependencies
│   └── tsconfig.json      # TypeScript configuration
│
├── docs/                  # Documentation
│   ├── USUARIO_GUIDE.md   # User-facing guide
│   ├── ARQUITECTURA.md    # Architecture with UML diagrams
│   └── DESPLIEGUE.md      # Deployment guide
│
├── README.md              # This file
└── deploy.sh              # Deployment automation script
```

## 🏗️ Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Frontend (Web)                     │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐  │  │
│  │  │   Home Page │ │ Deploy Page │ │    Manage Page          │  │  │
│  │  │  (Landing)  │ │  (Token)    │ │  (Transfer/Mint/Burn)   │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Shared Components                          │  │  │
│  │  │  WalletConnect │ NetworkStatus │ NotificationContainer │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Hooks Layer                                │  │  │
│  │  │  useTokenActions │ useTokenState │ useSolanaConnection  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ RPC HTTP (localhost:8899)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                             │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    System Program                              │  │
│  │              (Account Creation, Transfers)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ▲                                      │
│                              │                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Custom RWA Programs (Rust/Anchor)                 │  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐   │  │
│  │  │  solana-rwa    │  │identity-registry│ │compliance-     │   │  │
│  │  │  (Main Token)  │  │               │  │aggregator     │   │  │
│  │  └────────────────┘  └───────────────┘  └────────────────┘   │  │
│  │       │                        │                      │        │  │
│  │       └────────────────────────┴──────────────────────┘        │  │
│  │                            │                                    │  │
│  └────────────────────────────┼────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Application Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Opens App                     Frontend Loads                  │
│         │                                │                          │
│         ▼                                ▼                          │
│  ┌─────────────┐                  ┌──────────────┐                │
│  │  Home Page  │                  │ SolanaProvider│                │
│  │             │                  │  - QueryClient│                │
│  │  • Features │                  │  - Connection │                │
│  │  • Deploy   │                  │  - Wallets    │                │
│  │  • Manage   │                  └──────────────┘                │
│  └──────┬──────┘                        │                         │
│         │                               │                         │
│         ▼                               ▼                         │
│  ┌─────────────┐                  ┌──────────────┐                │
│  │ Connect     │                  │ NetworkStatus │                │
│  │ Wallet      │                  │ • Real-time   │                │
│  │             │                  │   slot #      │                │
│  └──────┬──────┘                  └──────────────┘                │
│         │                               │                         │
│         ▼                               ▼                         │
│  ┌─────────────┐                  ┌──────────────┐                │
│  │ Wallet      │◄────────────────│ useWallet     │                │
│  │ Adapter     │                  │ • publicKey   │                │
│  │             │                  │ • connected   │                │
│  └──────┬──────┘                  └──────────────┘                │
│         │                               │                         │
│         ▼                               ▼                         │
│  ┌─────────────────────────────────────────────────┐             │
│  │              PAGE ROUTING                       │             │
│  │                                                 │             │
│  │  /deploy    →  Token Deployment Form            │             │
│  │  /manage    →  Token Management Dashboard       │             │
│  └──────────┬──────────────────────────────────────┘             │
│             │                                                     │
│             ▼                                                     │
│  ┌─────────────────────────────────────────────────┐             │
│  │         TOKEN DEPLOYMENT FLOW                   │             │
│  │                                                 │             │
│  │  1. Fill Form (name, symbol, decimals)          │             │
│  │  2. Validate Inputs                             │             │
│  │  3. buildInitializeInstruction()                │             │
│  │  4. Create Transaction                          │             │
│  │  5. Sign with Wallet                            │             │
│  │  6. Send to RPC                                 │             │
│  │  7. Confirm on-chain                            │             │
│  │  8. Show Success + Transaction Hash             │             │
│  └──────────────────┬──────────────────────────────┘             │
│                     │                                             │
│                     ▼                                             │
│  ┌─────────────────────────────────────────────────┐             │
│  │         TOKEN MANAGEMENT FLOW                   │             │
│  │                                                 │             │
│  │  Transfer:  from → to → amount                  │             │
│  │  Mint:    agent → recipient → amount            │             │
│  │  Burn:    agent → from → amount                 │             │
│  │  Freeze:  agent → account                       │             │
│  │  Agent:   owner → add/remove agent              │             │
│  └──────────────────┬──────────────────────────────┘             │
│                     │                                             │
│                     ▼                                             │
│  ┌─────────────────────────────────────────────────┐             │
│  │         ON-CHAIN EXECUTION                      │             │
│  │                                                 │             │
│  │  Smart Contract (Anchor Program)                │             │
│  │  • Validate signer permissions                  │             │
│  │  • Check compliance rules                       │             │
│  │  • Update TokenState account                    │             │
│  │  • Emit events                                  │             │
│  └─────────────────────────────────────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Smart Contract Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TOKEN STATE ACCOUNT                             │
│                    (Main On-Chain Data)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TokenState                                                         │
│  ├── owner: Pubkey                 - Token owner                   │
│  ├── name: String                  - Token name (max 32 chars)     │
│  ├── symbol: String                - Token symbol (max 8 chars)    │
│  ├── decimals: u8                  - Decimals (0-18)               │
│  ├── total_supply: u64             - Total tokens minted           │
│  ├── next_index: u64               - Next balance index            │
│  │                                                               │
│  ├── balances: Vec<BalanceEntry>   - Account balances             │
│  │   ├── BalanceEntry { key, value }                              │
│  │   └── BalanceEntry { key, value }                              │
│  │                                                               │
│  ├── frozen_accounts: Vec<FrozenEntry> - Frozen accounts          │
│  │   ├── FrozenEntry { key, frozen: true }                        │
│  │   └── FrozenEntry { key, frozen: false }                       │
│  │                                                               │
│  ├── agents: Vec<Pubkey>           - Authorized agents            │
│  │   ├── Agent Pubkey #1                                          │
│  │   └── Agent Pubkey #2                                          │
│  │                                                               │
│  └── compliance_modules: Vec<Pubkey> - Active compliance rules    │
│      ├── Module Pubkey #1                                         │
│      └── Module Pubkey #2                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

| Software | Version | Installation Command |
|----------|---------|---------------------|
| **Rust** | latest | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Cargo** | latest | Comes with Rust |
| **Solana CLI** | v1.18+ | `sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"` |
| **Anchor CLI** | 0.30.x | `cargo install --git https://github.com/coral-xyz/anchor avm --locked` |
| **Node.js** | 18+ | `nvm install 18` |
| **npm** | 9+ | Comes with Node.js |
| **Git** | latest | `sudo apt install git` (Linux) |

### Quick Start (Recommended)

```bash
# 1. Navigate to the solana-rwa directory
cd solana-rwa

# 2. Start local Solana validator (in a separate terminal)
solana-test-validator --reset

# 3. Build and deploy smart contracts
anchor build
anchor deploy

# 4. Navigate to web directory
cd ../web

# 5. Install dependencies
npm install

# 6. Create environment file
cp .env.local.example .env.local

# 7. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Detailed Setup

#### Step 1: Install Solana Tool Suite

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Verify installation
solana --version
```

#### Step 2: Install Anchor Framework

```bash
# Install Anchor Version Manager
cargo install --git https://github.com/coral-xyz/anchor avm --locked

# Install Anchor 0.30.x
avm install 0.30.1
avm use 0.30.1

# Verify installation
anchor --version
```

#### Step 3: Clone and Configure Project

```bash
# Clone the repository
git clone <repository-url>
cd rwa

# Install frontend dependencies
cd web
npm install
cd ..

# Install solana-rwa dependencies
cd solana-rwa
npm install
cd ..
```

#### Step 4: Configure Environment

```bash
# Create .env.local in the web directory
cd web
cat > .env.local << EOF
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=localnet
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=http://localhost:8899

# Program IDs (Localnet)
NEXT_PUBLIC_SOLANA_RWA_PROGRAM_ID=7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L
NEXT_PUBLIC_IDENTITY_REGISTRY_PROGRAM_ID=3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5
NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_PROGRAM_ID=EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT
EOF
```

#### Step 5: Start Local Blockchain

```bash
# In a new terminal, start the local validator
cd solana-rwa
solana-test-validator --reset
```

This starts:
- RPC endpoint: `http://localhost:8899`
- WebSocket: `ws://localhost:8899`
- 8 validator nodes
- Faucet for testing SOL

#### Step 6: Deploy Smart Contracts

```bash
# In the solana-rwa directory (validator must be running)
anchor build
anchor deploy
```

This deploys all three programs:
1. `solana-rwa` - Main token program
2. `identity-registry` - Identity management
3. `compliance-aggregator` - Compliance rules

#### Step 7: Start Frontend

```bash
# In a new terminal
cd web
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Wallet Configuration

For local development, configure your wallet to connect to localhost:

**Phantom Wallet:**
1. Open Phantom extension
2. Go to Settings → Developer → Custom RPC
3. Set URL: `http://localhost:8899`
4. Set Network: `Custom`

**Solflare Wallet:**
1. Open Solflare extension
2. Go to Settings → Network
3. Select `Custom RPC`
4. Set URL: `http://localhost:8899`

### Getting Test SOL

```bash
# Request airdrop to your wallet (localnet)
solana airdrop 100  # 100 SOL to default wallet

# Or use a specific keypair
solana airdrop 100 --keypair /path/to/keypair.json
```

## 📖 Usage Guide

### Deploying a Token

1. Connect your wallet using the "Connect Wallet" button
2. Navigate to the Deploy page
3. Fill in the token configuration:
   - **Token Name**: e.g., "Real Estate Token"
   - **Symbol**: e.g., "RET"
   - **Decimals**: 9 (default)
   - **Initial Supply**: Optional (can mint later)
4. Click "Deploy Token"
5. Confirm the transaction in your wallet
6. Wait for confirmation (~10-30 seconds)

### Managing Tokens

After deployment, use the Manage page to:

| Action | Permission | Description |
|--------|-----------|-------------|
| **Transfer** | Anyone | Send tokens to another address |
| **Mint** | Agent only | Create new tokens |
| **Burn** | Agent only | Destroy tokens permanently |
| **Freeze** | Agent only | Freeze an account (blocks transfers) |
| **Add Agent** | Owner only | Add authorized agent |
| **Remove Agent** | Owner only | Remove authorized agent |

## 🔒 Security Features

- **Role-Based Access Control** - Owner and Agent roles with distinct permissions
- **Account Freezing** - Freeze non-compliant accounts
- **Balance Tracking** - On-chain balance management
- **Address Validation** - Client-side Solana address validation
- **Transaction Signing** - All transactions signed via wallet
- **Compliance Modules** - Extensible compliance framework

## 🧪 Testing

### Smart Contract Tests (Rust)

```bash
cd solana-rwa

# Start test validator
solana-test-validator --reset

# Run Anchor tests
anchor test

# Or use TypeScript tests
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
```

### Frontend

```bash
cd web

# Run linting
npm run lint

# Build (verifies TypeScript)
npm run build
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [USUARIO_GUIDE.md](docs/USUARIO_GUIDE.md) | User-facing guide with step-by-step instructions |
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | Technical architecture with UML diagrams |
| [DESPLIEGUE.md](docs/DESPLIEGUE.md) | Detailed deployment guide with troubleshooting |

## 🛠️ Tech Stack

### Smart Contracts
- **Language**: Rust
- **Framework**: Anchor 0.30.x
- **Testing**: Anchor Test Framework + TypeScript Mocha

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19
- **Styling**: TailwindCSS v4
- **Wallet**: @solana/wallet-adapter
- **State**: @tanstack/react-query
- **Blockchain**: @solana/web3.js

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SOLANA_NETWORK` | Target network | `localnet` |
| `NEXT_PUBLIC_SOLANA_RPC_ENDPOINT` | RPC URL | `http://localhost:8899` |
| `NEXT_PUBLIC_SOLANA_RWA_PROGRAM_ID` | Main token program ID | See Anchor.toml |
| `NEXT_PUBLIC_IDENTITY_REGISTRY_PROGRAM_ID` | Identity registry program ID | See Anchor.toml |
| `NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_PROGRAM_ID` | Compliance aggregator program ID | See Anchor.toml |

## 🚦 Network Configuration

| Network | RPC URL | Explorer |
|---------|---------|----------|
| **Localnet** | `http://localhost:8899` | Local |
| **Devnet** | `https://api.devnet.solana.com` | [explorer.solana.com](https://explorer.solana.com/?cluster=devnet) |
| **Mainnet** | `https://api.mainnet-beta.solana.com` | [explorer.solana.com](https://explorer.solana.com/) |

## 📄 License

MIT

## 🤝 Contributing

This project is for educational and demonstration purposes. For production use:

1. Conduct a professional security audit
2. Ensure legal compliance with local regulations
3. Implement proper key management
4. Add multi-signature support for critical operations
5. Set up monitoring and alerting

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| Smart Contracts | 3 Anchor programs |
| Frontend Pages | 3 (Home, Deploy, Manage) |
| Supported Wallets | 5+ (Phantom, Solflare, Ledger, etc.) |
| Transaction Time | < 1 second |
| Average Fee | < $0.01 |

---

**Built with Anchor Framework & Next.js on Solana Blockchain**
