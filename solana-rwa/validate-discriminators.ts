#!/usr/bin/env ts-node
/**
 * Discriminator Validation Script
 *
 * Validates that frontend instruction discriminators match the IDL-generated
 * discriminators. This prevents transaction failures caused by incorrect
 * instruction routing on-chain.
 *
 * Usage:
 *   npx ts-node solana-rwa/validate-discriminators.ts
 *   npx ts-node solana-rwa/validate-discriminators.ts --fix
 *   npx ts-node solana-rwa/validate-discriminators.ts --verbose
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

interface IDLInstruction {
  name: string;
  discriminator: number[];
}

interface IDL {
  instructions: IDLInstruction[];
}

interface DiscriminatorMismatch {
  instruction: string;
  expected: number[];
  actual: number[];
  severity: 'error' | 'warning';
}

interface ValidationReport {
  program: string;
  mismatches: DiscriminatorMismatch[];
  uniqueCount: number;
  totalDiscriminators: number;
}

// =============================================================================
// Configuration
// =============================================================================

const FRONTEND_CLIENT_PATH = path.join(__dirname, '..', 'web', 'src', 'anchor', 'client.ts');
const IDL_DIR = path.join(__dirname, 'target', 'idl');

const PROGRAM_CONFIGS = [
  { name: 'solana_rwa', idlFile: 'solana_rwa.json' },
  { name: 'identity_registry', idlFile: 'identity_registry.json' },
  { name: 'compliance_aggregator', idlFile: 'compliance_aggregator.json' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Compute SHA256 hash of a string and return first 8 bytes as number array.
 * This matches Anchor's discriminator generation.
 */
function computeDiscriminator(instructionName: string): number[] {
  const hash = crypto.createHash('sha256').update(instructionName).digest();
  const result: number[] = [];
  for (let i = 0; i < 8; i++) {
    result.push(hash.readUInt8(i));
  }
  return result;
}

/**
 * Convert number array to hex string for display.
 */
function discriminatorToHex(discriminator: number[]): string {
  return discriminator.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert number array to decimal string for display.
 */
function discriminatorToDecimal(discriminator: number[]): string {
  return `[${discriminator.join(', ')}]`;
}

/**
 * Convert Rust snake_case to TypeScript camelCase.
 */
function rustToCamelCase(rustName: string): string {
  return rustName
    .split('_')
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Extract discriminators from frontend client.ts file.
 */
function extractFrontendDiscriminators(): Map<string, number[]> {
  const content = fs.readFileSync(FRONTEND_CLIENT_PATH, 'utf-8');

  // Match DISCRIMINATORS object entries
  const discriminatorRegex = /(\w+):\s*\[([^\]]+)\]/g;
  const discriminators = new Map<string, number[]>();

  let match;
  while ((match = discriminatorRegex.exec(content)) !== null) {
    const name = match[1];
    const values = match[2]
      .split(',')
      .map((v) => parseInt(v.trim(), 10))
      .filter((n) => !isNaN(n));

    if (values.length === 8) {
      discriminators.set(name, values);
    }
  }

  return discriminators;
}

/**
 * Load IDL file and extract instruction discriminators.
 */
function loadIDLDiscriminators(programName: string): IDLInstruction[] {
  const idlPath = path.join(IDL_DIR, `${programName}.json`);

  if (!fs.existsSync(idlPath)) {
    console.warn(`  WARNING: IDL file not found: ${idlPath}`);
    return [];
  }

  const content = fs.readFileSync(idlPath, 'utf-8');
  const idl: IDL = JSON.parse(content);

  return idl.instructions.map((instr) => ({
    name: instr.name,
    discriminator: instr.discriminator,
  }));
}

// =============================================================================
// Validation Logic
// =============================================================================

/**
 * Validate discriminators for a single program.
 */
function validateProgram(
  programConfig: { name: string; idlFile: string },
  frontendDiscriminators: Map<string, number[]>
): ValidationReport {
  const report: ValidationReport = {
    program: programConfig.name,
    mismatches: [],
    uniqueCount: 0,
    totalDiscriminators: 0,
  };

  const idlDiscriminators = loadIDLDiscriminators(programConfig.name);

  if (idlDiscriminators.length === 0) {
    return report;
  }

  report.totalDiscriminators = idlDiscriminators.length;

  // Build a map of hex discriminators to check for uniqueness
  const discriminatorHexMap = new Map<string, string[]>();

  for (const idlInstr of idlDiscriminators) {
    const camelCaseName = rustToCamelCase(idlInstr.name);
    const frontendValue = frontendDiscriminators.get(camelCaseName);

    // Add to uniqueness map
    const hex = discriminatorToHex(idlInstr.discriminator);
    if (!discriminatorHexMap.has(hex)) {
      discriminatorHexMap.set(hex, []);
    }
    discriminatorHexMap.get(hex)!.push(idlInstr.name);

    if (!frontendValue) {
      report.mismatches.push({
        instruction: `${programConfig.name}.${camelCaseName}`,
        expected: idlInstr.discriminator,
        actual: [],
        severity: 'warning',
      });
      continue;
    }

    // Compare discriminators
    const expectedHex = discriminatorToHex(idlInstr.discriminator);
    const actualHex = discriminatorToHex(frontendValue);

    if (expectedHex !== actualHex) {
      report.mismatches.push({
        instruction: `${programConfig.name}.${camelCaseName}`,
        expected: idlInstr.discriminator,
        actual: frontendValue,
        severity: 'error',
      });
    }
  }

  report.uniqueCount = discriminatorHexMap.size;

  return report;
}

/**
 * Check for duplicate discriminators across all programs.
 */
function checkDuplicateDiscriminators(
  reports: ValidationReport[]
): DiscriminatorMismatch[] {
  const duplicates: DiscriminatorMismatch[] = [];
  const hexToInstructions = new Map<string, string[]>();

  for (const report of reports) {
    // This would need to re-extract from IDLs - simplified for now
  }

  return duplicates;
}

// =============================================================================
// Output Functions
// =============================================================================

function printReport(report: ValidationReport, verbose: boolean): void {
  const statusIcon = report.mismatches.length === 0 ? '✓' : '✗';
  const color = report.mismatches.length === 0 ? '\x1b[32m' : '\x1b[31m'; // green or red
  const reset = '\x1b[0m';

  console.log(
    `${color}${statusIcon} ${report.program}${reset} (${report.uniqueCount}/${report.totalDiscriminators} unique)`
  );

  if (verbose && report.mismatches.length > 0) {
    for (const mismatch of report.mismatches) {
      const severity = mismatch.severity === 'error' ? '\x1b[31mERROR\x1b[0m' : '\x1b[33mWARN\x1b[0m';
      console.log(`  ${severity}: ${mismatch.instruction}`);
      console.log(`    Expected: ${discriminatorToDecimal(mismatch.expected)}`);
      if (mismatch.actual.length > 0) {
        console.log(`    Actual:   ${discriminatorToDecimal(mismatch.actual)}`);
      }
    }
  }

  if (report.mismatches.length === 0 && verbose) {
    console.log('  All discriminators match IDL.');
  }
}

function printSummary(reports: ValidationReport[]): number {
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const report of reports) {
    for (const mismatch of report.mismatches) {
      if (mismatch.severity === 'error') {
        totalErrors++;
      } else {
        totalWarnings++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\x1b[32m✓ ALL DISCRIMINATORS VALID\x1b[0m');
  } else {
    console.log(
      `\x1b[31m✗ ${totalErrors} ERROR(S)\x1b[0m, \x1b[33m${totalWarnings} WARNING(S)\x1b[0m`
    );
  }
  console.log('='.repeat(60) + '\n');

  return totalErrors;
}

// =============================================================================
// Fix Generation
// =============================================================================

/**
 * Generate a TypeScript code block with corrected discriminators.
 */
function generateFixCode(reports: ValidationReport[]): string {
  const fixes: string[] = [];

  for (const report of reports) {
    const errors = report.mismatches.filter((m) => m.severity === 'error');
    if (errors.length === 0) continue;

    for (const error of errors) {
      const instructionName = error.instruction.split('.').pop() || '';
      fixes.push(
        `  ${instructionName}: ${discriminatorToDecimal(error.expected)}, // sha256("${instructionName.replace(/([A-Z])/g, '_$1').toLowerCase()}")`
      );
    }
  }

  return `// CORRECTED DISCRIMINATORS
const DISCRIMINATORS_FIXED: Record<string, number[]> = {
${fixes.join('\n')}
};`;
}

// =============================================================================
// Main Execution
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix');
  const verbose = args.includes('--verbose') || fixMode;

  console.log('\n\x1b[36m' + '='.repeat(60) + '\x1b[0m');
  console.log('\x1b[36m  Discriminator Validation Script\x1b[0m');
  console.log('\x1b[36m' + '='.repeat(60) + '\x1b[0m\n');

  // Check if IDL files exist
  if (!fs.existsSync(IDL_DIR)) {
    console.error('\x1b[31mERROR: IDL directory not found: ' + IDL_DIR + '\x1b[0m');
    console.error('Run `anchor build` first to generate IDL files.');
    process.exit(1);
  }

  // Check if frontend client exists
  if (!fs.existsSync(FRONTEND_CLIENT_PATH)) {
    console.error('\x1b[31mERROR: Frontend client not found: ' + FRONTEND_CLIENT_PATH + '\x1b[0m');
    process.exit(1);
  }

  // Extract frontend discriminators
  console.log('Extracting frontend discriminators...');
  const frontendDiscriminators = extractFrontendDiscriminators();
  console.log(`  Found ${frontendDiscriminators.size} discriminators in client.ts\n`);

  // Validate each program
  console.log('Validating discriminators against IDL...\n');
  const reports: ValidationReport[] = [];

  for (const config of PROGRAM_CONFIGS) {
    const report = validateProgram(config, frontendDiscriminators);
    reports.push(report);
    printReport(report, verbose);
  }

  // Print summary
  const totalErrors = printSummary(reports);

  // Generate fix code if in fix mode
  if (fixMode && totalErrors > 0) {
    console.log(generateFixCode(reports));
  }

  // Exit with error code if there are errors
  process.exit(totalErrors > 0 ? 1 : 0);
}

// Run
main().catch((error) => {
  console.error('\x1b[31mFatal error:\x1b[0m', error);
  process.exit(2);
});
