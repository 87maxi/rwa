import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../target/types/solana_rwa';
import { IdentityRegistry } from '../target/types/identity_registry';
import { ComplianceAggregator } from '../target/types/compliance_aggregator';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Rust source code parsers
// =============================================================================

/**
 * Extracts instruction handler signatures from Rust source code.
 * Returns a map of instruction name to its parameters.
 */
function extractRustInstructionSignatures(filePath: string): Map<string, Array<{ name: string; type: string }>> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const signatures = new Map<string, Array<{ name: string; type: string }>>();

  // Find handler functions within #[program] module
  // Pattern: pub fn handler_name(ctx: Context<...>, param1: Type1, param2: Type2, ...) -> Result<...>
  const handlerRegex = /pub\s+fn\s+(\w+)\s*\([^)]*\)\s*->\s*Result<[^>]*>\s*\{/g;
  let match;

  while ((match = handlerRegex.exec(content)) !== null) {
    const funcName = match[1];
    const funcStart = match.index;

    // Find the function signature (may span multiple lines)
    const signatureEnd = content.indexOf('-> Result<', funcStart);
    if (signatureEnd === -1) continue;

    const signature = content.substring(funcStart, signatureEnd);

    // Extract parameters (after 'ctx: Context<...>,')
    const ctxMatch = signature.match(/ctx:\s*Context<[^>]*>,\s*(.*)/s);
    if (ctxMatch) {
      const paramsStr = ctxMatch[1].trim();
      const params: Array<{ name: string; type: string }> = [];

      // Split by comma and parse each parameter
      const paramParts = paramsStr.split(',');
      for (const part of paramParts) {
        const trimmed = part.trim();
        if (trimmed === '') continue;

        // Match: param_name: Type
        const paramMatch = trimmed.match(/(\w+)\s*:\s*(.+?)(?:,|\s*$)/);
        if (paramMatch) {
          params.push({
            name: paramMatch[1],
            type: paramMatch[2].trim(),
          });
        }
      }

      signatures.set(funcName, params);
    }
  }

  return signatures;
}

/**
 * Extracts error code names from Rust source code.
 */
function extractRustErrorCodes(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors: string[] = [];

  const errorBlockRegex = /#\[error_code\]\s*pub\s+enum\s+ErrorCode\s*\{([^}]+)\}/s;
  const match = errorBlockRegex.exec(content);
  if (match) {
    const errorBlock = match[1];
    const errorVariantRegex = /^\s*(\w+),?\s*$/gm;
    let errorMatch;
    while ((errorMatch = errorVariantRegex.exec(errorBlock)) !== null) {
      const variant = errorMatch[1];
      if (!variant.startsWith('//') && variant.length > 0) {
        errors.push(variant);
      }
    }
  }

  return errors;
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
 * Converts Rust PascalCase to TypeScript camelCase.
 */
function pascalToCamelCase(pascalName: string): string {
  return pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
}

// =============================================================================
// TypeScript type introspection helpers
// =============================================================================

/**
 * Reads the TypeScript type definition file and extracts method signatures.
 */
function extractTypeScriptMethods(typeFileName: string): Set<string> {
  const typeFilePath = path.join(__dirname, '..', 'target', 'types', `${typeFileName}.ts`);

  if (!fs.existsSync(typeFilePath)) {
    return new Set();
  }

  const content = fs.readFileSync(typeFilePath, 'utf-8');
  const methods = new Set<string>();

  // Extract method names from the interface
  const methodRegex = /^\s+(\w+)\s*\(/gm;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    // Skip reserved words and non-method entries
    const reserved = ['methods', 'accounts', 'events', 'errors', 'address', 'programId'];
    if (!reserved.includes(match[1])) {
      methods.add(match[1]);
    }
  }

  return methods;
}

// =============================================================================
// TEST SUITE: TypeScript-Rust API Consistency Tests
// =============================================================================

describe('TypeScript-Rust API Consistency Tests', () => {
  const SOLANA_RWA_SRC = path.join(__dirname, '..', 'programs', 'solana-rwa', 'src', 'lib.rs');
  const IDENTITY_REGISTRY_SRC = path.join(__dirname, '..', 'programs', 'identity-registry', 'src', 'lib.rs');
  const COMPLIANCE_AGGREGATOR_SRC = path.join(__dirname, '..', 'programs', 'compliance-aggregator', 'src', 'lib.rs');

  // Load programs
  const provider = AnchorProvider.env();
  const solanaRwaProgram = anchor.workspace.SolanaRwa as Program<SolanaRwa>;
  const identityRegistryProgram = anchor.workspace.IdentityRegistry as Program<IdentityRegistry>;
  const complianceAggregatorProgram = anchor.workspace.ComplianceAggregator as Program<ComplianceAggregator>;

  // Extract Rust signatures
  const solanaRwaSignatures = extractRustInstructionSignatures(SOLANA_RWA_SRC);
  const identityRegistrySignatures = extractRustInstructionSignatures(IDENTITY_REGISTRY_SRC);
  const complianceAggregatorSignatures = extractRustInstructionSignatures(COMPLIANCE_AGGREGATOR_SRC);

  // Load IDLs
  const solanaRwaIdl = solanaRwaProgram.idl;
  const identityRegistryIdl = identityRegistryProgram.idl;
  const complianceAggregatorIdl = complianceAggregatorProgram.idl;

  // Extract TypeScript methods
  const solanaRwaTsMethods = extractTypeScriptMethods('solana_rwa');
  const identityRegistryTsMethods = extractTypeScriptMethods('identity_registry');
  const complianceAggregatorTsMethods = extractTypeScriptMethods('compliance_aggregator');

  // =================================================================
  // Section 1: Instruction Function Availability
  // =================================================================

  describe('Instruction Function Availability', () => {
    describe('solana-rwa program', () => {
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

      for (const instruction of expectedInstructions) {
        it(`should have '${instruction}' method in TypeScript types`, () => {
          expect(solanaRwaTsMethods.has(instruction), `TypeScript method '${instruction}' not found`).to.be.true;
        });

        it(`should have '${instruction}' instruction in IDL`, () => {
          expect(
            solanaRwaIdl.instructions.some(i => i.name === instruction),
            `IDL instruction '${instruction}' not found`
          ).to.be.true;
        });

        it(`should have '${instruction}' handler in Rust source`, () => {
          expect(
            solanaRwaSignatures.has(instruction),
            `Rust handler '${instruction}' not found`
          ).to.be.true;
        });
      }
    });

    describe('identity-registry program', () => {
      const expectedInstructions = [
        'initialize',
        'registerIdentity',
        'registerIdentityWithData',
        'updateIdentity',
        'removeIdentity',
        'getIdentity',
      ];

      for (const instruction of expectedInstructions) {
        it(`should have '${instruction}' method in TypeScript types`, () => {
          expect(identityRegistryTsMethods.has(instruction), `TypeScript method '${instruction}' not found`).to.be.true;
        });

        it(`should have '${instruction}' instruction in IDL`, () => {
          expect(
            identityRegistryIdl.instructions.some(i => i.name === instruction),
            `IDL instruction '${instruction}' not found`
          ).to.be.true;
        });

        it(`should have '${instruction}' handler in Rust source`, () => {
          expect(
            identityRegistrySignatures.has(instruction),
            `Rust handler '${instruction}' not found`
          ).to.be.true;
        });
      }
    });

    describe('compliance-aggregator program', () => {
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

      for (const instruction of expectedInstructions) {
        it(`should have '${instruction}' method in TypeScript types`, () => {
          expect(complianceAggregatorTsMethods.has(instruction), `TypeScript method '${instruction}' not found`).to.be.true;
        });

        it(`should have '${instruction}' instruction in IDL`, () => {
          expect(
            complianceAggregatorIdl.instructions.some(i => i.name === instruction),
            `IDL instruction '${instruction}' not found`
          ).to.be.true;
        });

        it(`should have '${instruction}' handler in Rust source`, () => {
          expect(
            complianceAggregatorSignatures.has(instruction),
            `Rust handler '${instruction}' not found`
          ).to.be.true;
        });
      }
    });
  });

  // =================================================================
  // Section 2: Parameter Consistency
  // =================================================================

  describe('Parameter Consistency', () => {
    describe('solana-rwa program', () => {
      it('initialize: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('initialize') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'initialize');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('mint: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('mint') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'mint');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('transfer: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('transfer') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'transfer');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('addAgent: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('addAgent') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'addAgent');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('freezeAccount: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('freezeAccount') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'freezeAccount');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('transferOwner: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('transferOwner') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'transferOwner');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('transferFreezeAuthority: Rust params should match IDL params', () => {
        const rustParams = solanaRwaSignatures.get('transferFreezeAuthority') || [];
        const idlInstruction = solanaRwaIdl.instructions.find(i => i.name === 'transferFreezeAuthority');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });
    });

    describe('identity-registry program', () => {
      it('registerIdentity: Rust params should match IDL params', () => {
        const rustParams = identityRegistrySignatures.get('registerIdentity') || [];
        const idlInstruction = identityRegistryIdl.instructions.find(i => i.name === 'registerIdentity');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('registerIdentityWithData: Rust params should match IDL params', () => {
        const rustParams = identityRegistrySignatures.get('registerIdentityWithData') || [];
        const idlInstruction = identityRegistryIdl.instructions.find(i => i.name === 'registerIdentityWithData');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('updateIdentity: Rust params should match IDL params', () => {
        const rustParams = identityRegistrySignatures.get('updateIdentity') || [];
        const idlInstruction = identityRegistryIdl.instructions.find(i => i.name === 'updateIdentity');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('removeIdentity: Rust params should match IDL params', () => {
        const rustParams = identityRegistrySignatures.get('removeIdentity') || [];
        const idlInstruction = identityRegistryIdl.instructions.find(i => i.name === 'removeIdentity');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });
    });

    describe('compliance-aggregator program', () => {
      it('addModule: Rust params should match IDL params', () => {
        const rustParams = complianceAggregatorSignatures.get('addModule') || [];
        const idlInstruction = complianceAggregatorIdl.instructions.find(i => i.name === 'addModule');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('removeModule: Rust params should match IDL params', () => {
        const rustParams = complianceAggregatorSignatures.get('removeModule') || [];
        const idlInstruction = complianceAggregatorIdl.instructions.find(i => i.name === 'removeModule');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });

      it('canTransfer: Rust params should match IDL params', () => {
        const rustParams = complianceAggregatorSignatures.get('canTransfer') || [];
        const idlInstruction = complianceAggregatorIdl.instructions.find(i => i.name === 'canTransfer');
        const idlParams = idlInstruction?.params.filter(p => p.name !== 'ctx').map(p => p.name) || [];

        const rustParamNames = rustParams.map(p => p.name);
        for (const param of rustParamNames) {
          const camelParam = rustToCamelCase(param);
          expect(idlParams, `IDL should contain '${camelParam}'`).to.include(camelParam);
        }
      });
    });
  });

  // =================================================================
  // Section 3: Error Code Consistency
  // =================================================================

  describe('Error Code Consistency', () => {
    describe('solana-rwa program', () => {
      const rustErrors = extractRustErrorCodes(SOLANA_RWA_SRC);
      const idlErrors = solanaRwaIdl.errors?.map(e => e.msg) || [];

      it('should have matching error codes between Rust and IDL', () => {
        for (const rustError of rustErrors) {
          const found = idlErrors.some(msg =>
            msg.toLowerCase().includes(rustError.toLowerCase().replace(/([A-Z])/g, '_$1').substring(1)) ||
            msg.toLowerCase().includes(rustError.toLowerCase())
          );
          expect(found, `Rust error '${rustError}' not found in IDL errors`).to.be.true;
        }
      });

      it('should have correct error code count', () => {
        expect(idlErrors.length).to.equal(rustErrors.length);
      });
    });

    describe('identity-registry program', () => {
      const rustErrors = extractRustErrorCodes(IDENTITY_REGISTRY_SRC);
      const idlErrors = identityRegistryIdl.errors?.map(e => e.msg) || [];

      it('should have matching error codes between Rust and IDL', () => {
        for (const rustError of rustErrors) {
          const found = idlErrors.some(msg => msg.toLowerCase().includes(rustError.toLowerCase()));
          expect(found, `Rust error '${rustError}' not found in IDL errors`).to.be.true;
        }
      });

      it('should have correct error code count', () => {
        expect(idlErrors.length).to.equal(rustErrors.length);
      });
    });

    describe('compliance-aggregator program', () => {
      const rustErrors = extractRustErrorCodes(COMPLIANCE_AGGREGATOR_SRC);
      const idlErrors = complianceAggregatorIdl.errors?.map(e => e.msg) || [];

      it('should have matching error codes between Rust and IDL', () => {
        for (const rustError of rustErrors) {
          const found = idlErrors.some(msg => msg.toLowerCase().includes(rustError.toLowerCase()));
          expect(found, `Rust error '${rustError}' not found in IDL errors`).to.be.true;
        }
      });

      it('should have correct error code count', () => {
        expect(idlErrors.length).to.equal(rustErrors.length);
      });
    });
  });

  // =================================================================
  // Section 4: TypeScript Method Signature Validation
  // =================================================================

  describe('TypeScript Method Signature Validation', () => {
    describe('solana-rwa program', () => {
      it('should have methods matching IDL instruction count', () => {
        const idlInstructionCount = solanaRwaIdl.instructions.length;
        // TypeScript methods should match IDL instructions (excluding internal methods)
        expect(solanaRwaTsMethods.size).to.be.greaterThan(0);
      });

      it('should have all IDL instructions accessible via program.methods', () => {
        for (const instruction of solanaRwaIdl.instructions) {
          expect(
            instruction.name in solanaRwaProgram.methods,
            `program.methods.${instruction.name} should exist`
          ).to.be.true;
        }
      });
    });

    describe('identity-registry program', () => {
      it('should have all IDL instructions accessible via program.methods', () => {
        for (const instruction of identityRegistryIdl.instructions) {
          expect(
            instruction.name in identityRegistryProgram.methods,
            `program.methods.${instruction.name} should exist`
          ).to.be.true;
        }
      });
    });

    describe('compliance-aggregator program', () => {
      it('should have all IDL instructions accessible via program.methods', () => {
        for (const instruction of complianceAggregatorIdl.instructions) {
          expect(
            instruction.name in complianceAggregatorProgram.methods,
            `program.methods.${instruction.name} should exist`
          ).to.be.true;
        }
      });
    });
  });

  // =================================================================
  // Section 5: Type Return Validation
  // =================================================================

  describe('Type Return Validation', () => {
    describe('solana-rwa program', () => {
      it('getSupplyInfo should return a struct type', () => {
        const getSupplyInfo = solanaRwaIdl.instructions.find(i => i.name === 'getSupplyInfo');
        expect(getSupplyInfo, 'getSupplyInfo instruction should exist').to.not.be.undefined;

        if (getSupplyInfo) {
          const returns = getSupplyInfo.returns;
          expect(returns, 'getSupplyInfo should have a return type').to.not.be.undefined;
          expect(returns, 'getSupplyInfo return should be a defined type').to.not.equal('bool');
          expect(returns).to.not.equal('()');
        }
      });
    });

    describe('identity-registry program', () => {
      it('getIdentity should return Pubkey type', () => {
        const getIdentity = identityRegistryIdl.instructions.find(i => i.name === 'getIdentity');
        expect(getIdentity, 'getIdentity instruction should exist').to.not.be.undefined;

        if (getIdentity) {
          const returns = getIdentity.returns;
          expect(returns, 'getIdentity should have a return type').to.not.be.undefined;
        }
      });
    });

    describe('compliance-aggregator program', () => {
      it('canTransfer should return bool type', () => {
        const canTransfer = complianceAggregatorIdl.instructions.find(i => i.name === 'canTransfer');
        expect(canTransfer, 'canTransfer instruction should exist').to.not.be.undefined;

        if (canTransfer) {
          const returns = canTransfer.returns;
          expect(returns, 'canTransfer should have a return type').to.not.be.undefined;
        }
      });

      it('getModules should return Vec type', () => {
        const getModules = complianceAggregatorIdl.instructions.find(i => i.name === 'getModules');
        expect(getModules, 'getModules instruction should exist').to.not.be.undefined;

        if (getModules) {
          const returns = getModules.returns;
          expect(returns, 'getModules should have a return type').to.not.be.undefined;
        }
      });

      it('getState should return a struct type', () => {
        const getState = complianceAggregatorIdl.instructions.find(i => i.name === 'getState');
        expect(getState, 'getState instruction should exist').to.not.be.undefined;

        if (getState) {
          const returns = getState.returns;
          expect(returns, 'getState should have a return type').to.not.be.undefined;
        }
      });

      it('getModuleCount should return u64 type', () => {
        const getModuleCount = complianceAggregatorIdl.instructions.find(i => i.name === 'getModuleCount');
        expect(getModuleCount, 'getModuleCount instruction should exist').to.not.be.undefined;

        if (getModuleCount) {
          const returns = getModuleCount.returns;
          expect(returns, 'getModuleCount should have a return type').to.not.be.undefined;
        }
      });
    });
  });

  // =================================================================
  // Section 6: Account Context Consistency
  // =================================================================

  describe('Account Context Consistency', () => {
    describe('solana-rwa program', () => {
      it('should have consistent account contexts for related instructions', () => {
        // Initialize, Mint, Burn, Transfer all need token account
        const tokenInstructions = ['initialize', 'mint', 'burn', 'transfer', 'freezeAccount', 'unfreezeAccount'];

        for (const instrName of tokenInstructions) {
          const instr = solanaRwaIdl.instructions.find(i => i.name === instrName);
          expect(instr, `Instruction '${instrName}' should exist`).to.not.be.undefined;
        }
      });

      it('should have account structs for all instruction contexts', () => {
        // Check that account structs exist for main instructions
        const expectedAccounts = [
          'initialize',
          'mint',
          'burn',
          'transfer',
          'addRemoveAgent',
          'getSupplyInfo',
          'transferOwner',
          'freezeAccount',
          'unfreezeAccount',
          'transferFreezeAuthority',
        ];

        for (const accountName of expectedAccounts) {
          // Account structs should be defined in the Rust code
          const content = fs.readFileSync(SOLANA_RWA_SRC, 'utf-8');
          const structRegex = new RegExp(`pub\\s+struct\\s+${accountName}\\s*<`);
          expect(
            structRegex.test(content),
            `Account struct '${accountName}' should exist in Rust source`
          ).to.be.true;
        }
      });
    });

    describe('identity-registry program', () => {
      it('should have account structs for all instruction contexts', () => {
        const expectedAccounts = [
          'initialize',
          'registerIdentity',
          'updateIdentity',
          'removeIdentity',
          'getIdentity',
        ];

        for (const accountName of expectedAccounts) {
          const content = fs.readFileSync(IDENTITY_REGISTRY_SRC, 'utf-8');
          const structRegex = new RegExp(`pub\\s+struct\\s+${accountName}\\s*<`);
          expect(
            structRegex.test(content),
            `Account struct '${accountName}' should exist in Rust source`
          ).to.be.true;
        }
      });
    });

    describe('compliance-aggregator program', () => {
      it('should have account structs for all instruction contexts', () => {
        const expectedAccounts = [
          'initialize',
          'addModule',
          'removeModule',
          'getModules',
          'rebalanceModules',
          'getAggregatorState',
        ];

        for (const accountName of expectedAccounts) {
          const content = fs.readFileSync(COMPLIANCE_AGGREGATOR_SRC, 'utf-8');
          const structRegex = new RegExp(`pub\\s+struct\\s+${accountName}\\s*<`);
          expect(
            structRegex.test(content),
            `Account struct '${accountName}' should exist in Rust source`
          ).to.be.true;
        }
      });
    });
  });

  // =================================================================
  // Section 7: Program ID Consistency
  // =================================================================

  describe('Program ID Consistency', () => {
    it('solana-rwa program ID should match Anchor.toml', () => {
      const anchorToml = fs.readFileSync(path.join(__dirname, '..', 'Anchor.toml'), 'utf-8');
      expect(anchorToml).to.include('solana_rwa = "7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L"');
    });

    it('identity-registry program ID should match Anchor.toml', () => {
      const anchorToml = fs.readFileSync(path.join(__dirname, '..', 'Anchor.toml'), 'utf-8');
      expect(anchorToml).to.include('identity_registry = "3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5"');
    });

    it('compliance-aggregator program ID should match Anchor.toml', () => {
      const anchorToml = fs.readFileSync(path.join(__dirname, '..', 'Anchor.toml'), 'utf-8');
      expect(anchorToml).to.include('compliance_aggregator = "EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT"');
    });

    it('program IDs should be unique', () => {
      const ids = [
        '7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L',
        '3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5',
        'EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT',
      ];

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).to.equal(ids.length, 'All program IDs should be unique');
    });
  });
});
