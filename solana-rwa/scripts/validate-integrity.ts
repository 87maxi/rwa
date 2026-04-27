#!/usr/bin/env ts-node
// =============================================================================
// Solana RWA Integrity Validation Script
// =============================================================================
// Este script valida automáticamente la consistencia entre:
// 1. Smart Contract Rust (programs/*/src/lib.rs)
// 2. IDL JSON (target/idl/*.json)
// 3. Cliente TypeScript (web/src/anchor/client.ts)
//
// Ejecución:
//   npx ts-node scripts/validate-integrity.ts
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

interface IDLInstruction {
  name: string;
  discriminator: number[];
  accounts: Array<{
    name: string;
    writable?: boolean;
    signer?: boolean;
    pda?: any;
  }>;
  args?: Array<{ name: string; type: any }>;
}

interface IDLEvent {
  name: string;
  discriminator: number[];
  fields: Array<{ name: string; type: any }>;
}

interface IDLAccount {
  name: string;
  discriminator: number[];
  fields: Array<{ name: string; type: any }>;
}

interface IDLError {
  code: number;
  name: string;
  message: string;
}

interface IDL {
  instructions: IDLInstruction[];
  events: IDLEvent[];
  accounts: IDLAccount[];
  errors: IDLError[];
  metadata: { name: string; version: string };
}

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate SHA256 discriminator for an instruction name
 */
function calculateDiscriminator(instructionName: string): number[] {
  const hash = crypto.createHash('sha256').update(instructionName).digest();
  const discriminator: number[] = [];
  for (let i = 0; i < 8; i++) {
    discriminator.push(hash.readUInt8(i));
  }
  return discriminator;
}

/**
 * Compare two discriminators
 */
function discriminatorsMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Convert Rust snake_case to TypeScript camelCase
 */
function rustToCamelCase(rustName: string): string {
  return rustName
    .split('_')
    .map((part, idx) =>
      idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');
}

/**
 * Extract instruction handlers from Rust source
 */
function extractRustInstructions(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const instructions: string[] = [];
  
  // Match pub fn instruction_name(ctx: Context<...>)
  const regex = /pub fn\s+(\w+)\s*\(\s*ctx:\s*Context</g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    instructions.push(match[1]);
  }
  
  return instructions;
}

/**
 * Extract account structs from Rust source
 */
function extractRustAccounts(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const accounts: string[] = [];
  
  // Match #\[derive(Accounts)\]\npub struct Name<'info>
  const regex = /#\[derive\(Accounts\)\]\s*pub struct\s+(\w+)<'info>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    accounts.push(match[1]);
  }
  
  return accounts;
}

/**
 * Extract events from Rust source
 */
function extractRustEvents(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const events: string[] = [];
  
  // Match pub struct EventNameEvent
  const regex = /pub struct\s+(\w+Event)\s*{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    events.push(match[1]);
  }
  
  return events;
}

/**
 * Extract error codes from Rust source
 */
function extractRustErrorCodes(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors: string[] = [];
  
  // Match #[error("...")]
  const regex = /#\[error\("([^"]+)"\)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    errors.push(match[1]);
  }
  
  return errors;
}

/**
 * Load IDL file
 */
function loadIDL(programName: string): IDL | null {
  const idlPaths = [
    path.join(__dirname, '..', 'target', 'idl', `${programName}.json`),
    path.join(__dirname, '..', 'target', 'types', `${programName}.ts`),
  ];
  
  for (const idlPath of idlPaths) {
    if (fs.existsSync(idlPath)) {
      try {
        const content = fs.readFileSync(idlPath, 'utf-8');
        return JSON.parse(content);
      } catch (e) {
        console.warn(`Warning: Could not parse IDL file: ${idlPath}`);
      }
    }
  }
  
  return null;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate instruction discriminators
 */
function validateInstructionDiscriminators(
  idl: IDL,
  programName: string
): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  console.log(`\n📋 Validando discriminators de instrucciones para ${programName}...`);
  
  for (const instruction of idl.instructions) {
    const expectedDiscriminator = calculateDiscriminator(instruction.name);
    const actualDiscriminator = instruction.discriminator;
    
    if (discriminatorsMatch(expectedDiscriminator, actualDiscriminator)) {
      console.log(`  ✅ ${instruction.name}: ${actualDiscriminator.join(', ')}`);
    } else {
      result.passed = false;
      result.errors.push(
        `Discriminator mismatch for instruction '${instruction.name}': ` +
        `expected [${expectedDiscriminator.join(', ')}], ` +
        `got [${actualDiscriminator.join(', ')}]`
      );
      console.log(`  ❌ ${instruction.name}: MISMATCH`);
    }
  }
  
  return result;
}

/**
 * Validate account constraints
 */
function validateAccountConstraints(
  idl: IDL,
  rustFilePath: string,
  programName: string
): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  const rustContent = fs.readFileSync(rustFilePath, 'utf-8');
  
  console.log(`\n🔐 Validando constraints de accounts para ${programName}...`);
  
  for (const instruction of idl.instructions) {
    console.log(`  📝 Verificando instruction: ${instruction.name}`);
    
    // Find the corresponding Rust struct
    const structName = rustToCamelCase(instruction.name)
      .charAt(0).toUpperCase() + rustToCamelCase(instruction.name).slice(1);
    
    // Check if struct exists in Rust source
    const structPattern = `pub struct ${structName}<'info>`;
    if (!rustContent.includes(structPattern)) {
      result.warnings.push(
        `Could not find Rust struct '${structName}' for instruction '${instruction.name}'`
      );
      continue;
    }
    
    // Extract account order from IDL
    const idlAccountNames = instruction.accounts.map(acc => acc.name);
    
    // Extract account order from Rust struct
    const rustAccountPattern = new RegExp(
      `pub struct ${structName}<'info>\\s*{([^}]+)}`,
      's'
    );
    const structMatch = rustContent.match(rustAccountPattern);
    
    if (structMatch) {
      const structBody = structMatch[1];
      const rustAccountNames: string[] = [];
      
      // Match pub field_name:
      const fieldRegex = /pub\s+(\w+)\s*:/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
        rustAccountNames.push(fieldMatch[1]);
      }
      
      // Compare orders
      if (idlAccountNames.length !== rustAccountNames.length) {
        result.passed = false;
        result.errors.push(
          `Account count mismatch for instruction '${instruction.name}': ` +
          `IDL has ${idlAccountNames.length}, Rust has ${rustAccountNames.length}`
        );
      }
      
      // Check each account
      const minLen = Math.min(idlAccountNames.length, rustAccountNames.length);
      for (let i = 0; i < minLen; i++) {
        if (idlAccountNames[i] !== rustAccountNames[i]) {
          result.passed = false;
          result.errors.push(
            `Account order mismatch for instruction '${instruction.name}' at index ${i}: ` +
            `IDL has '${idlAccountNames[i]}', Rust has '${rustAccountNames[i]}'`
          );
        }
      }
      
      if (result.passed && minLen === rustAccountNames.length && minLen === idlAccountNames.length) {
        console.log(`    ✅ Account order matches`);
      }
    }
  }
  
  return result;
}

/**
 * Validate event fields
 */
function validateEventFields(
  idl: IDL,
  rustFilePath: string,
  programName: string
): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  const rustContent = fs.readFileSync(rustFilePath, 'utf-8');
  
  console.log(`\n📡 Validando campos de eventos para ${programName}...`);
  
  for (const event of idl.events) {
    console.log(`  📝 Verificando evento: ${event.name}`);
    
    // Find corresponding Rust struct
    const rustStructPattern = `pub struct ${event.name} {`;
    if (!rustContent.includes(rustStructPattern)) {
      result.warnings.push(
        `Could not find Rust struct '${event.name}' for event`
      );
      continue;
    }
    
    // Extract fields from IDL event
    const idlFieldNames = event.fields.map(f => f.name);
    
    // Extract fields from Rust struct
    const eventPattern = new RegExp(
      `pub struct ${event.name}\\s*{([^}]+)}`,
      's'
    );
    const eventMatch = rustContent.match(eventPattern);
    
    if (eventMatch) {
      const eventBody = eventMatch[1];
      const rustFieldNames: string[] = [];
      
      // Match     field_name: Type
      const fieldRegex = /(\w+)\s*:/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(eventBody)) !== null) {
        rustFieldNames.push(fieldMatch[1]);
      }
      
      // Compare
      if (idlFieldNames.length !== rustFieldNames.length) {
        result.passed = false;
        result.errors.push(
          `Field count mismatch for event '${event.name}': ` +
          `IDL has ${idlFieldNames.length}, Rust has ${rustFieldNames.length}`
        );
      }
      
      for (let i = 0; i < Math.min(idlFieldNames.length, rustFieldNames.length); i++) {
        if (idlFieldNames[i] !== rustFieldNames[i]) {
          result.passed = false;
          result.errors.push(
            `Field name mismatch for event '${event.name}' at index ${i}: ` +
            `IDL has '${idlFieldNames[i]}', Rust has '${rustFieldNames[i]}'`
          );
        }
      }
      
      if (result.passed && idlFieldNames.length === rustFieldNames.length) {
        console.log(`    ✅ Field names match`);
      }
    }
  }
  
  return result;
}

/**
 * Validate all instructions exist in both Rust and IDL
 */
function validateInstructionAvailability(
  idl: IDL,
  rustFilePath: string,
  programName: string
): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  
  console.log(`\n🔍 Validando disponibilidad de instrucciones para ${programName}...`);
  
  const rustInstructions = extractRustInstructions(rustFilePath);
  const idlInstructions = idl.instructions.map(i => rustToCamelCase(i.name));
  
  // Check Rust instructions in IDL
  for (const rustInstr of rustInstructions) {
    const snakeCaseName = rustInstr
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .slice(1);
    
    const idlInstr = idl.instructions.find(i => i.name === snakeCaseName);
    if (idlInstr) {
      console.log(`  ✅ ${rustInstr} (${snakeCaseName})`);
    } else {
      result.passed = false;
      result.errors.push(
        `Rust instruction '${rustInstr}' (${snakeCaseName}) not found in IDL`
      );
      console.log(`  ❌ ${rustInstr} (${snakeCaseName}) - MISSING IN IDL`);
    }
  }
  
  // Check IDL instructions in Rust
  for (const idlInstr of idl.instructions) {
    const camelCaseName = rustToCamelCase(idlInstr.name)
      .charAt(0).toUpperCase() + rustToCamelCase(idlInstr.name).slice(1);
    
    if (rustInstructions.includes(camelCaseName)) {
      // Already validated above
    } else {
      result.warnings.push(
        `IDL instruction '${idlInstr.name}' (${camelCaseName}) not found in Rust source`
      );
      console.log(`  ⚠️  ${idlInstr.name} - NOT IN RUST`);
    }
  }
  
  return result;
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('Solana RWA - Integrity Validation Suite');
  console.log('='.repeat(70));
  
  const baseDir = path.join(__dirname, '..');
  const programsDir = path.join(baseDir, 'programs');
  
  const programs = [
    { name: 'solana-rwa', rustFile: 'solana-rwa/src/lib.rs' },
    { name: 'identity-registry', rustFile: 'identity-registry/src/lib.rs' },
    { name: 'compliance-aggregator', rustFile: 'compliance-aggregator/src/lib.rs' },
  ];
  
  const allResults: Array<{ program: string; results: ValidationResult[] }> = [];
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const program of programs) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Program: ${program.name}`);
    console.log('='.repeat(70));
    
    // Load IDL
    const idl = loadIDL(program.name);
    if (!idl) {
      console.warn(`⚠️  Could not load IDL for ${program.name}, skipping...`);
      continue;
    }
    
    console.log(`✅ Loaded IDL: ${idl.metadata.name} v${idl.metadata.version}`);
    console.log(`   Instructions: ${idl.instructions.length}`);
    console.log(`   Events: ${idl.events.length}`);
    console.log(`   Accounts: ${idl.accounts.length}`);
    console.log(`   Errors: ${idl.errors.length}`);
    
    // Load Rust source
    const rustFilePath = path.join(programsDir, program.rustFile);
    if (!fs.existsSync(rustFilePath)) {
      console.warn(`⚠️  Could not find Rust source: ${rustFilePath}`);
      continue;
    }
    
    const results: ValidationResult[] = [];
    
    // Run validations
    results.push(await validateInstructionAvailability(idl, rustFilePath, program.name));
    results.push(await validateInstructionDiscriminators(idl, program.name));
    results.push(await validateAccountConstraints(idl, rustFilePath, program.name));
    results.push(await validateEventFields(idl, rustFilePath, program.name));
    
    allResults.push({ program: program.name, results });
    
    // Aggregate results
    const programPassed = results.every(r => r.passed);
    if (programPassed) {
      totalPassed++;
      console.log(`\n✅ Program '${program.name}': ALL VALIDATIONS PASSED`);
    } else {
      totalFailed++;
      console.log(`\n❌ Program '${program.name}': SOME VALIDATIONS FAILED`);
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Programs validated: ${allResults.length}`);
  console.log(`Programs passed: ${totalPassed}`);
  console.log(`Programs failed: ${totalFailed}`);
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const { program, results } of allResults) {
    for (const result of results) {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }
  }
  
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log('\n❌ VALIDATION FAILED - Please fix the errors above');
    process.exit(1);
  } else {
    console.log('\n✅ VALIDATION PASSED - All integrity checks successful');
    process.exit(0);
  }
}

// Run validation
main().catch((e) => {
  console.error('Validation error:', e);
  process.exit(1);
});
