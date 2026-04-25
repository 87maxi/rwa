#!/usr/bin/env node
/**
 * Discriminator Validation Script
 *
 * Validates that frontend instruction discriminators match the IDL-generated
 * discriminators. This prevents transaction failures caused by incorrect
 * instruction routing on-chain.
 *
 * Usage:
 *   node solana-rwa/validate-discriminators.js
 *   node solana-rwa/validate-discriminators.js --fix
 *   node solana-rwa/validate-discriminators.js --verbose
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
 * Anchor uses "global:<instruction_name>" format for instruction discriminators.
 */
function computeDiscriminator(instructionName) {
  const hash = crypto.createHash('sha256').update('global:' + instructionName).digest();
  const result = [];
  for (let i = 0; i < 8; i++) {
    result.push(hash.readUInt8(i));
  }
  return result;
}

/**
 * Convert number array to hex string for display.
 */
function discriminatorToHex(discriminator) {
  return discriminator.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert number array to decimal string for display.
 */
function discriminatorToDecimal(discriminator) {
  return `[${discriminator.join(', ')}]`;
}

/**
 * Convert TypeScript camelCase to Rust snake_case.
 */
function camelToRustName(camelName) {
  return camelName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Extract discriminators from frontend client.ts file.
 */
function extractFrontendDiscriminators() {
  const content = fs.readFileSync(FRONTEND_CLIENT_PATH, 'utf-8');

  // Match DISCRIMINATORS object entries
  const discriminatorRegex = /(\w+):\s*\[([^\]]+)\]/g;
  const discriminators = new Map();

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
function loadIDLDiscriminators(programName) {
  const idlPath = path.join(IDL_DIR, `${programName}.json`);

  if (!fs.existsSync(idlPath)) {
    console.warn(`  WARNING: IDL file not found: ${idlPath}`);
    return [];
  }

  const content = fs.readFileSync(idlPath, 'utf-8');
  const idl = JSON.parse(content);

  return idl.instructions.map((instr) => ({
    name: instr.name,
    discriminator: instr.discriminator,
  }));
}

// =============================================================================
// Validation Logic
// =============================================================================

/**
 * Convert snake_case to camelCase.
 */
function snakeToCamel(snake) {
  return snake.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Validate discriminators for a single program.
 */
function validateProgram(programConfig, frontendDiscriminators) {
  const report = {
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
  const discriminatorHexMap = new Map();

  for (const idlInstr of idlDiscriminators) {
    const rustName = idlInstr.name;
    const camelName = snakeToCamel(rustName);

    // Try both snake_case and camelCase
    const frontendValue = frontendDiscriminators.get(rustName) || frontendDiscriminators.get(camelName);

    // Add to uniqueness map
    const hex = discriminatorToHex(idlInstr.discriminator);
    if (!discriminatorHexMap.has(hex)) {
      discriminatorHexMap.set(hex, []);
    }
    discriminatorHexMap.get(hex).push(rustName);

    if (!frontendValue) {
      report.mismatches.push({
        instruction: `${programConfig.name}.${rustName}`,
        expected: idlInstr.discriminator,
        actual: [],
        frontendName: camelName,
        severity: 'warning',
      });
      continue;
    }

    // Compare discriminators
    const expectedHex = discriminatorToHex(idlInstr.discriminator);
    const actualHex = discriminatorToHex(frontendValue);

    if (expectedHex !== actualHex) {
      report.mismatches.push({
        instruction: `${programConfig.name}.${rustName}`,
        expected: idlInstr.discriminator,
        actual: frontendValue,
        frontendName: camelName,
        severity: 'error',
      });
    }
  }

  report.uniqueCount = discriminatorHexMap.size;

  return report;
}

// =============================================================================
// Output Functions
// =============================================================================

function printReport(report, verbose) {
  const statusIcon = report.mismatches.length === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'; // green or red
  console.log(`${statusIcon} ${report.program} (\x1b[36m${report.uniqueCount}/${report.totalDiscriminators}\x1b[0m unique)`);

  if (verbose && report.mismatches.length > 0) {
    for (const mismatch of report.mismatches) {
      const severity = mismatch.severity === 'error' ? '\x1b[31mERROR\x1b[0m' : '\x1b[33mWARN\x1b[0m';
      console.log(`  ${severity}: ${mismatch.instruction}`);
      console.log(`    Expected: ${discriminatorToDecimal(mismatch.expected)}`);
      if (mismatch.actual.length > 0) {
        console.log(`    Actual:   ${discriminatorToDecimal(mismatch.actual)}`);
      }
      if (mismatch.frontendName) {
        console.log(`    (Frontend key: ${mismatch.frontendName})`);
      }
    }
  }

  if (report.mismatches.length === 0 && verbose) {
    console.log('  \x1b[32mAll discriminators match IDL.\x1b[0m');
  }
}

function printSummary(reports) {
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
    console.log(`\x1b[31m✗ ${totalErrors} ERROR(S)\x1b[0m, \x1b[33m${totalWarnings} WARNING(S)\x1b[0m`);
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
function generateFixCode(reports) {
  const fixes = [];

  for (const report of reports) {
    const errors = report.mismatches.filter((m) => m.severity === 'error');
    if (errors.length === 0) continue;

    for (const error of errors) {
      const instructionName = error.instruction.split('.').pop() || '';
      const rustName = error.expectedRustName || camelToRustName(instructionName);
      fixes.push(
        `  ${instructionName}: ${discriminatorToDecimal(error.expected)}, // sha256("${rustName}")`
      );
    }
  }

  return `// CORRECTED DISCRIMINATORS\nconst DISCRIMINATORS_FIXED = {\n${fixes.join(',\n')}\n};`;
}

// =============================================================================
// Main Execution
// =============================================================================

function main() {
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
  const reports = [];

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
main();
