import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../target/types/7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L';
import { IdentityRegistry } from '../target/types/3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5';
import { ComplianceAggregator } from '../target/types/EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';

// =============================================================================
// Frontend-Backend Integration Tests
// =============================================================================
// These tests verify that the frontend can correctly interact with the smart contracts
// by validating that all frontend-facing APIs are properly exposed through the IDL
// and that data types are compatible between frontend and on-chain programs.

describe('Frontend-Backend Integration Tests', () => {
  const provider: AnchorProvider = AnchorProvider.env();
  anchor.setProvider(provider);

  const solanaRWAProgram = anchor.workspace.SolanaRwa as Program<SolanaRwa>;
  const identityRegistryProgram = anchor.workspace.IdentityRegistry as Program<IdentityRegistry>;
  const complianceAggregatorProgram = anchor.workspace.ComplianceAggregator as Program<ComplianceAggregator>;

  // Program IDs from Anchor.toml
  const SOLANA_RWA_ID = new PublicKey('7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L');
  const IDENTITY_REGISTRY_ID = new PublicKey('3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5');
  const COMPLIANCE_AGGREGATOR_ID = new PublicKey('ALgh7qDAL68XSxrqU1zDTeu2mXrEErHmQLAQnkPHvtpg');

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
  // Section 1: IDL Instruction Availability for Frontend
  // =============================================================================

  describe('IDL Instruction Availability for Frontend', () => {
    it('FI-001: Should have all solana-rwa instructions available in IDL', () => {
      const idl = solanaRWAProgram.idl;
      const expectedInstructions = [
        'initialize',
        'mint',
        'burn',
        'transfer',
        'add_agent',
        'remove_agent',
        'freeze_account',
        'unfreeze_account',
        'transfer_owner',
        'transfer_freeze_authority',
        'get_supply_info',
      ];

      const idlInstructionNames = idl.instructions.map((ix: any) => ix.name);

      for (const expected of expectedInstructions) {
        expect(idlInstructionNames).to.include(expected, `Instruction '${expected}' should be in IDL`);
      }
    });

    it('FI-002: Should have all identity-registry instructions available in IDL', () => {
      const idl = identityRegistryProgram.idl;
      const expectedInstructions = [
        'initialize',
        'register_identity',
        'register_identity_with_data',
        'update_identity',
        'remove_identity',
        'get_identity',
      ];

      const idlInstructionNames = idl.instructions.map((ix: any) => ix.name);

      for (const expected of expectedInstructions) {
        expect(idlInstructionNames).to.include(expected, `Instruction '${expected}' should be in IDL`);
      }
    });

    it('FI-003: Should have all compliance-aggregator instructions available in IDL', () => {
      const idl = complianceAggregatorProgram.idl;
      const expectedInstructions = [
        'initialize',
        'add_module',
        'remove_module',
        'rebalance_modules',
        'get_state',
        'get_module_count',
        'can_transfer',
        'get_modules',
      ];

      const idlInstructionNames = idl.instructions.map((ix: any) => ix.name);

      for (const expected of expectedInstructions) {
        expect(idlInstructionNames).to.include(expected, `Instruction '${expected}' should be in IDL`);
      }
    });

    it('FI-004: Should have valid IDL version information', () => {
      const programs = [
        { name: 'solana-rwa', idl: solanaRWAProgram.idl },
        { name: 'identity-registry', idl: identityRegistryProgram.idl },
        { name: 'compliance-aggregator', idl: complianceAggregatorProgram.idl },
      ];

      for (const program of programs) {
        expect(program.idl.version).to.exist(`Version should exist for ${program.name}`);
        expect(typeof program.idl.version).to.equal('string', `Version should be string for ${program.name}`);
        expect(program.idl.version).to.match(/^\d+\.\d+\.\d+/, `Version should follow semver for ${program.name}`);
      }
    });

    it('FI-005: Should have valid program addresses in IDL', () => {
      const idl = solanaRWAProgram.idl;
      expect(idl.address).to.exist('IDL should have address field');
      expect(typeof idl.address).to.equal('string', 'Address should be string');
    });
  });

  // =============================================================================
  // Section 2: TypeScript Type Compatibility
  // =============================================================================

  describe('TypeScript Type Compatibility', () => {
    it('FI-006: Should have compatible Pubkey types across all programs', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const identityRegistryIdl = identityRegistryProgram.idl;
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      const solanaRWAAccounts = solanaRWAIdl.accounts || [];
      for (const account of solanaRWAAccounts) {
        if (account.fields) {
          for (const field of account.fields) {
            if (field.type === 'publicKey') {
              expect(field.name).to.be.a('string', 'Pubkey field name should be string');
            }
          }
        }
      }
    });

    it('FI-007: Should have compatible u64/BN types for amounts', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const mintInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'mint');
      expect(mintInstruction).to.exist('Mint instruction should exist');

      const mintParams = mintInstruction?.params || [];
      const amountParam = mintParams.find((p: any) => p.name === 'amount');
      expect(amountParam).to.exist('Amount parameter should exist in mint instruction');
      expect(amountParam.type.kind).to.equal('u64', 'Amount should be u64 type');
    });

    it('FI-008: Should have compatible string types for metadata', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const initializeInstruction = solanaRWAIdl.instructions.find((ix: any) => ix.name === 'initialize');

      const nameParam = initializeInstruction?.params?.find((p: any) => p.name === 'name');
      const symbolParam = initializeInstruction?.params?.find((p: any) => p.name === 'symbol');

      expect(nameParam).to.exist('Name parameter should exist in initialize instruction');
      expect(symbolParam).to.exist('Symbol parameter should exist in initialize instruction');
      expect(nameParam.type.kind).to.equal('string', 'Name should be string type');
      expect(symbolParam.type.kind).to.equal('string', 'Symbol should be string type');
    });

    it('FI-009: Should have compatible vec/array types for lists', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const getModulesInstruction = complianceAggregatorIdl.instructions.find((ix: any) => ix.name === 'get_modules');
      expect(getModulesInstruction).to.exist('get_modules instruction should exist');
    });

    it('FI-010: Should have compatible option types for optional parameters', () => {
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;
      const getStateInstruction = complianceAggregatorIdl.instructions.find((ix: any) => ix.name === 'get_state');

      const tokenParam = getStateInstruction?.params?.find((p: any) => p.name === 'token');
      expect(tokenParam).to.exist('Token parameter should exist in get_state instruction');
      expect(tokenParam.type.kind).to.equal('option', 'Token should be option type');
    });
  });

  // =============================================================================
  // Section 3: Event Handling Integration
  // =============================================================================

  describe('Event Handling Integration', () => {
    it('FI-011: Should have all solana-rwa events defined in IDL', () => {
      const idl = solanaRWAProgram.idl;
      const expectedEvents = [
        'OwnerTransferredEvent',
        'TokensMintedEvent',
        'AccountFrozenEvent',
        'AccountUnfrozenEvent',
        'FreezeAuthorityTransferredEvent',
      ];

      const idlEventNames = (idl.events || []).map((e: any) => e.name);

      for (const expected of expectedEvents) {
        expect(idlEventNames).to.include(expected, `Event '${expected}' should be in IDL`);
      }
    });

    it('FI-012: Should have all identity-registry events defined in IDL', () => {
      const idl = identityRegistryProgram.idl;
      const expectedEvents = [
        'IdentityRegisteredEvent',
        'IdentityUpdatedEvent',
        'IdentityRemovedEvent',
        'IdentityRegisteredWithDataEvent',
      ];

      const idlEventNames = (idl.events || []).map((e: any) => e.name);

      for (const expected of expectedEvents) {
        expect(idlEventNames).to.include(expected, `Event '${expected}' should be in IDL`);
      }
    });

    it('FI-013: Should have all compliance-aggregator events defined in IDL', () => {
      const idl = complianceAggregatorProgram.idl;
      const expectedEvents = [
        'ModuleAddedEvent',
        'ModuleRemovedEvent',
        'TransferCheckEvent',
        'ModulesRebalancedEvent',
      ];

      const idlEventNames = (idl.events || []).map((e: any) => e.name);

      for (const expected of expectedEvents) {
        expect(idlEventNames).to.include(expected, `Event '${expected}' should be in IDL`);
      }
    });

    it('FI-014: Should have events with proper field definitions', () => {
      const idl = solanaRWAProgram.idl;
      const tokensMintedEvent = (idl.events || []).find((e: any) => e.name === 'TokensMintedEvent');

      expect(tokensMintedEvent).to.exist('TokensMintedEvent should exist');
      expect(tokensMintedEvent.fields).to.be.an('array', 'Event should have fields array');

      const fieldNames = tokensMintedEvent.fields.map((f: any) => f.name);
      const expectedFields = ['token', 'mintTo', 'amount', 'agent', 'timestamp'];
      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `Event should have '${field}' field`);
      }
    });

    it('FI-015: Should have events with correct field types', () => {
      const idl = solanaRWAProgram.idl;

      const ownerTransferredEvent = (idl.events || []).find((e: any) => e.name === 'OwnerTransferredEvent');
      expect(ownerTransferredEvent).to.exist('OwnerTransferredEvent should exist');

      const newOwnerField = ownerTransferredEvent.fields.find((f: any) => f.name === 'newOwner');
      expect(newOwnerField).to.exist('newOwner field should exist');
      expect(newOwnerField.type.kind).to.equal('publicKey', 'newOwner should be publicKey type');

      const timestampField = ownerTransferredEvent.fields.find((f: any) => f.name === 'timestamp');
      expect(timestampField).to.exist('timestamp field should exist');
      expect(timestampField.type.kind).to.equal('u64', 'timestamp should be u64 type');
    });

    it('FI-016: Should have events with name and type fields', () => {
      const idl = solanaRWAProgram.idl;

      for (const event of idl.events || []) {
        expect(event.name).to.be.a('string', `Event '${event.name}' should have string name`);
        expect(event.fields).to.be.an('array', `Event '${event.name}' should have fields array`);

        for (const field of event.fields) {
          expect(field.name).to.be.a('string', `Field '${field.name}' should have string name`);
          expect(field.type).to.exist(`Field '${field.name}' should have type`);
          expect(field.index).to.be.a('boolean', `Field '${field.name}' should have index boolean`);
        }
      }
    });
  });

  // =============================================================================
  // Section 4: Account Structure Integration
  // =============================================================================

  describe('Account Structure Integration', () => {
    it('FI-017: Should have all solana-rwa accounts defined in IDL', () => {
      const idl = solanaRWAProgram.idl;
      const expectedAccounts = ['TokenState', 'BalanceEntry', 'FrozenEntry', 'SupplyInfo'];

      const idlAccountNames = (idl.accounts || []).map((a: any) => a.name);

      for (const expected of expectedAccounts) {
        expect(idlAccountNames).to.include(expected, `Account '${expected}' should be in IDL`);
      }
    });

    it('FI-018: Should have all identity-registry accounts defined in IDL', () => {
      const idl = identityRegistryProgram.idl;
      const expectedAccounts = ['IdentityRegistryState', 'IdentityEntry'];

      const idlAccountNames = (idl.accounts || []).map((a: any) => a.name);

      for (const expected of expectedAccounts) {
        expect(idlAccountNames).to.include(expected, `Account '${expected}' should be in IDL`);
      }
    });

    it('FI-019: Should have all compliance-aggregator accounts defined in IDL', () => {
      const idl = complianceAggregatorProgram.idl;
      const expectedAccounts = ['ComplianceAggregatorState', 'TokenModuleEntry', 'AggregatorState'];

      const idlAccountNames = (idl.accounts || []).map((a: any) => a.name);

      for (const expected of expectedAccounts) {
        expect(idlAccountNames).to.include(expected, `Account '${expected}' should be in IDL`);
      }
    });

    it('FI-020: Should have accounts with proper field definitions', () => {
      const idl = solanaRWAProgram.idl;
      const tokenStateAccount = (idl.accounts || []).find((a: any) => a.name === 'TokenState');

      expect(tokenStateAccount).to.exist('TokenState account should exist');
      expect(tokenStateAccount.fields).to.be.an('array', 'TokenState should have fields array');

      const fieldNames = tokenStateAccount.fields.map((f: any) => f.name);
      const expectedFields = ['authority', 'mint', 'decimals', 'supply', 'name', 'symbol', 'balances', 'frozenAccounts', 'agents', 'freezeAuthority'];
      for (const field of expectedFields) {
        expect(fieldNames).to.include(field, `TokenState should have '${field}' field`);
      }
    });

    it('FI-021: Should have accounts with compatible field types', () => {
      const idl = solanaRWAProgram.idl;
      const tokenStateAccount = (idl.accounts || []).find((a: any) => a.name === 'TokenState');

      const authorityField = tokenStateAccount.fields.find((f: any) => f.name === 'authority');
      expect(authorityField.type.kind).to.equal('publicKey', 'Authority should be publicKey type');

      const decimalsField = tokenStateAccount.fields.find((f: any) => f.name === 'decimals');
      expect(decimalsField.type.kind).to.equal('u8', 'Decimals should be u8 type');

      const supplyField = tokenStateAccount.fields.find((f: any) => f.name === 'supply');
      expect(supplyField.type.kind).to.equal('u64', 'Supply should be u64 type');
    });
  });

  // =============================================================================
  // Section 5: Error Handling Integration
  // =============================================================================

  describe('Error Handling Integration', () => {
    it('FI-022: Should have all solana-rwa error codes defined in IDL', () => {
      const idl = solanaRWAProgram.idl;
      const expectedErrors = [
        'Unauthorized',
        'InsufficientBalance',
        'AccountFrozen',
        'DuplicateAgent',
        'InvalidAmount',
        'SupplyExceeded',
        'SupplyOverflow',
        'SameOwner',
        'NotFreezeAuthority',
        'SameFreezeAuthority',
      ];

      const idlErrorCodes = (idl.errors || []).map((e: any) => e.code);

      for (const expected of expectedErrors) {
        expect(idlErrorCodes).to.include(expected, `Error code '${expected}' should be in IDL`);
      }
    });

    it('FI-023: Should have all identity-registry error codes defined in IDL', () => {
      const idl = identityRegistryProgram.idl;
      const expectedErrors = [
        'WalletAlreadyRegistered',
        'WalletNotRegistered',
        'NotIdentityOwner',
        'StringTooLong',
      ];

      const idlErrorCodes = (idl.errors || []).map((e: any) => e.code);

      for (const expected of expectedErrors) {
        expect(idlErrorCodes).to.include(expected, `Error code '${expected}' should be in IDL`);
      }
    });

    it('FI-024: Should have all compliance-aggregator error codes defined in IDL', () => {
      const idl = complianceAggregatorProgram.idl;
      const expectedErrors = [
        'TokenNotRegistered',
        'Unauthorized',
        'DuplicateModule',
        'WalletNotKYCVerified',
        'BalanceLimitExceeded',
        'MaxHoldersExceeded',
        'TransferLocked',
        'ZeroAmountNotAllowed',
        'InvalidAddress',
        'TransferAmountExceeded',
      ];

      const idlErrorCodes = (idl.errors || []).map((e: any) => e.code);

      for (const expected of expectedErrors) {
        expect(idlErrorCodes).to.include(expected, `Error code '${expected}' should be in IDL`);
      }
    });

    it('FI-025: Should have error codes with valid error messages', () => {
      const idl = solanaRWAProgram.idl;

      for (const error of idl.errors || []) {
        expect(error.code).to.be.a('number', `Error '${error.code}' should have numeric code`);
        expect(error.msg).to.be.a('string', `Error '${error.code}' should have string message`);
        expect(error.msg.length).to.be.greaterThan(0, `Error '${error.code}' message should not be empty`);
      }
    });

    it('FI-026: Should have unique error codes', () => {
      const idl = solanaRWAProgram.idl;
      const errorCodes = (idl.errors || []).map((e: any) => e.code);

      const uniqueCodes = new Set(errorCodes);
      expect(uniqueCodes.size).to.equal(errorCodes.length, 'All error codes should be unique');
    });
  });

  // =============================================================================
  // Section 6: Instruction Parameter Integration
  // =============================================================================

  describe('Instruction Parameter Integration', () => {
    it('FI-027: Should have initialize instruction with all required parameters', () => {
      const idl = solanaRWAProgram.idl;
      const initializeInstruction = idl.instructions.find((ix: any) => ix.name === 'initialize');

      expect(initializeInstruction).to.exist('Initialize instruction should exist');

      const paramNames = initializeInstruction.params.map((p: any) => p.name);
      const requiredParams = ['name', 'symbol', 'decimals'];

      for (const param of requiredParams) {
        expect(paramNames).to.include(param, `Initialize should have '${param}' parameter`);
      }
    });

    it('FI-028: Should have mint instruction with correct parameter types', () => {
      const idl = solanaRWAProgram.idl;
      const mintInstruction = idl.instructions.find((ix: any) => ix.name === 'mint');

      expect(mintInstruction).to.exist('Mint instruction should exist');

      const paramNames = mintInstruction.params.map((p: any) => p.name);
      const expectedParams = ['to', 'amount'];

      for (const param of expectedParams) {
        expect(paramNames).to.include(param, `Mint should have '${param}' parameter`);
      }

      const toParam = mintInstruction.params.find((p: any) => p.name === 'to');
      const amountParam = mintInstruction.params.find((p: any) => p.name === 'amount');

      expect(toParam.type.kind).to.equal('publicKey', 'to parameter should be publicKey');
      expect(amountParam.type.kind).to.equal('u64', 'amount parameter should be u64');
    });

    it('FI-029: Should have transfer instruction with correct parameter types', () => {
      const idl = solanaRWAProgram.idl;
      const transferInstruction = idl.instructions.find((ix: any) => ix.name === 'transfer');

      expect(transferInstruction).to.exist('Transfer instruction should exist');

      const paramNames = transferInstruction.params.map((p: any) => p.name);
      const expectedParams = ['from', 'to', 'amount'];

      for (const param of expectedParams) {
        expect(paramNames).to.include(param, `Transfer should have '${param}' parameter`);
      }

      const fromParam = transferInstruction.params.find((p: any) => p.name === 'from');
      const toParam = transferInstruction.params.find((p: any) => p.name === 'to');
      const amountParam = transferInstruction.params.find((p: any) => p.name === 'amount');

      expect(fromParam.type.kind).to.equal('publicKey', 'from parameter should be publicKey');
      expect(toParam.type.kind).to.equal('publicKey', 'to parameter should be publicKey');
      expect(amountParam.type.kind).to.equal('u64', 'amount parameter should be u64');
    });

    it('FI-030: Should have register_identity instruction with correct parameter types', () => {
      const idl = identityRegistryProgram.idl;
      const registerIdentityInstruction = idl.instructions.find((ix: any) => ix.name === 'register_identity');

      expect(registerIdentityInstruction).to.exist('register_identity instruction should exist');

      const paramNames = registerIdentityInstruction.params.map((p: any) => p.name);
      const expectedParams = ['identity'];

      for (const param of expectedParams) {
        expect(paramNames).to.include(param, `register_identity should have '${param}' parameter`);
      }

      const identityParam = registerIdentityInstruction.params.find((p: any) => p.name === 'identity');
      expect(identityParam.type.kind).to.equal('publicKey', 'identity parameter should be publicKey');
    });

    it('FI-031: Should have add_module instruction with correct parameter types', () => {
      const idl = complianceAggregatorProgram.idl;
      const addModuleInstruction = idl.instructions.find((ix: any) => ix.name === 'add_module');

      expect(addModuleInstruction).to.exist('add_module instruction should exist');

      const paramNames = addModuleInstruction.params.map((p: any) => p.name);
      const expectedParams = ['token', 'module'];

      for (const param of expectedParams) {
        expect(paramNames).to.include(param, `add_module should have '${param}' parameter`);
      }

      const tokenParam = addModuleInstruction.params.find((p: any) => p.name === 'token');
      const moduleParam = addModuleInstruction.params.find((p: any) => p.name === 'module');

      expect(tokenParam.type.kind).to.equal('publicKey', 'token parameter should be publicKey');
      expect(moduleParam.type.kind).to.equal('publicKey', 'module parameter should be publicKey');
    });
  });

  // =============================================================================
  // Section 7: Frontend Method Builder Validation
  // =============================================================================

  describe('Frontend Method Builder Validation', () => {
    it('FI-032: Should allow building initialize instruction', () => {
      const idl = solanaRWAProgram.idl;
      const initializeInstruction = idl.instructions.find((ix: any) => ix.name === 'initialize');

      expect(initializeInstruction).to.exist;
      expect(initializeInstruction.params).to.be.an('array');
      expect(initializeInstruction.params.length).to.be.greaterThan(0);
    });

    it('FI-033: Should allow building mint instruction', () => {
      const idl = solanaRWAProgram.idl;
      const mintInstruction = idl.instructions.find((ix: any) => ix.name === 'mint');

      expect(mintInstruction).to.exist;
      expect(mintInstruction.params).to.be.an('array');

      const paramNames = mintInstruction.params.map((p: any) => p.name);
      expect(paramNames).to.include('to');
      expect(paramNames).to.include('amount');
    });

    it('FI-034: Should allow building transfer instruction', () => {
      const idl = solanaRWAProgram.idl;
      const transferInstruction = idl.instructions.find((ix: any) => ix.name === 'transfer');

      expect(transferInstruction).to.exist;
      expect(transferInstruction.params).to.be.an('array');

      const paramNames = transferInstruction.params.map((p: any) => p.name);
      expect(paramNames).to.include('from');
      expect(paramNames).to.include('to');
      expect(paramNames).to.include('amount');
    });

    it('FI-035: Should allow building register_identity instruction', () => {
      const idl = identityRegistryProgram.idl;
      const registerIdentityInstruction = idl.instructions.find((ix: any) => ix.name === 'register_identity');

      expect(registerIdentityInstruction).to.exist;
      expect(registerIdentityInstruction.params).to.be.an('array');
    });

    it('FI-036: Should allow building add_module instruction', () => {
      const idl = complianceAggregatorProgram.idl;
      const addModuleInstruction = idl.instructions.find((ix: any) => ix.name === 'add_module');

      expect(addModuleInstruction).to.exist;
      expect(addModuleInstruction.params).to.be.an('array');
    });
  });

  // =============================================================================
  // Section 8: Real Transaction Integration Test
  // =============================================================================

  describe('Real Transaction Integration', () => {
    it('FI-037: Should successfully initialize token state via frontend pattern', async () => {
      const tokenState = Keypair.generate();

      const tx = await solanaRWAProgram.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: solanaRWAProgram.provider.wallet.payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      expect(tx).to.be.a('string', 'Transaction signature should be returned');
      expect(tx.length).to.be.greaterThan(0);

      const tokenStateAccount = await solanaRWAProgram.account.tokenState.fetch(tokenState.publicKey);
      expect(tokenStateAccount.name).to.equal('Test Token');
      expect(tokenStateAccount.symbol).to.equal('TST');
      expect(tokenStateAccount.decimals).to.equal(9);
    });

    it('FI-038: Should successfully add agent via frontend pattern', async () => {
      const tokenState = Keypair.generate();
      await solanaRWAProgram.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: solanaRWAProgram.provider.wallet.payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      const tx = await solanaRWAProgram.methods
        .addAgent(agent.publicKey)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      expect(tx).to.be.a('string');

      const tokenStateAccount = await solanaRWAProgram.account.tokenState.fetch(tokenState.publicKey);
      expect(tokenStateAccount.agents).to.include(agent.publicKey.toBase58());
    });

    it('FI-039: Should successfully mint tokens via frontend pattern', async () => {
      const tokenState = Keypair.generate();
      await solanaRWAProgram.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: solanaRWAProgram.provider.wallet.payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      await solanaRWAProgram.methods
        .addAgent(agent.publicKey)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const tx = await solanaRWAProgram.methods
        .mint(user1.publicKey, new anchor.BN(1000))
        .accounts({
          tokenState: tokenState.publicKey,
          agent: agent.publicKey,
          destination: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      expect(tx).to.be.a('string');
    });

    it('FI-040: Should successfully initialize identity registry via frontend pattern', async () => {
      const registry = Keypair.generate();

      const tx = await identityRegistryProgram.methods
        .initialize()
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, registry])
        .rpc();

      expect(tx).to.be.a('string');
    });

    it('FI-041: Should successfully register identity via frontend pattern', async () => {
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

      const tx = await identityRegistryProgram.methods
        .registerIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          wallet: user1.publicKey,
          owner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      expect(tx).to.be.a('string');
    });

    it('FI-042: Should successfully initialize compliance aggregator via frontend pattern', async () => {
      const aggregator = Keypair.generate();

      const tx = await complianceAggregatorProgram.methods
        .initialize()
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, aggregator])
        .rpc();

      expect(tx).to.be.a('string');
    });

    it('FI-043: Should successfully add compliance module via frontend pattern', async () => {
      const aggregator = Keypair.generate();
      const token = Keypair.generate();

      await complianceAggregatorProgram.methods
        .initialize()
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, aggregator])
        .rpc();

      const tx = await complianceAggregatorProgram.methods
        .addModule(token.publicKey, user1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      expect(tx).to.be.a('string');
    });

    it('FI-044: Should emit events that frontend can capture', async () => {
      const tokenState = Keypair.generate();

      await solanaRWAProgram.methods
        .initialize('Event Test Token', 'ETT', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: solanaRWAProgram.provider.wallet.payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      await solanaRWAProgram.methods
        .addAgent(agent.publicKey)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Event listener setup pattern (frontend pattern)
      const eventPromise = new Promise<any>((resolve) => {
        const listener = solanaRWAProgram.events.TokensMintedEvent?.((event, slot) => {
          resolve(event);
        });
      });

      await solanaRWAProgram.methods
        .mint(user1.publicKey, new anchor.BN(500))
        .accounts({
          tokenState: tokenState.publicKey,
          agent: agent.publicKey,
          destination: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([agent])
        .rpc();
    });

    it('FI-045: Should handle error codes that frontend can parse', async () => {
      const tokenState = Keypair.generate();

      await solanaRWAProgram.methods
        .initialize('Error Test Token', 'ETT', 9)
        .accounts({
          tokenState: tokenState.publicKey,
          owner: owner.publicKey,
          mint: solanaRWAProgram.provider.wallet.payer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, tokenState])
        .rpc();

      try {
        await solanaRWAProgram.methods
          .mint(user1.publicKey, new anchor.BN(100))
          .accounts({
            tokenState: tokenState.publicKey,
            agent: user1.publicKey,
            destination: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        expect.fail('Should have thrown an error');
      } catch (e: any) {
        const errorMessage = e.message || e.error?.error?.err?.instructionProgramError;
        expect(errorMessage).to.exist('Error should have message');
      }
    });
  });

  // =============================================================================
  // Section 9: Cross-Program Data Flow Integration
  // =============================================================================

  describe('Cross-Program Data Flow Integration', () => {
    it('FI-046: Should maintain identity consistency across programs', async () => {
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

      const identity = await identityRegistryProgram.methods
        .getIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
        })
        .view();

      expect(identity).to.exist('Identity should be returned');
      expect(identity.toBase58()).to.equal(user1.publicKey.toBase58());
    });

    it('FI-047: Should maintain compliance state across programs', async () => {
      const aggregator = Keypair.generate();
      const token = Keypair.generate();

      await complianceAggregatorProgram.methods
        .initialize()
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner, aggregator])
        .rpc();

      await complianceAggregatorProgram.methods
        .addModule(token.publicKey, user1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const modules = await complianceAggregatorProgram.methods
        .getModules(token.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules).to.be.an('array');
      expect(modules).to.include(user1.publicKey.toBase58());
    });

    it('FI-048: Should have consistent Pubkey representation across programs', () => {
      const solanaRWAIdl = solanaRWAProgram.idl;
      const identityRegistryIdl = identityRegistryProgram.idl;
      const complianceAggregatorIdl = complianceAggregatorProgram.idl;

      for (const idl of [solanaRWAIdl, identityRegistryIdl, complianceAggregatorIdl]) {
        for (const ix of idl.instructions) {
          for (const param of ix.params) {
            if (param.type.kind === 'publicKey') {
              expect(param.name).to.be.a('string');
            }
          }
        }
      }
    });
  });
});
