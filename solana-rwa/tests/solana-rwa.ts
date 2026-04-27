// =============================================================================
// Solana RWA Program - Main Test Entry Point
// =============================================================================
// This file orchestrates all test suites for the Solana RWA program.
// All individual test files are imported here to be executed by Mocha.
//
// Test Suites:
// - token-program.ts: Core token program functionality tests
// - security/solana-rwa-security.ts: Security tests for solana-rwa program
// - security/compliance-aggregator-security.ts: Security tests for compliance-aggregator
// - security/identity-registry-security.ts: Security tests for identity-registry
// - security/pda-enforcement.ts: PDA enforcement security tests
// - cross-program-consistency.ts: Cross-program consistency tests
// - api-consistency.ts: API consistency tests
// - idl-consistency.ts: IDL consistency tests
// - frontend-integration.ts: Frontend-backend integration tests
// =============================================================================

import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Configure the provider
const provider = AnchorProvider.env();
anchor.setProvider(provider);

// Increase timeout for all tests (some tests take a long time)
anchor.setProvider(provider);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Airdrop SOL to test accounts
 */
async function airdropIfNeeded(kp: anchor.web3.Keypair, amount = 100) {
  const balance = await provider.connection.getBalance(kp.publicKey);
  if (balance < 1 * LAMPORTS_PER_SOL) {
    const sig = await provider.connection.requestAirdrop(kp.publicKey, amount * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);
  }
}

// =============================================================================
// Main Test Suite
// =============================================================================

describe('Solana RWA Program Suite', function () {
  // Set timeout for all tests in this suite
  this.timeout(120000);

  // Log test suite initialization
  console.log('='.repeat(70));
  console.log('Solana RWA Program - Complete Test Suite');
  console.log('='.repeat(70));
  console.log(`Program ID: ${anchor.workspace.SolanaRwa?.programId.toString() || 'Not loaded'}`);
  console.log('='.repeat(70));

  // =============================================================================
  // Import and run all test suites
  // =============================================================================

  // Core functionality tests
  require('./token-program');

  // Security tests
  require('./security/solana-rwa-security');
  require('./security/compliance-aggregator-security');
  require('./security/identity-registry-security');
  require('./security/pda-enforcement');

  // Cross-program and consistency tests
  require('./cross-program-consistency');
  require('./api-consistency');
  require('./idl-consistency');

  // Frontend integration tests
  require('./frontend-integration');
});
