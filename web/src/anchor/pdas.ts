/**
 * PDA Derivation Helpers
 *
 * All PDA derivation functions for the three programs.
 * These functions derive PDAs based on the seeds defined in the IDLs.
 */

import { PublicKey } from '@solana/web3.js';

// ============================================================================
// Solana RWA PDA Derivations
// ============================================================================

/**
 * Derive the PDA for a BalanceAccount.
 * Seeds: [b"balance", token_state, wallet]
 */
export function deriveBalancePda(
  tokenState: PublicKey,
  wallet: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), tokenState.toBuffer(), wallet.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Derive the PDA for a FrozenAccount.
 * Seeds: [b"frozen", token_state, wallet]
 */
export function deriveFrozenPda(
  tokenState: PublicKey,
  wallet: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("frozen"), tokenState.toBuffer(), wallet.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Derive the PDA for an AgentAccount.
 * Seeds: [b"agent", token_state, agent]
 */
export function deriveAgentPda(
  tokenState: PublicKey,
  agent: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), tokenState.toBuffer(), agent.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Derive the TokenState PDA.
 * Multi-token: Seeds [b"token", owner, token_id] - allows multiple tokens per wallet
 */
export function deriveTokenStatePda(
  owner: PublicKey,
  tokenId: string,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token"), owner.toBuffer(), Buffer.from(tokenId)],
    programId
  );
  return pda;
}

// ============================================================================
// Identity Registry PDA Derivations
// ============================================================================

/**
 * Derive the Registry PDA.
 * Seeds: [b"registry"]
 */
export function deriveRegistryPda(
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    programId
  );
  return pda;
}

/**
 * Get Identity PDA.
 * Derives the identity account PDA for a given wallet.
 * Seeds: [b"identity", registry, wallet]
 */
export function getIdentityPda(
  registryState: PublicKey,
  wallet: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), wallet.toBuffer()],
    programId
  );
  return pda;
}

// ============================================================================
// Compliance Aggregator PDA Derivations
// ============================================================================

/**
 * Derive the Aggregator PDA.
 * Seeds: [b"aggregator"]
 */
export function deriveAggregatorPda(
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("aggregator")],
    programId
  );
  return pda;
}

/**
 * Derive the Compliance PDA for a token.
 * Seeds: [b"compliance", aggregator, token]
 */
export function deriveCompliancePda(
  aggregator: PublicKey,
  token: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("compliance"), aggregator.toBuffer(), token.toBuffer()],
    programId
  );
  return pda;
}
