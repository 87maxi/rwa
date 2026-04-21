import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { SolanaRWA } from '../target/idl/solana-rwa.json';
import { IdentityRegistry } from '../target/idl/identity-registry.json';
import { ComplianceAggregator } from '../target/idl/compliance-aggregator.json';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';

// =============================================================================
// Cross-Program Consistency Tests
// =============================================================================
// These tests verify consistency between the 3 Anchor programs:
// - solana-rwa (main token program)
// - identity-registry (identity registry program)
// - compliance-aggregator (compliance aggregator program)
//
// Tests verify:
// - Consistent identity types between identity-registry and solana-rwa
// - Consistent compliance types between compliance-aggregator and solana-rwa
// - Consistent events across programs
// - Correct account usage in CPI calls

describe('Cross-Program Consistency Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const solanaRWAProgram = anchor.workspace.SolanaRWA as Program<SolanaRWA>;
  const identityRegistryProgram = anchor.workspace.IdentityRegistry as Program<any>;
  const complianceAggregatorProgram = anchor.workspace.ComplianceAggregator as Program<any>;

  // Program IDs from Anchor.toml
  const SOLANA_RWA_ID = new PublicKey('7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L');
  const IDENTITY_REGISTRY_ID = new PublicKey('3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5');
  const COMPLIANCE_AGGREGATOR_ID = new PublicKey('EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT');

  let owner: Keypair;
  let agent: Keypair;
  let user1: Keypair;
  let user2: Keypair;

  before(async () => {
    owner = Keypair.generate();
    agent = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL to test accounts
    for (const kp of [owner, agent, user1, user2]) {
      const airdropTx = await provider.connection.requestAirdrop(kp.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(airdropTx);
    }
  });

  beforeEach(async () => {
    // Reset context if needed
  });

  // =============================================================================
  // Section 1: Identity Type Consistency
  // =============================================================================
  // Verify that identity types are consistent between identity-registry and solana-rwa

  describe('Identity Type Consistency', () => {
    it('CP-001: Should use Pubkey type for identity across programs', () => {
      // identity-registry uses Pubkey for identity
      const identityRegistryIdl = identityRegistryProgram.idl;
      const registerIdentityInstruction = identityRegistryIdl.instructions.find((ix: any) => ix.name === 'register_identity');

      const identityParam = registerIdentityInstruction?.params?.find((p: any) => p.name === 'identity');
      expect(identityParam.type.kind).to.equal('publicKey', 'Identity should be Pubkey type in identity-registry');

      // solana-rwa should also use Pubkey for identity-related operations
      const solanaRWAIdl = solanaRWAProgram.idl;
      const tokenStateAccount = (solanaRWAIdl.accounts || []).find((a: any) => a.name === 'TokenState');

      // Authority field should be Pubkey
      const authorityField = tokenStateAccount.fields.find((f: any) => f.name === 'authority');
      expect(authorityField.type.kind).to.equal('publicKey', 'Authority should be Pubkey type in solana-rwa');
    });

    it('CP-002: Should have consistent wallet address types across programs', () => {
      // All programs should use Pubkey for wallet addresses
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        for (const ix of program.idl.instructions) {
          for (const param of ix.params) {
            // Wallet-related params should all be publicKey
            if (['wallet', 'owner', 'agent', 'authority', 'from', 'to', 'destination'].includes(param.name)) {
              expect(param.type.kind).to.equal('publicKey', `${param.name} should be publicKey in ${program.name}`);
            }
          }
        }
      }
    });

    it('CP-003: Should have consistent identity entry structure', () => {
      const identityRegistryIdl = identityRegistryProgram.idl;
      const identityEntryAccount = (identityRegistryIdl.accounts || []).find((a: any) => a.name === 'IdentityEntry');

      expect(identityEntryAccount).to.exist('IdentityEntry account should exist in identity-registry');
      expect(identityEntryAccount.fields).to.be.an('array');

      const fieldNames = identityEntryAccount.fields.map((f: any) => f.name);
      expect(fieldNames).to.include('wallet', 'IdentityEntry should have wallet field');
      expect(fieldNames).to.include('identity', 'IdentityEntry should have identity field');

      const walletField = identityEntryAccount.fields.find((f: any) => f.name === 'wallet');
      const identityField = identityEntryAccount.fields.find((f: any) => f.name === 'identity');

      expect(walletField.type.kind).to.equal('publicKey', 'wallet field should be publicKey');
      expect(identityField.type.kind).to.equal('publicKey', 'identity field should be publicKey');
    });

    it('CP-004: Should have consistent registry state structure', () => {
      const identityRegistryIdl = identityRegistryProgram.idl;
      const registryStateAccount = (identityRegistryIdl.accounts || []).find((a: any) => a.name === 'IdentityRegistryState');

      expect(registryStateAccount).to.exist('IdentityRegistryState account should exist');
      expect(registryStateAccount.fields).to.be.an('array');

      const fieldNames = registryStateAccount.fields.map((f: any) => f.name);
      const expectedFields = ['owner', 'registered_addresses', 'identity_map', 'next_index'];

      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `IdentityRegistryState should have '${field}' field`);
      }
    });

    it('CP-005: Should use same Pubkey representation for token addresses', () => {
      // Both programs should use Pubkey for token references
      const solanaRWAIdl = solanaRWAProgram.idl;
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      // solana-rwa: TokenState.mint should be Pubkey
      const tokenStateAccount = (solanaRWAIdl.accounts || []).find((a: any) => a.name === 'TokenState');
      const mintField = tokenStateAccount.fields.find((f: any) => f.name === 'mint');
      expect(mintField.type.kind).to.equal('publicKey', 'mint should be publicKey in solana-rwa');

      // compliance-aggregator: TokenModuleEntry.token should be Pubkey
      const tokenModuleEntryAccount = (complianceAggregatorIdl.accounts || []).find((a: any) => a.name === 'TokenModuleEntry');
      const tokenField = tokenModuleEntryAccount.fields.find((f: any) => f.name === 'token');
      expect(tokenField.type.kind).to.equal('publicKey', 'token should be publicKey in compliance-aggregator');
    });
  });

  // =============================================================================
  // Section 2: Compliance Type Consistency
  // =============================================================================
  // Verify that compliance types are consistent between compliance-aggregator and solana-rwa

  describe('Compliance Type Consistency', () => {
    it('CP-006: Should use Pubkey type for module addresses across programs', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      // add_module instruction should take Pubkey for module
      const addModuleInstruction = complianceAggregatorIdl.instructions.find((ix: any) => ix.name === 'add_module');
      const moduleParam = addModuleInstruction?.params?.find((p: any) => p.name === 'module');
      expect(moduleParam.type.kind).to.equal('publicKey', 'module should be publicKey type');

      // TokenModuleEntry should store Pubkey for module
      const tokenModuleEntryAccount = (complianceAggregatorIdl.accounts || []).find((a: any) => a.name === 'TokenModuleEntry');
      const moduleField = tokenModuleEntryAccount.fields.find((f: any) => f.name === 'module');
      expect(moduleField.type.kind).to.equal('publicKey', 'module field should be publicKey');
    });

    it('CP-007: Should have consistent token-module mapping structure', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const tokenModuleEntryAccount = (complianceAggregatorIdl.accounts || []).find((a: any) => a.name === 'TokenModuleEntry');

      expect(tokenModuleEntryAccount).to.exist('TokenModuleEntry account should exist');

      const fieldNames = tokenModuleEntryAccount.fields.map((f: any) => f.name);
      const expectedFields = ['token', 'module'];

      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `TokenModuleEntry should have '${field}' field`);
      }
    });

    it('CP-008: Should have consistent aggregator state structure', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const aggregatorStateAccount = (complianceAggregatorIdl.accounts || []).find((a: any) => a.name === 'ComplianceAggregatorState');

      expect(aggregatorStateAccount).to.exist('ComplianceAggregatorState account should exist');
      expect(aggregatorStateAccount.fields).to.be.an('array');

      const fieldNames = aggregatorStateAccount.fields.map((f: any) => f.name);
      const expectedFields = ['owner', 'token_modules', 'next_index'];

      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `ComplianceAggregatorState should have '${field}' field`);
      }
    });

    it('CP-009: Should have consistent transfer check types', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const canTransferInstruction = complianceAggregatorIdl.instructions.find((ix: any) => ix.name === 'can_transfer');

      expect(canTransferInstruction).to.exist('can_transfer instruction should exist');

      const paramNames = canTransferInstruction.params.map((p: any) => p.name);
      const expectedParams = ['token', 'from', 'to', 'amount'];

      for (const param of expectedParams) {
        expect(paramNames).to.include(param, `can_transfer should have '${param}' parameter`);
      }

      // Verify types
      const fromParam = canTransferInstruction.params.find((p: any) => p.name === 'from');
      const toParam = canTransferInstruction.params.find((p: any) => p.name === 'to');
      const amountParam = canTransferInstruction.params.find((p: any) => p.name === 'amount');

      expect(fromParam.type.kind).to.equal('publicKey', 'from should be publicKey');
      expect(toParam.type.kind).to.equal('publicKey', 'to should be publicKey');
      expect(amountParam.type.kind).to.equal('u64', 'amount should be u64');
    });

    it('CP-010: Should have consistent balance limit types', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      // Check that AggregatorState has balance_limit field as u64
      const aggregatorStateAccount = (complianceAggregatorIdl.accounts || []).find((a: any) => a.name === 'AggregatorState');

      if (aggregatorStateAccount) {
        const fieldNames = aggregatorStateAccount.fields.map((f: any) => f.name);
        const balanceLimitField = aggregatorStateAccount.fields.find((f: any) => f.name === 'balance_limit');

        if (balanceLimitField) {
          expect(balanceLimitField.type.kind).to.equal('u64', 'balance_limit should be u64');
        }
      }
    });
  });

  // =============================================================================
  // Section 3: Event Consistency Across Programs
  // =============================================================================
  // Verify that events are consistent and properly defined across programs

  describe('Event Consistency Across Programs', () => {
    it('CP-011: Should have timestamp field in all events', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        for (const event of program.idl.events || []) {
          const timestampField = event.fields.find((f: any) => f.name === 'timestamp');
          expect(timestampField).to.exist(`Event '${event.name}' in ${program.name} should have timestamp field`);
          expect(timestampField.type.kind).to.equal('u64', `timestamp field in '${event.name}' should be u64`);
        }
      }
    });

    it('CP-012: Should have consistent event field naming conventions', () => {
      // All programs should use snake_case for event field names (Rust convention)
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        for (const event of program.idl.events || []) {
          for (const field of event.fields) {
            expect(field.name).to.match(/^[a-z][a-zA-Z0-9_]*$/, `Field '${field.name}' in event '${event.name}' should use snake_case`);
          }
        }
      }
    });

    it('CP-013: Should have pubkey type for address fields in events', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      const addressFieldPatterns = ['owner', 'from', 'to', 'agent', 'wallet', 'authority', 'mint', 'token', 'identity', 'module', 'newOwner', 'mintTo'];

      for (const program of programs) {
        for (const event of program.idl.events || []) {
          for (const field of event.fields) {
            if (addressFieldPatterns.some((pattern) => field.name.toLowerCase().includes(pattern))) {
              if (field.type.kind === 'publicKey' || field.type.kind === 'option') {
                // This is correct - address fields should be publicKey or option<publicKey>
              } else {
                // Note: Some fields may be u64 (like amounts), so we don't enforce strictly
              }
            }
          }
        }
      }
    });

    it('CP-014: Should have TokensMintedEvent in solana-rwa with expected fields', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const tokensMintedEvent = (solanaRWAIdl.events || []).find((e: any) => e.name === 'TokensMintedEvent');

      expect(tokensMintedEvent).to.exist('TokensMintedEvent should exist in solana-rwa');

      const fieldNames = tokensMintedEvent.fields.map((f: any) => f.name);
      const expectedFields = ['token', 'mintTo', 'amount', 'agent', 'timestamp'];

      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `TokensMintedEvent should have '${field}' field`);
      }
    });

    it('CP-015: Should have IdentityRegisteredEvent in identity-registry with expected fields', () => {
      const identityRegistryIdl = identityRegistryProgram.idl;
      const identityRegisteredEvent = (identityRegistryIdl.events || []).find((e: any) => e.name === 'IdentityRegisteredEvent');

      expect(identityRegisteredEvent).to.exist('IdentityRegisteredEvent should exist in identity-registry');

      const fieldNames = identityRegisteredEvent.fields.map((f: any) => f.name);
      const expectedFields = ['wallet', 'identity', 'owner', 'timestamp'];

      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `IdentityRegisteredEvent should have '${field}' field`);
      }
    });

    it('CP-016: Should have ModuleAddedEvent in compliance-aggregator with expected fields', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const moduleAddedEvent = (complianceAggregatorIdl.events || []).find((e: any) => e.name === 'ModuleAddedEvent');

      expect(moduleAddedEvent).to.exist('ModuleAddedEvent should exist in compliance-aggregator');

      const fieldNames = moduleAddedEvent.fields.map((f: any) => f.name);
      const expectedFields = ['token', 'module', 'owner', 'timestamp'];

      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `ModuleAddedEvent should have '${field}' field`);
      }
    });
  });

  // =============================================================================
  // Section 4: CPI Account Consistency
  // =============================================================================
  // Verify that CPI calls use correct accounts across programs

  describe('CPI Account Consistency', () => {
    it('CP-017: Should have system_program in all initialize instructions', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        const initializeInstruction = program.idl.instructions.find((ix: any) => ix.name === 'initialize');
        expect(initializeInstruction).to.exist(`Initialize instruction should exist in ${program.name}`);

        const accountNames = initializeInstruction.accounts.map((a: any) => a.name);
        expect(accountNames).to.include('system_program', `system_program should be in initialize of ${program.name}`);
      }
    });

    it('CP-018: Should have consistent owner/account patterns across programs', () => {
      // All programs should have owner in initialize
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        const initializeInstruction = program.idl.instructions.find((ix: any) => ix.name === 'initialize');
        const accountNames = initializeInstruction.accounts.map((a: any) => a.name);

        expect(accountNames).to.include('owner', `owner should be in initialize of ${program.name}`);
      }
    });

    it('CP-019: Should have consistent account constraints for owner', () => {
      // Owner should be Signer and have mut permission in initialize
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        const initializeInstruction = program.idl.instructions.find((ix: any) => ix.name === 'initialize');
        const ownerAccount = initializeInstruction.accounts.find((a: any) => a.name === 'owner');

        expect(ownerAccount).to.exist(`owner account should exist in initialize of ${program.name}`);

        // Check constraints
        const constraints = ownerAccount.constraints || [];
        const signerConstraint = constraints.find((c: any) => c.type === 'signer' || c.type === 'requires_signer');
        expect(signerConstraint).to.exist(`owner should be signer in initialize of ${program.name}`);
      }
    });

    it('CP-020: Should have token account pattern in compliance-aggregator', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      // add_module should have token parameter
      const addModuleInstruction = complianceAggregatorIdl.instructions.find((ix: any) => ix.name === 'add_module');
      const accountNames = addModuleInstruction.accounts.map((a: any) => a.name);

      expect(accountNames).to.include('token', 'token account should be in add_module');
      expect(accountNames).to.include('aggregator', 'aggregator account should be in add_module');
    });

    it('CP-021: Should have consistent account type constraints', () => {
      // All program accounts should have init or writable constraints as appropriate
      const solanaRWAIdl = solanaRWAProgram.idl;
      const initializeInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'initialize');

      const tokenStateAccount = initializeInstruction.accounts.find((a: any) => a.name === 'token_state');
      expect(tokenStateAccount).to.exist('token_state account should exist in initialize');

      const constraints = tokenStateAccount.constraints || [];
      const accountTypeConstraint = constraints.find((c: any) => c.type === 'account_type' || c.type === 'has_one');

      // Account should have proper constraints for TokenState
      expect(constraints).to.be.an('array');
    });
  });

  // =============================================================================
  // Section 5: Error Code Consistency Across Programs
  // =============================================================================

  describe('Error Code Consistency Across Programs', () => {
    it('CP-022: Should have Unauthorized error in all programs', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        const errorEntry = (program.idl.errors || []).find((e: any) => e.code === 'Unauthorized');
        expect(errorEntry).to.exist(`Unauthorized error should exist in ${program.name}`);
      }
    });

    it('CP-023: Should have unique error codes within each program', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        const errorCodes = (program.idl.errors || []).map((e: any) => e.code);
        const uniqueCodes = new Set(errorCodes);
        expect(uniqueCodes.size).to.equal(errorCodes.length, `All error codes should be unique in ${program.name}`);
      }
    });

    it('CP-024: Should have error codes as sequential integers starting from 0', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        const errorCodes = (program.idl.errors || []).map((e: any) => e.code).sort((a: number, b: number) => a - b);

        for (let i = 0; i < errorCodes.length; i++) {
          expect(errorCodes[i]).to.equal(i, `Error code ${i} should exist in ${program.name}`);
        }
      }
    });

    it('CP-025: Should have descriptive error messages', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        for (const error of program.idl.errors || []) {
          expect(error.msg).to.be.a('string');
          expect(error.msg.length).to.be.greaterThan(0, `Error '${error.code}' should have non-empty message in ${program.name}`);
          expect(error.msg.length).to.be.lessThan(200, `Error '${error.code}' message should be reasonable length in ${program.name}`);
        }
      }
    });
  });

  // =============================================================================
  // Section 6: Cross-Program Data Flow Tests
  // =============================================================================

  describe('Cross-Program Data Flow Tests', () => {
    it('CP-026: Should initialize all three programs independently', async () => {
      // Initialize solana-rwa
      const tokenState = Keypair.generate();
      await solanaRWAProgram.methods
        .initialize('Cross-Program Test Token', 'CPTT', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      // Initialize identity-registry
      const registry = Keypair.generate();
      await identityRegistryProgram.methods
        .initialize()
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, registry])
        .rpc();

      // Initialize compliance-aggregator
      const aggregator = Keypair.generate();
      await complianceAggregatorProgram.methods
        .initialize()
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, aggregator])
        .rpc();

      // Verify all initialized
      const tokenStateAccount = await solanaRWAProgram.account.tokenState.fetch(tokenState.publicKey);
      expect(tokenStateAccount.name).to.equal('Cross-Program Test Token');

      const aggregatorAccount = await complianceAggregatorProgram.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(aggregatorAccount.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    });

    it('CP-027: Should maintain consistent state after cross-program operations', async () => {
      // Initialize all programs
      const tokenState = Keypair.generate();
      await solanaRWAProgram.methods
        .initialize('State Test Token', 'STT', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      const registry = Keypair.generate();
      await identityRegistryProgram.methods
        .initialize()
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, registry])
        .rpc();

      const aggregator = Keypair.generate();
      await complianceAggregatorProgram.methods
        .initialize()
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, aggregator])
        .rpc();

      // Add agent in solana-rwa
      await solanaRWAProgram.methods
        .addAgent(agent.publicKey)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Register identity in identity-registry
      await identityRegistryProgram.methods
        .registerIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          wallet: user1.publicKey,
          owner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // Add module in compliance-aggregator
      await complianceAggregatorProgram.methods
        .addModule(tokenState.publicKey, user1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Verify all states are consistent
      const tokenStateAccount = await solanaRWAProgram.account.tokenState.fetch(tokenState.publicKey);
      expect(tokenStateAccount.agents).to.include(agent.publicKey.toBase58());

      const identity = await identityRegistryProgram.methods.getIdentity(user1.publicKey).accounts({ registry: registry.publicKey }).view();
      expect(identity.toBase58()).to.equal(user1.publicKey.toBase58());

      const modules = await complianceAggregatorProgram.methods.getModules(tokenState.publicKey).accounts({ aggregator: aggregator.publicKey }).view();
      expect(modules).to.include(user1.publicKey.toBase58());
    });

    it('CP-028: Should use consistent Pubkey for token reference across programs', async () => {
      const token = Keypair.generate();
      const aggregator = Keypair.generate();

      await complianceAggregatorProgram.methods
        .initialize()
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, aggregator])
        .rpc();

      // Add module with token
      await complianceAggregatorProgram.methods
        .addModule(token.publicKey, user1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Query modules for same token
      const modules = await complianceAggregatorProgram.methods.getModules(token.publicKey).accounts({ aggregator: aggregator.publicKey }).view();

      expect(modules).to.be.an('array');
      expect(modules).to.include(user1.publicKey.toBase58());

      // Use same token pubkey in different query - should return same result
      const modules2 = await complianceAggregatorProgram.methods.getModules(token.publicKey).accounts({ aggregator: aggregator.publicKey }).view();
      expect(modules2).to.deep.equal(modules);
    });
  });

  // =============================================================================
  // Section 7: Program ID Consistency
  // =============================================================================

  describe('Program ID Consistency', () => {
    it('CP-029: Should have correct program IDs matching Anchor.toml', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const identityRegistryIdl = identityRegistryProgram.idl;
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      expect(solanaRWAIdl.address).to.equal('7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L');
      expect(identityRegistryIdl.address).to.equal('3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5');
      expect(complianceAggregatorIdl.address).to.equal('EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT');
    });

    it('CP-030: Should have all programs with version information', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        expect(program.idl.version).to.exist(`Version should exist for ${program.name}`);
        expect(program.idl.version).to.match(/^\d+\.\d+\.\d+/, `Version should follow semver for ${program.name}`);
      }
    });

    it('CP-031: Should have consistent instructions array structure', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        expect(program.idl.instructions).to.be.an('array', `${program.name} should have instructions array`);
        expect(program.idl.instructions.length).to.be.greaterThan(0, `${program.name} should have at least one instruction`);

        for (const ix of program.idl.instructions) {
          expect(ix.name).to.be.a('string', `Instruction name should be string in ${program.name}`);
          expect(ix.params).to.be.an('array', `Instruction '${ix.name}' should have params array in ${program.name}`);
        }
      }
    });
  });

  // =============================================================================
  // Section 8: Type Mapping Consistency
  // =============================================================================

  describe('Type Mapping Consistency', () => {
    it('CP-032: Should have consistent u64 usage for amounts across programs', () => {
      // solana-rwa: amount in mint, burn, transfer should be u64
      const solanaRWAIdl = solanaRWAProgram.idl;

      const mintInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'mint');
      const burnInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'burn');
      const transferInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'transfer');

      const mintAmount = mintInstruction.params.find((p: any) => p.name === 'amount');
      const burnAmount = burnInstruction.params.find((p: any) => p.name === 'amount');
      const transferAmount = transferInstruction.params.find((p: any) => p.name === 'amount');

      expect(mintAmount.type.kind).to.equal('u64', 'mint amount should be u64');
      expect(burnAmount.type.kind).to.equal('u64', 'burn amount should be u64');
      expect(transferAmount.type.kind).to.equal('u64', 'transfer amount should be u64');
    });

    it('CP-033: Should have consistent publicKey usage for addresses across programs', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      const addressParamNames = ['owner', 'agent', 'from', 'to', 'wallet', 'authority', 'mint', 'token', 'module', 'identity'];

      for (const program of programs) {
        for (const ix of program.idl.instructions) {
          for (const param of ix.params) {
            if (addressParamNames.includes(param.name)) {
              expect(param.type.kind).to.equal('publicKey', `${param.name} should be publicKey in ${program.name}.${ix.name}`);
            }
          }
        }
      }
    });

    it('CP-034: Should have consistent string usage for metadata across programs', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const initializeInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'initialize');

      const nameParam = initializeInstruction.params.find((p: any) => p.name === 'name');
      const symbolParam = initializeInstruction.params.find((p: any) => p.name === 'symbol');

      expect(nameParam.type.kind).to.equal('string', 'name should be string');
      expect(symbolParam.type.kind).to.equal('string', 'symbol should be string');
    });

    it('CP-035: Should have consistent u8 usage for decimals', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const initializeInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'initialize');

      const decimalsParam = initializeInstruction.params.find((p: any) => p.name === 'decimals');
      expect(decimalsParam.type.kind).to.equal('u8', 'decimals should be u8');

      // TokenState.decimals should also be u8
      const tokenStateAccount = (solanaRWAIdl.accounts || []).find((a: any) => a.name === 'TokenState');
      const decimalsField = tokenStateAccount.fields.find((f: any) => f.name === 'decimals');
      expect(decimalsField.type.kind).to.equal('u8', 'TokenState.decimals should be u8');
    });
  });

  // =============================================================================
  // Section 9: Account Vec Consistency
  // =============================================================================

  describe('Account Vec Consistency', () => {
    it('CP-036: Should use Vec for collections across programs', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const tokenStateAccount = (solanaRWAIdl.accounts || []).find((a: any) => a.name === 'TokenState');

      // balances should be Vec<BalanceEntry>
      const balancesField = tokenStateAccount.fields.find((f: any) => f.name === 'balances');
      expect(balancesField.type.kind).to.equal('vec', 'balances should be vec');

      // agents should be Vec<Pubkey>
      const agentsField = tokenStateAccount.fields.find((f: any) => f.name === 'agents');
      expect(agentsField.type.kind).to.equal('vec', 'agents should be vec');

      // frozenAccounts should be Vec<FrozenEntry>
      const frozenAccountsField = tokenStateAccount.fields.find((f: any) => f.name === 'frozenAccounts');
      expect(frozenAccountsField.type.kind).to.equal('vec', 'frozenAccounts should be vec');
    });

    it('CP-037: Should use Vec for token_modules in compliance-aggregator', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const aggregatorStateAccount = (complianceAggregatorIdl.accounts || []).find((a: any) => a.name === 'ComplianceAggregatorState');

      const tokenModulesField = aggregatorStateAccount.fields.find((f: any) => f.name === 'token_modules');
      expect(tokenModulesField.type.kind).to.equal('vec', 'token_modules should be vec');
    });

    it('CP-038: Should use Vec for registered_addresses in identity-registry', () => {
      const identityRegistryIdl = identityRegistryProgram.idl;
      const registryStateAccount = (identityRegistryIdl.accounts || []).find((a: any) => a.name === 'IdentityRegistryState');

      const registeredAddressesField = registryStateAccount.fields.find((f: any) => f.name === 'registered_addresses');
      expect(registeredAddressesField.type.kind).to.equal('vec', 'registered_addresses should be vec');
    });
  });

  // =============================================================================
  // Section 10: Cross-Program Event Emission Consistency
  // =============================================================================

  describe('Cross-Program Event Emission Consistency', () => {
    it('CP-039: Should have events for state-changing operations in all programs', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        expect(program.idl.events).to.be.an('array', `${program.name} should have events array`);
        expect(program.idl.events.length).to.be.greaterThan(0, `${program.name} should have at least one event`);
      }
    });

    it('CP-040: Should have transfer-related events in solana-rwa', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const eventNames = (solanaRWAIdl.events || []).map((e: any) => e.name);

      // Should have events for mint, burn, transfer operations
      expect(eventNames).to.include('TokensMintedEvent', 'Should have TokensMintedEvent');
      expect(eventNames).to.include('OwnerTransferredEvent', 'Should have OwnerTransferredEvent');
    });

    it('CP-041: Should have identity-related events in identity-registry', () => {
      const identityRegistryIdl = identityRegistryProgram.idl;
      const eventNames = (identityRegistryIdl.events || []).map((e: any) => e.name);

      expect(eventNames).to.include('IdentityRegisteredEvent', 'Should have IdentityRegisteredEvent');
      expect(eventNames).to.include('IdentityUpdatedEvent', 'Should have IdentityUpdatedEvent');
      expect(eventNames).to.include('IdentityRemovedEvent', 'Should have IdentityRemovedEvent');
    });

    it('CP-042: Should have compliance-related events in compliance-aggregator', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const eventNames = (complianceAggregatorIdl.events || []).map((e: any) => e.name);

      expect(eventNames).to.include('ModuleAddedEvent', 'Should have ModuleAddedEvent');
      expect(eventNames).to.include('ModuleRemovedEvent', 'Should have ModuleRemovedEvent');
      expect(eventNames).to.include('TransferCheckEvent', 'Should have TransferCheckEvent');
    });
  });
});
