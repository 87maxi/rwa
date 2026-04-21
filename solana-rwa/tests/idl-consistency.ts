import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../target/types/solana_rwa';
import { IdentityRegistry } from '../target/types/identity_registry';
import { ComplianceAggregator } from '../target/types/compliance_aggregator';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Rust source code parsers - extract definitions from .rs files
// =============================================================================

/**
 * Extracts instruction names from Rust source code by parsing #[derive(Accounts)] structs
 * and their corresponding handler functions within #[program] module.
 */
function extractRustInstructions(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const instructions: string[] = [];

  // Find handler functions within #[program] module
  // Pattern: pub fn handler_name(ctx: Context<...>, ...) -> Result<...>
  const handlerRegex = /pub\s+fn\s+(\w+)\s*\(\s*ctx:\s*Context</g;
  let match;
  while ((match = handlerRegex.exec(content)) !== null) {
    instructions.push(match[1]);
  }

  return instructions;
}

/**
 * Extracts account struct names from Rust source code.
 * Looks for #[account] annotated structs.
 */
function extractRustAccounts(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const accounts: string[] = [];

  // Find #[account] annotated structs
  const accountRegex = /#\[account\]\s*\npub\s+struct\s+(\w+)/g;
  let match;
  while ((match = accountRegex.exec(content)) !== null) {
    accounts.push(match[1]);
  }

  return accounts;
}

/**
 * Extracts event struct names from Rust source code.
 * Looks for #[event] annotated structs.
 */
function extractRustEvents(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const events: string[] = [];

  // Find #[event] annotated structs
  const eventRegex = /#\[event\]\s*\npub\s+struct\s+(\w+)Event/g;
  let match;
  while ((match = eventRegex.exec(content)) !== null) {
    events.push(match[1] + 'Event');
  }

  return events;
}

/**
 * Extracts error codes from Rust source code.
 * Looks for #[error_code] enum variants.
 */
function extractRustErrorCodes(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors: string[] = [];

  // Find error codes within #[error_code] enum
  // Pattern: after #[error_code] enum ErrorCode { ... }
  const errorBlockRegex = /#\[error_code\]\s*pub\s+enum\s+ErrorCode\s*\{([^}]+)\}/s;
  const match = errorBlockRegex.exec(content);
  if (match) {
    const errorBlock = match[1];
    // Extract each error variant (lines that are just the error name)
    const errorVariantRegex = /^\s*(\w+),?\s*$/gm;
    let errorMatch;
    while ((errorMatch = errorVariantRegex.exec(errorBlock)) !== null) {
      const variant = errorMatch[1];
      // Skip comments and non-error lines
      if (!variant.startsWith('//') && variant.length > 0) {
        errors.push(variant);
      }
    }
  }

  return errors;
}

/**
 * Extracts account fields from Rust source code.
 */
function extractRustAccountFields(filePath: string, structName: string): Map<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fields = new Map<string, string>();

  // Find struct definition
  const structRegex = new RegExp(
    `pub\\s+struct\\s+${structName}\\s*\\{([^}]+)\\}`,
    's'
  );
  const match = structRegex.exec(content);
  if (match) {
    const structBody = match[1];
    // Extract field definitions: pub field_name: Type,
    const fieldRegex = /pub\s+(\w+)\s*:\s*(\w+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
      fields.set(fieldMatch[1], fieldMatch[2]);
    }
  }

  return fields;
}

// =============================================================================
// IDL parsing helpers
// =============================================================================

interface IDLInstruction {
  name: string;
  params: Array<{ name: string; type: unknown }>;
}

interface IDLAccount {
  name: string;
  fields: Array<{ name: string; type: unknown }>;
}

interface IDLEvent {
  name: string;
  fields: Array<{ name: string; type: unknown }>;
}

interface IDLError {
  code: number;
  msg: string;
}

interface IDL {
  name: string;
  version: string;
  instructions: IDLInstruction[];
  accounts?: IDLAccount[];
  events?: IDLEvent[];
  errors?: IDLError[];
}

/**
 * Loads and parses an IDL file from the target directory.
 */
function loadIDL(programName: string): IDL {
  const idlPath = path.join(__dirname, '..', 'target', 'idl', `${programName}.json`);
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL file not found: ${idlPath}. Run 'anchor build' first.`);
  }

  const content = fs.readFileSync(idlPath, 'utf-8');
  return JSON.parse(content) as IDL;
}

/**
 * Converts Rust snake_case to TypeScript camelCase.
 */
function rustToCamelCase(rustName: string): string {
  return rustName
    .split('_')
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Converts Rust PascalCase struct name to IDL snake_case.
 */
function rustToIdlName(pascalName: string): string {
  return pascalName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// =============================================================================
// Type mapping validation
// =============================================================================

/**
 * Maps Rust types to their Anchor IDL equivalents.
 */
const RUST_TO_IDL_TYPES: Record<string, string> = {
  'Pubkey': 'publicKey',
  'u64': 'u64',
  'u32': 'u32',
  'u16': 'u16',
  'u8': 'u8',
  'i64': 'i64',
  'i32': 'i32',
  'i16': 'i16',
  'i8': 'i8',
  'bool': 'bool',
  'String': 'string',
};

/**
 * Normalizes a type string for comparison.
 */
function normalizeType(typeStr: string): string {
  // Handle Vec<T>
  const vecMatch = typeStr.match(/^Vec<(.+)>$/);
  if (vecMatch) {
    return `array:${normalizeType(vecMatch[1])}`;
  }

  // Handle Option<T>
  const optionMatch = typeStr.match(/^Option<(.+)>$/);
  if (optionMatch) {
    return `option:${normalizeType(optionMatch[1])}`;
  }

  // Handle nested types
  if (typeStr.includes('<')) {
    const parts = typeStr.split('<');
    return parts.map(p => p.replace('>', '')).map(normalizeType).join(':');
  }

  return RUST_TO_IDL_TYPES[typeStr] || typeStr.toLowerCase();
}

/**
 * Extracts the base type from an IDL type definition.
 */
function extractIdlBaseType(idlType: unknown): string {
  if (typeof idlType === 'string') {
    return idlType;
  }

  if (typeof idlType === 'object' && idlType !== null) {
    const typeObj = idlType as Record<string, unknown>;

    // Handle vector type
    if ('vector' in typeObj) {
      return `array:${extractIdlBaseType(typeObj.vector)}`;
    }

    // Handle option type
    if ('option' in typeObj) {
      return `option:${extractIdlBaseType(typeObj.option)}`;
    }

    // Handle defined type
    if ('defined' in typeObj) {
      return String(typeObj.defined);
    }

    // Handle defined type with generics
    if ('defined' in typeObj && 'generics' in typeObj) {
      const defined = String(typeObj.defined);
      const generics = (typeObj.generics as unknown[]).map(g => extractIdlBaseType(g)).join(',');
      return `${defined}<${generics}>`;
    }
  }

  return String(idlType);
}

// =============================================================================
// TEST SUITE: IDL Consistency Tests
// =============================================================================

describe('IDL Consistency Tests', () => {
  // Program source file paths
  const SOLANA_RWA_SRC = path.join(__dirname, '..', 'programs', 'solana-rwa', 'src', 'lib.rs');
  const IDENTITY_REGISTRY_SRC = path.join(__dirname, '..', 'programs', 'identity-registry', 'src', 'lib.rs');
  const COMPLIANCE_AGGREGATOR_SRC = path.join(__dirname, '..', 'programs', 'compliance-aggregator', 'src', 'lib.rs');

  // Load IDLs
  let solanaRwaIdl: IDL;
  let identityRegistryIdl: IDL;
  let complianceAggregatorIdl: IDL;

  before(async () => {
    try {
      solanaRwaIdl = loadIDL('solana_rwa');
    } catch (error) {
      // IDL might not exist yet - tests will be skipped
      console.log('IDL not found - running structural tests only');
      solanaRwaIdl = { name: 'solana_rwa', version: '0.0.0', instructions: [] } as IDL;
    }

    try {
      identityRegistryIdl = loadIDL('identity_registry');
    } catch {
      identityRegistryIdl = { name: 'identity_registry', version: '0.0.0', instructions: [] } as IDL;
    }

    try {
      complianceAggregatorIdl = loadIDL('compliance_aggregator');
    } catch {
      complianceAggregatorIdl = { name: 'compliance_aggregator', version: '0.0.0', instructions: [] } as IDL;
    }
  });

  // =================================================================
  // Section 1: Instruction Consistency
  // =================================================================

  describe('Instruction Consistency', () => {
    describe('solana-rwa program', () => {
      const rustInstructions = extractRustInstructions(SOLANA_RWA_SRC);
      const idlInstructions = solanaRwaIdl.instructions.map(i => i.name);

      it('should have all Rust instructions present in IDL', () => {
        for (const rustInstr of rustInstructions) {
          const camelCase = rustToCamelCase(rustInstr);
          const found = idlInstructions.includes(camelCase) || idlInstructions.includes(rustInstr);
          expect(found, `Rust instruction '${rustInstr}' (camelCase: '${camelCase}') not found in IDL instructions: [${idlInstructions.join(', ')}]`).to.be.true;
        }
      });

      it('should not have extra instructions in IDL', () => {
        for (const idlInstr of idlInstructions) {
          const found = rustInstructions.includes(idlInstr) || rustInstructions.includes(rustToCamelCase(idlInstr));
          expect(found, `IDL instruction '${idlInstr}' not found in Rust source`).to.be.true;
        }
      });

      it('should have correct instruction count', () => {
        // Expected instructions: initialize, mint, burn, transfer, addAgent, removeAgent,
        // freezeAccount, unfreezeAccount, transferOwner, transferFreezeAuthority, getSupplyInfo
        const expectedCount = 11;
        expect(idlInstructions.length, 'Instruction count mismatch').to.equal(expectedCount);
      });

      it('should have all expected instruction names', () => {
        const expectedInstructions = [
          'initialize',
          'mint',
          'burn',
          'transfer',
          'addAgent',
          'removeAgent',
          'freezeAccount',
          'unfreezeAccount',
          'transferOwner',
          'transferFreezeAuthority',
          'getSupplyInfo',
        ];

        for (const expected of expectedInstructions) {
          expect(idlInstructions, `Missing expected instruction: ${expected}`).to.include(expected);
        }
      });
    });

    describe('identity-registry program', () => {
      const rustInstructions = extractRustInstructions(IDENTITY_REGISTRY_SRC);
      const idlInstructions = identityRegistryIdl.instructions.map(i => i.name);

      it('should have all Rust instructions present in IDL', () => {
        for (const rustInstr of rustInstructions) {
          const camelCase = rustToCamelCase(rustInstr);
          const found = idlInstructions.includes(camelCase) || idlInstructions.includes(rustInstr);
          expect(found, `Rust instruction '${rustInstr}' (camelCase: '${camelCase}') not found in IDL`).to.be.true;
        }
      });

      it('should have correct instruction count', () => {
        // Expected: initialize, registerIdentity, registerIdentityWithData, updateIdentity, removeIdentity, getIdentity
        const expectedCount = 6;
        expect(idlInstructions.length, 'Instruction count mismatch').to.equal(expectedCount);
      });

      it('should have all expected instruction names', () => {
        const expectedInstructions = [
          'initialize',
          'registerIdentity',
          'registerIdentityWithData',
          'updateIdentity',
          'removeIdentity',
          'getIdentity',
        ];

        for (const expected of expectedInstructions) {
          expect(idlInstructions, `Missing expected instruction: ${expected}`).to.include(expected);
        }
      });
    });

    describe('compliance-aggregator program', () => {
      const rustInstructions = extractRustInstructions(COMPLIANCE_AGGREGATOR_SRC);
      const idlInstructions = complianceAggregatorIdl.instructions.map(i => i.name);

      it('should have all Rust instructions present in IDL', () => {
        for (const rustInstr of rustInstructions) {
          const camelCase = rustToCamelCase(rustInstr);
          const found = idlInstructions.includes(camelCase) || idlInstructions.includes(rustInstr);
          expect(found, `Rust instruction '${rustInstr}' (camelCase: '${camelCase}') not found in IDL`).to.be.true;
        }
      });

      it('should have correct instruction count', () => {
        // Expected: initialize, addModule, removeModule, rebalanceModules, getState, getModuleCount, canTransfer, getModules
        const expectedCount = 8;
        expect(idlInstructions.length, 'Instruction count mismatch').to.equal(expectedCount);
      });

      it('should have all expected instruction names', () => {
        const expectedInstructions = [
          'initialize',
          'addModule',
          'removeModule',
          'rebalanceModules',
          'getState',
          'getModuleCount',
          'canTransfer',
          'getModules',
        ];

        for (const expected of expectedInstructions) {
          expect(idlInstructions, `Missing expected instruction: ${expected}`).to.include(expected);
        }
      });
    });
  });

  // =================================================================
  // Section 2: Account Consistency
  // =================================================================

  describe('Account Consistency', () => {
    describe('solana-rwa program', () => {
      const rustAccounts = extractRustAccounts(SOLANA_RWA_SRC);
      const idlAccounts = solanaRwaIdl.accounts?.map(a => a.name) || [];

      it('should have all Rust accounts present in IDL', () => {
        for (const rustAccount of rustAccounts) {
          const idlName = rustToIdlName(rustAccount);
          const found = idlAccounts.includes(idlName);
          expect(found, `Rust account '${rustAccount}' (IDL: '${idlName}') not found in IDL accounts: [${idlAccounts.join(', ')}]`).to.be.true;
        }
      });

      it('should have TokenState account with correct fields', () => {
        const tokenStateAccount = solanaRwaIdl.accounts?.find(a => a.name === 'tokenState');
        expect(tokenStateAccount, 'TokenState account should exist in IDL').to.not.be.undefined;

        if (tokenStateAccount) {
          const expectedFields = ['owner', 'freezeAuthority', 'name', 'symbol', 'decimals', 'totalSupply', 'nextIndex', 'balances', 'frozenAccounts', 'agents', 'complianceModules'];
          const actualFields = tokenStateAccount.fields?.map(f => f.name) || [];

          for (const field of expectedFields) {
            expect(actualFields, `Missing field '${field}' in TokenState`).to.include(field);
          }
        }
      });

      it('should have BalanceEntry type defined', () => {
        const balanceEntryType = solanaRwaIdl.types?.find(t => t.name === 'balanceEntry') ||
          solanaRwaIdl.accounts?.find(a => a.name === 'balanceEntry');
        expect(balanceEntryType, 'BalanceEntry type should exist in IDL').to.not.be.undefined;
      });

      it('should have FrozenEntry type defined', () => {
        const frozenEntryType = solanaRwaIdl.types?.find(t => t.name === 'frozenEntry') ||
          solanaRwaIdl.accounts?.find(a => a.name === 'frozenEntry');
        expect(frozenEntryType, 'FrozenEntry type should exist in IDL').to.not.be.undefined;
      });
    });

    describe('identity-registry program', () => {
      const rustAccounts = extractRustAccounts(IDENTITY_REGISTRY_SRC);
      const idlAccounts = identityRegistryIdl.accounts?.map(a => a.name) || [];

      it('should have all Rust accounts present in IDL', () => {
        for (const rustAccount of rustAccounts) {
          const idlName = rustToIdlName(rustAccount);
          const found = idlAccounts.includes(idlName);
          expect(found, `Rust account '${rustAccount}' (IDL: '${idlName}') not found in IDL accounts: [${idlAccounts.join(', ')}]`).to.be.true;
        }
      });

      it('should have IdentityRegistryState account with correct fields', () => {
        const registryAccount = identityRegistryIdl.accounts?.find(a => a.name === 'identityRegistryState');
        expect(registryAccount, 'IdentityRegistryState account should exist in IDL').to.not.be.undefined;

        if (registryAccount) {
          const expectedFields = ['owner', 'nextIndex', 'registeredAddresses', 'identityMap'];
          const actualFields = registryAccount.fields?.map(f => f.name) || [];

          for (const field of expectedFields) {
            expect(actualFields, `Missing field '${field}' in IdentityRegistryState`).to.include(field);
          }
        }
      });

      it('should have IdentityEntry type defined', () => {
        const identityEntryType = identityRegistryIdl.types?.find(t => t.name === 'identityEntry') ||
          identityRegistryIdl.accounts?.find(a => a.name === 'identityEntry');
        expect(identityEntryType, 'IdentityEntry type should exist in IDL').to.not.be.undefined;
      });
    });

    describe('compliance-aggregator program', () => {
      const rustAccounts = extractRustAccounts(COMPLIANCE_AGGREGATOR_SRC);
      const idlAccounts = complianceAggregatorIdl.accounts?.map(a => a.name) || [];

      it('should have all Rust accounts present in IDL', () => {
        for (const rustAccount of rustAccounts) {
          const idlName = rustToIdlName(rustAccount);
          const found = idlAccounts.includes(idlName);
          expect(found, `Rust account '${rustAccount}' (IDL: '${idlName}') not found in IDL accounts: [${idlAccounts.join(', ')}]`).to.be.true;
        }
      });

      it('should have ComplianceAggregatorState account with correct fields', () => {
        const aggregatorAccount = complianceAggregatorIdl.accounts?.find(a => a.name === 'complianceAggregatorState');
        expect(aggregatorAccount, 'ComplianceAggregatorState account should exist in IDL').to.not.be.undefined;

        if (aggregatorAccount) {
          const expectedFields = ['owner', 'nextIndex', 'tokenModules'];
          const actualFields = aggregatorAccount.fields?.map(f => f.name) || [];

          for (const field of expectedFields) {
            expect(actualFields, `Missing field '${field}' in ComplianceAggregatorState`).to.include(field);
          }
        }
      });

      it('should have TokenModuleEntry type defined', () => {
        const tokenModuleType = complianceAggregatorIdl.types?.find(t => t.name === 'tokenModuleEntry') ||
          complianceAggregatorIdl.accounts?.find(a => a.name === 'tokenModuleEntry');
        expect(tokenModuleType, 'TokenModuleEntry type should exist in IDL').to.not.be.undefined;
      });
    });
  });

  // =================================================================
  // Section 3: Event Consistency
  // =================================================================

  describe('Event Consistency', () => {
    describe('solana-rwa program', () => {
      const rustEvents = extractRustEvents(SOLANA_RWA_SRC);
      const idlEvents = solanaRwaIdl.events?.map(e => e.name) || [];

      it('should have all Rust events present in IDL', () => {
        for (const rustEvent of rustEvents) {
          const idlName = rustToIdlName(rustEvent.replace('Event', ''));
          const found = idlEvents.includes(idlName + 'Event') || idlEvents.includes(idlName);
          expect(found, `Rust event '${rustEvent}' (IDL: '${idlName}') not found in IDL events: [${idlEvents.join(', ')}]`).to.be.true;
        }
      });

      it('should have all expected events', () => {
        const expectedEvents = [
          'ownerTransferredEvent',
          'tokensMintedEvent',
          'accountFrozenEvent',
          'accountUnfrozenEvent',
          'freezeAuthorityTransferredEvent',
        ];

        for (const expected of expectedEvents) {
          expect(idlEvents, `Missing expected event: ${expected}`).to.include(expected);
        }
      });

      it('should have correct event field counts', () => {
        // OwnerTransferredEvent: old_owner, new_owner, transferred_by (3 fields)
        const ownerTransferred = solanaRwaIdl.events?.find(e => e.name === 'ownerTransferredEvent');
        expect(ownerTransferred?.fields?.length, 'OwnerTransferredEvent should have 3 fields').to.equal(3);

        // TokensMintedEvent: to, amount, total_supply, minted_by (4 fields)
        const tokensMinted = solanaRwaIdl.events?.find(e => e.name === 'tokensMintedEvent');
        expect(tokensMinted?.fields?.length, 'TokensMintedEvent should have 4 fields').to.equal(4);

        // AccountFrozenEvent: account, frozen_by (2 fields)
        const accountFrozen = solanaRwaIdl.events?.find(e => e.name === 'accountFrozenEvent');
        expect(accountFrozen?.fields?.length, 'AccountFrozenEvent should have 2 fields').to.equal(2);
      });
    });

    describe('identity-registry program', () => {
      const rustEvents = extractRustEvents(IDENTITY_REGISTRY_SRC);
      const idlEvents = identityRegistryIdl.events?.map(e => e.name) || [];

      it('should have all Rust events present in IDL', () => {
        for (const rustEvent of rustEvents) {
          const idlName = rustToIdlName(rustEvent.replace('Event', ''));
          const found = idlEvents.includes(idlName + 'Event') || idlEvents.includes(idlName);
          expect(found, `Rust event '${rustEvent}' (IDL: '${idlName}') not found in IDL events: [${idlEvents.join(', ')}]`).to.be.true;
        }
      });

      it('should have all expected events', () => {
        const expectedEvents = [
          'identityRegisteredEvent',
          'identityUpdatedEvent',
          'identityRemovedEvent',
          'identityRegisteredWithDataEvent',
        ];

        for (const expected of expectedEvents) {
          expect(idlEvents, `Missing expected event: ${expected}`).to.include(expected);
        }
      });
    });

    describe('compliance-aggregator program', () => {
      const rustEvents = extractRustEvents(COMPLIANCE_AGGREGATOR_SRC);
      const idlEvents = complianceAggregatorIdl.events?.map(e => e.name) || [];

      it('should have all Rust events present in IDL', () => {
        for (const rustEvent of rustEvents) {
          const idlName = rustToIdlName(rustEvent.replace('Event', ''));
          const found = idlEvents.includes(idlName + 'Event') || idlEvents.includes(idlName);
          expect(found, `Rust event '${rustEvent}' (IDL: '${idlName}') not found in IDL events: [${idlEvents.join(', ')}]`).to.be.true;
        }
      });

      it('should have all expected events', () => {
        const expectedEvents = [
          'moduleAddedEvent',
          'moduleRemovedEvent',
          'transferCheckEvent',
          'modulesRebalancedEvent',
        ];

        for (const expected of expectedEvents) {
          expect(idlEvents, `Missing expected event: ${expected}`).to.include(expected);
        }
      });
    });
  });

  // =================================================================
  // Section 4: Error Code Consistency
  // =================================================================

  describe('Error Code Consistency', () => {
    describe('solana-rwa program', () => {
      const rustErrors = extractRustErrorCodes(SOLANA_RWA_SRC);
      const idlErrors = solanaRwaIdl.errors?.map(e => e.msg) || [];

      it('should have all Rust error codes present in IDL', () => {
        for (const rustError of rustErrors) {
          const found = idlErrors.some(msg => msg.toLowerCase().includes(rustError.toLowerCase().replace(/([A-Z])/g, '_$1').substring(1))) ||
                        idlErrors.some(msg => msg.toLowerCase().includes(rustError.toLowerCase()));
          expect(found, `Rust error '${rustError}' not found in IDL errors: [${idlErrors.join(', ')}]`).to.be.true;
        }
      });

      it('should have all expected error codes', () => {
        const expectedErrors = [
          'unauthorized',
          'insufficient balance',
          'account frozen',
          'agent already exists',
          'invalid amount',
          'supply exceeded',
          'supply overflow',
          'new owner cannot be the same',
          'caller is not the freeze authority',
          'new freeze authority cannot be the same',
        ];

        const lowerIdlErrors = idlErrors.map(e => e.toLowerCase());
        for (const expected of expectedErrors) {
          const found = lowerIdlErrors.some(msg => msg.includes(expected.split(' ')[0]));
          expect(found, `Missing expected error containing: ${expected}`).to.be.true;
        }
      });

      it('should have correct error code count', () => {
        const expectedCount = 10;
        expect(idlErrors.length, 'Error code count mismatch').to.equal(expectedCount);
      });
    });

    describe('identity-registry program', () => {
      const rustErrors = extractRustErrorCodes(IDENTITY_REGISTRY_SRC);
      const idlErrors = identityRegistryIdl.errors?.map(e => e.msg) || [];

      it('should have all Rust error codes present in IDL', () => {
        for (const rustError of rustErrors) {
          const found = idlErrors.some(msg => msg.toLowerCase().includes(rustError.toLowerCase()));
          expect(found, `Rust error '${rustError}' not found in IDL errors: [${idlErrors.join(', ')}]`).to.be.true;
        }
      });

      it('should have all expected error codes', () => {
        const expectedErrors = [
          'wallet already registered',
          'wallet not registered',
          'caller is not the identity owner',
          'string length exceeds',
        ];

        const lowerIdlErrors = idlErrors.map(e => e.toLowerCase());
        for (const expected of expectedErrors) {
          const found = lowerIdlErrors.some(msg => msg.includes(expected.split(' ')[0]));
          expect(found, `Missing expected error containing: ${expected}`).to.be.true;
        }
      });

      it('should have correct error code count', () => {
        const expectedCount = 4;
        expect(idlErrors.length, 'Error code count mismatch').to.equal(expectedCount);
      });
    });

    describe('compliance-aggregator program', () => {
      const rustErrors = extractRustErrorCodes(COMPLIANCE_AGGREGATOR_SRC);
      const idlErrors = complianceAggregatorIdl.errors?.map(e => e.msg) || [];

      it('should have all Rust error codes present in IDL', () => {
        for (const rustError of rustErrors) {
          const found = idlErrors.some(msg => msg.toLowerCase().includes(rustError.toLowerCase()));
          expect(found, `Rust error '${rustError}' not found in IDL errors: [${idlErrors.join(', ')}]`).to.be.true;
        }
      });

      it('should have all expected error codes', () => {
        const expectedErrors = [
          'token not registered',
          'unauthorized',
          'module already exists',
          'wallet not kyc verified',
          'balance limit exceeded',
          'max holders exceeded',
          'transfer is locked',
          'zero amount',
          'invalid address',
          'transfer amount exceeded',
        ];

        const lowerIdlErrors = idlErrors.map(e => e.toLowerCase());
        for (const expected of expectedErrors) {
          const found = lowerIdlErrors.some(msg => msg.includes(expected.split(' ')[0]));
          expect(found, `Missing expected error containing: ${expected}`).to.be.true;
        }
      });

      it('should have correct error code count', () => {
        const expectedCount = 10;
        expect(idlErrors.length, 'Error code count mismatch').to.equal(expectedCount);
      });
    });
  });

  // =================================================================
  // Section 5: Type Consistency
  // =================================================================

  describe('Type Consistency', () => {
    describe('solana-rwa program', () => {
      it('should have correct type mappings for TokenState fields', () => {
        const tokenStateAccount = solanaRwaIdl.accounts?.find(a => a.name === 'tokenState');
        if (!tokenStateAccount?.fields) return;

        const fieldTypes = new Map(tokenStateAccount.fields.map(f => [f.name, extractIdlBaseType(f.type)]));

        // owner: Pubkey -> publicKey
        expect(fieldTypes.get('owner')).to.equal('publicKey');

        // freezeAuthority: Pubkey -> publicKey
        expect(fieldTypes.get('freezeAuthority')).to.equal('publicKey');

        // name: String -> string
        expect(fieldTypes.get('name')).to.equal('string');

        // symbol: String -> string
        expect(fieldTypes.get('symbol')).to.equal('string');

        // decimals: u8 -> u8
        expect(fieldTypes.get('decimals')).to.equal('u8');

        // totalSupply: u64 -> u64
        expect(fieldTypes.get('totalSupply')).to.equal('u64');

        // balances: Vec<BalanceEntry> -> array:balanceEntry
        const balancesType = fieldTypes.get('balances');
        expect(balancesType).to.satisfy(
          (t: string) => t === 'array:balanceEntry' || t?.includes('balanceEntry') || t === 'vector'
        );
      });

      it('should have correct BalanceEntry field types', () => {
        const balanceEntry = solanaRwaIdl.types?.find(t => t.name === 'balanceEntry') ||
          solanaRwaIdl.accounts?.find(a => a.name === 'balanceEntry');

        if (balanceEntry && 'fields' in balanceEntry) {
          const fieldTypes = new Map((balanceEntry as { fields: Array<{ name: string; type: unknown }> }).fields.map(f => [f.name, extractIdlBaseType(f.type)]));

          expect(fieldTypes.get('key')).to.equal('publicKey');
          expect(fieldTypes.get('value')).to.equal('u64');
        }
      });
    });

    describe('identity-registry program', () => {
      it('should have correct type mappings for IdentityRegistryState fields', () => {
        const registryAccount = identityRegistryIdl.accounts?.find(a => a.name === 'identityRegistryState');
        if (!registryAccount?.fields) return;

        const fieldTypes = new Map(registryAccount.fields.map(f => [f.name, extractIdlBaseType(f.type)]));

        expect(fieldTypes.get('owner')).to.equal('publicKey');
        expect(fieldTypes.get('nextIndex')).to.equal('u64');

        const registeredAddressesType = fieldTypes.get('registeredAddresses');
        expect(registeredAddressesType).to.satisfy(
          (t: string) => t === 'array:publicKey' || t === 'vector' || t?.includes('publicKey')
        );
      });

      it('should have correct IdentityEntry field types', () => {
        const identityEntry = identityRegistryIdl.types?.find(t => t.name === 'identityEntry') ||
          identityRegistryIdl.accounts?.find(a => a.name === 'identityEntry');

        if (identityEntry && 'fields' in identityEntry) {
          const fieldTypes = new Map((identityEntry as { fields: Array<{ name: string; type: unknown }> }).fields.map(f => [f.name, extractIdlBaseType(f.type)]));

          expect(fieldTypes.get('wallet')).to.equal('publicKey');
          expect(fieldTypes.get('identity')).to.equal('publicKey');
        }
      });
    });

    describe('compliance-aggregator program', () => {
      it('should have correct type mappings for ComplianceAggregatorState fields', () => {
        const aggregatorAccount = complianceAggregatorIdl.accounts?.find(a => a.name === 'complianceAggregatorState');
        if (!aggregatorAccount?.fields) return;

        const fieldTypes = new Map(aggregatorAccount.fields.map(f => [f.name, extractIdlBaseType(f.type)]));

        expect(fieldTypes.get('owner')).to.equal('publicKey');
        expect(fieldTypes.get('nextIndex')).to.equal('u64');

        const tokenModulesType = fieldTypes.get('tokenModules');
        expect(tokenModulesType).to.satisfy(
          (t: string) => t === 'array:tokenModuleEntry' || t === 'vector' || t?.includes('tokenModuleEntry')
        );
      });

      it('should have correct TokenModuleEntry field types', () => {
        const tokenModuleEntry = complianceAggregatorIdl.types?.find(t => t.name === 'tokenModuleEntry') ||
          complianceAggregatorIdl.accounts?.find(a => a.name === 'tokenModuleEntry');

        if (tokenModuleEntry && 'fields' in tokenModuleEntry) {
          const fieldTypes = new Map((tokenModuleEntry as { fields: Array<{ name: string; type: unknown }> }).fields.map(f => [f.name, extractIdlBaseType(f.type)]));

          expect(fieldTypes.get('token')).to.equal('publicKey');
          expect(fieldTypes.get('module')).to.equal('publicKey');
        }
      });
    });
  });

  // =================================================================
  // Section 6: Instruction Parameter Consistency
  // =================================================================

  describe('Instruction Parameter Consistency', () => {
    describe('solana-rwa program', () => {
      it('should have correct initialize instruction parameters', () => {
        const initialize = solanaRwaIdl.instructions.find(i => i.name === 'initialize');
        expect(initialize, 'initialize instruction should exist').to.not.be.undefined;

        if (initialize) {
          const paramNames = initialize.params.map(p => p.name);
          // After 'ctx', should have: name, symbol, decimals
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('name');
          expect(dataParams).to.include('symbol');
          expect(dataParams).to.include('decimals');
        }
      });

      it('should have correct mint instruction parameters', () => {
        const mint = solanaRwaIdl.instructions.find(i => i.name === 'mint');
        expect(mint, 'mint instruction should exist').to.not.be.undefined;

        if (mint) {
          const paramNames = mint.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('to');
          expect(dataParams).to.include('amount');
        }
      });

      it('should have correct transfer instruction parameters', () => {
        const transfer = solanaRwaIdl.instructions.find(i => i.name === 'transfer');
        expect(transfer, 'transfer instruction should exist').to.not.be.undefined;

        if (transfer) {
          const paramNames = transfer.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('from');
          expect(dataParams).to.include('to');
          expect(dataParams).to.include('amount');
        }
      });

      it('should have correct addAgent instruction parameters', () => {
        const addAgent = solanaRwaIdl.instructions.find(i => i.name === 'addAgent');
        expect(addAgent, 'addAgent instruction should exist').to.not.be.undefined;

        if (addAgent) {
          const paramNames = addAgent.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('agent');
        }
      });

      it('should have correct transferOwner instruction parameters', () => {
        const transferOwner = solanaRwaIdl.instructions.find(i => i.name === 'transferOwner');
        expect(transferOwner, 'transferOwner instruction should exist').to.not.be.undefined;

        if (transferOwner) {
          const paramNames = transferOwner.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('newOwner');
        }
      });
    });

    describe('identity-registry program', () => {
      it('should have correct registerIdentity instruction parameters', () => {
        const registerIdentity = identityRegistryIdl.instructions.find(i => i.name === 'registerIdentity');
        expect(registerIdentity, 'registerIdentity instruction should exist').to.not.be.undefined;

        if (registerIdentity) {
          const paramNames = registerIdentity.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('wallet');
          expect(dataParams).to.include('identity');
        }
      });

      it('should have correct registerIdentityWithData instruction parameters', () => {
        const registerWithData = identityRegistryIdl.instructions.find(i => i.name === 'registerIdentityWithData');
        expect(registerWithData, 'registerIdentityWithData instruction should exist').to.not.be.undefined;

        if (registerWithData) {
          const paramNames = registerWithData.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('wallet');
          expect(dataParams).to.include('name');
          expect(dataParams).to.include('symbol');
          expect(dataParams).to.include('identityData');
          expect(dataParams).to.include('metadataUri');
        }
      });

      it('should have correct updateIdentity instruction parameters', () => {
        const updateIdentity = identityRegistryIdl.instructions.find(i => i.name === 'updateIdentity');
        expect(updateIdentity, 'updateIdentity instruction should exist').to.not.be.undefined;

        if (updateIdentity) {
          const paramNames = updateIdentity.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('wallet');
          expect(dataParams).to.include('newIdentity');
        }
      });
    });

    describe('compliance-aggregator program', () => {
      it('should have correct addModule instruction parameters', () => {
        const addModule = complianceAggregatorIdl.instructions.find(i => i.name === 'addModule');
        expect(addModule, 'addModule instruction should exist').to.not.be.undefined;

        if (addModule) {
          const paramNames = addModule.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('token');
          expect(dataParams).to.include('module');
        }
      });

      it('should have correct canTransfer instruction parameters', () => {
        const canTransfer = complianceAggregatorIdl.instructions.find(i => i.name === 'canTransfer');
        expect(canTransfer, 'canTransfer instruction should exist').to.not.be.undefined;

        if (canTransfer) {
          const paramNames = canTransfer.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('token');
          expect(dataParams).to.include('from');
          expect(dataParams).to.include('to');
          expect(dataParams).to.include('amount');
          expect(dataParams).to.include('senderKyc');
          expect(dataParams).to.include('recipientKyc');
          expect(dataParams).to.include('senderBalance');
          expect(dataParams).to.include('recipientBalance');
          expect(dataParams).to.include('totalHolders');
        }
      });

      it('should have correct getState instruction parameters', () => {
        const getState = complianceAggregatorIdl.instructions.find(i => i.name === 'getState');
        expect(getState, 'getState instruction should exist').to.not.be.undefined;

        if (getState) {
          const paramNames = getState.params.map(p => p.name);
          const dataParams = paramNames.filter(n => n !== 'ctx');
          expect(dataParams).to.include('token');
        }
      });
    });
  });

  // =================================================================
  // Section 7: IDL Structure Validation
  // =================================================================

  describe('IDL Structure Validation', () => {
    it('solana-rwa IDL should have valid structure', () => {
      expect(solanaRwaIdl.name).to.equal('solana_rwa');
      expect(solanaRwaIdl.version).to.match(/^\d+\.\d+\.\d+$/);
      expect(solanaRwaIdl.instructions).to.be.an('array');
      expect(solanaRwaIdl.instructions.length).to.be.greaterThan(0);
    });

    it('identity-registry IDL should have valid structure', () => {
      expect(identityRegistryIdl.name).to.equal('identity_registry');
      expect(identityRegistryIdl.version).to.match(/^\d+\.\d+\.\d+$/);
      expect(identityRegistryIdl.instructions).to.be.an('array');
      expect(identityRegistryIdl.instructions.length).to.be.greaterThan(0);
    });

    it('compliance-aggregator IDL should have valid structure', () => {
      expect(complianceAggregatorIdl.name).to.equal('compliance_aggregator');
      expect(complianceAggregatorIdl.version).to.match(/^\d+\.\d+\.\d+$/);
      expect(complianceAggregatorIdl.instructions).to.be.an('array');
      expect(complianceAggregatorIdl.instructions.length).to.be.greaterThan(0);
    });

    it('all IDLs should have unique program names', () => {
      const names = new Set([solanaRwaIdl.name, identityRegistryIdl.name, complianceAggregatorIdl.name]);
      expect(names.size).to.equal(3);
    });

    it('all IDLs should have consistent version format', () => {
      const versionRegex = /^\d+\.\d+\.\d+$/;
      expect(solanaRwaIdl.version).to.match(versionRegex);
      expect(identityRegistryIdl.version).to.match(versionRegex);
      expect(complianceAggregatorIdl.version).to.match(versionRegex);
    });
  });

  // =================================================================
  // Section 8: Event Field Consistency
  // =================================================================

  describe('Event Field Consistency', () => {
    describe('solana-rwa events', () => {
      it('TokensMintedEvent should have correct field types', () => {
        const event = solanaRwaIdl.events?.find(e => e.name === 'tokensMintedEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('to')).to.equal('publicKey');
        expect(fieldTypes.get('amount')).to.equal('u64');
        expect(fieldTypes.get('totalSupply')).to.equal('u64');
        expect(fieldTypes.get('mintedBy')).to.equal('publicKey');
      });

      it('OwnerTransferredEvent should have correct field types', () => {
        const event = solanaRwaIdl.events?.find(e => e.name === 'ownerTransferredEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('oldOwner')).to.equal('publicKey');
        expect(fieldTypes.get('newOwner')).to.equal('publicKey');
        expect(fieldTypes.get('transferredBy')).to.equal('publicKey');
      });

      it('FreezeAuthorityTransferredEvent should have correct field types', () => {
        const event = solanaRwaIdl.events?.find(e => e.name === 'freezeAuthorityTransferredEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('oldFreezeAuthority')).to.equal('publicKey');
        expect(fieldTypes.get('newFreezeAuthority')).to.equal('publicKey');
        expect(fieldTypes.get('transferredBy')).to.equal('publicKey');
      });
    });

    describe('identity-registry events', () => {
      it('IdentityRegisteredEvent should have correct field types', () => {
        const event = identityRegistryIdl.events?.find(e => e.name === 'identityRegisteredEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('wallet')).to.equal('publicKey');
        expect(fieldTypes.get('identity')).to.equal('publicKey');
        expect(fieldTypes.get('registeredBy')).to.equal('publicKey');
      });

      it('IdentityUpdatedEvent should have correct field types', () => {
        const event = identityRegistryIdl.events?.find(e => e.name === 'identityUpdatedEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('wallet')).to.equal('publicKey');
        expect(fieldTypes.get('newIdentity')).to.equal('publicKey');
        expect(fieldTypes.get('updatedBy')).to.equal('publicKey');
        expect(fieldTypes.get('isAdminOverride')).to.equal('bool');
      });

      it('IdentityRegisteredWithDataEvent should have correct field types', () => {
        const event = identityRegistryIdl.events?.find(e => e.name === 'identityRegisteredWithDataEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('wallet')).to.equal('publicKey');
        expect(fieldTypes.get('name')).to.equal('string');
        expect(fieldTypes.get('symbol')).to.equal('string');
        expect(fieldTypes.get('identityData')).to.equal('string');
        expect(fieldTypes.get('metadataUri')).to.equal('string');
        expect(fieldTypes.get('registeredBy')).to.equal('publicKey');
      });
    });

    describe('compliance-aggregator events', () => {
      it('ModuleAddedEvent should have correct field types', () => {
        const event = complianceAggregatorIdl.events?.find(e => e.name === 'moduleAddedEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('token')).to.equal('publicKey');
        expect(fieldTypes.get('module')).to.equal('publicKey');
        expect(fieldTypes.get('index')).to.equal('u64');
        expect(fieldTypes.get('addedBy')).to.equal('publicKey');
      });

      it('TransferCheckEvent should have correct field types', () => {
        const event = complianceAggregatorIdl.events?.find(e => e.name === 'transferCheckEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('token')).to.equal('publicKey');
        expect(fieldTypes.get('from')).to.equal('publicKey');
        expect(fieldTypes.get('to')).to.equal('publicKey');
        expect(fieldTypes.get('amount')).to.equal('u64');
        expect(fieldTypes.get('allowed')).to.equal('bool');
        expect(fieldTypes.get('reason')).to.equal('string');
      });

      it('ModulesRebalancedEvent should have correct field types', () => {
        const event = complianceAggregatorIdl.events?.find(e => e.name === 'modulesRebalancedEvent');
        if (!event?.fields) return;

        const fieldTypes = new Map(event.fields.map(f => [f.name, extractIdlBaseType(f.type)]));
        expect(fieldTypes.get('token')).to.equal('publicKey');
        expect(fieldTypes.get('module')).to.equal('publicKey');
        expect(fieldTypes.get('oldCount')).to.equal('u64');
        expect(fieldTypes.get('newCount')).to.equal('u64');
        expect(fieldTypes.get('rebalancedBy')).to.equal('publicKey');
      });
    });
  });
});
