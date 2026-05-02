/**
 * useTokenList.ts
 *
 * Hook para gestionar la lista de tokens de una wallet.
 * Consulta todos los tokens existentes usando getProgramAccounts
 * y filtra por el owner.
 *
 * Fase 1 del Token List Management Plan
 */

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  deriveBalancePda,
  deriveAgentPda,
} from '@/anchor/pdas';
import { parseTokenState, parseBalanceAccount } from '@/anchor/parsers';

// ============================================================================
// Types
// ============================================================================

/**
 * Información básica de un token.
 */
export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  owner: string;
  freezeAuthority: string;
  agentCount: number;
  frozenCount: number;
  balance: bigint;
  tokenStatePda: string;
}

/**
 * Props para el hook useTokenList.
 */
export interface UseTokenListProps {
  ownerAddress: PublicKey | null;
  programId: PublicKey | null;
  enabled?: boolean;
}

/**
 * Retorno del hook useTokenList.
 */
export interface UseTokenListReturn {
  tokens: TokenInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getTokenById: (tokenId: string) => TokenInfo | undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extrae el token_id desde los seeds de la PDA.
 * Seeds: [b"token", owner, token_id]
 * El token_id es todo lo después de los primeros 32+1 bytes del PDA.
 */
function extractTokenIdFromPda(pda: PublicKey, owner: PublicKey, programId: PublicKey): string {
  // Recalcular la PDA para extraer el token_id
  // Esto es una aproximación - el token_id puede ser cualquier string
  // Mejor approach: buscar todas las PDAs del programa y filtrar
  return pda.toBase58(); // fallback
}

/**
 * Construye un TokenInfo a partir de los datos de la cuenta.
 */
async function buildTokenInfo(
  tokenStatePda: PublicKey,
  tokenOwner: PublicKey,
  conn: any,
  progId: PublicKey,
  rawTokenId: string
): Promise<TokenInfo | null> {
  try {
    const accountInfo = await conn.getAccountInfo(tokenStatePda);
    if (!accountInfo || accountInfo.data.length < 128) {
      return null;
    }

    const parsed = parseTokenState(accountInfo.data);
    const tokenId = rawTokenId || parsed.tokenId || 'unknown';

    // Obtener count de agentes
    let agentCount = 0;
    try {
      const agentPda = deriveAgentPda(tokenStatePda, tokenOwner, progId);
      const agentInfo = await conn.getAccountInfo(agentPda);
      if (agentInfo) {
        agentCount = 1;
      }
    } catch {
      // Silenciar errores
    }

    // Obtener count de frozen
    let frozenCount = 0;
    try {
      const frozenPda = deriveBalancePda(tokenStatePda, tokenOwner, progId);
      const frozenInfo = await conn.getAccountInfo(frozenPda);
      if (frozenInfo) {
        frozenCount = 1;
      }
    } catch {
      // Silenciar errores
    }

    // Obtener balance del owner
    let balance = BigInt(0);
    try {
      const balancePda = deriveBalancePda(tokenStatePda, tokenOwner, progId);
      const balanceInfo = await conn.getAccountInfo(balancePda);
      if (balanceInfo && balanceInfo.data.length >= 48) {
        const balanceData = parseBalanceAccount(balanceInfo.data);
        if (balanceData.wallet === tokenOwner.toBase58()) {
          balance = balanceData.balance;
        }
      }
    } catch {
      // Silenciar errores
    }

    return {
      tokenId,
      name: parsed.name.trim() || `Token ${tokenId}`,
      symbol: parsed.symbol.trim() || 'UNK',
      decimals: parsed.decimals,
      totalSupply: parsed.totalSupply,
      owner: parsed.owner,
      freezeAuthority: parsed.freezeAuthority,
      agentCount,
      frozenCount,
      balance,
      tokenStatePda: tokenStatePda.toBase58(),
    };
  } catch (err: any) {
    console.error(`[useTokenList] Error building token:`, err);
    return null;
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTokenList({
  ownerAddress,
  programId,
  enabled = true,
}: UseTokenListProps): UseTokenListReturn {
  const { connection } = useConnection();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenList = useCallback(async () => {
    console.log('[useTokenList] fetchTokenList called');
    console.log('[useTokenList] ownerAddress:', ownerAddress?.toBase58() ?? 'null');
    console.log('[useTokenList] programId:', programId?.toBase58() ?? 'null');
    console.log('[useTokenList] connection:', connection ? 'exists' : 'null');
    
    if (!ownerAddress || !programId || !connection) {
      console.warn('[useTokenList] Missing dependencies:', {
        hasOwner: !!ownerAddress,
        hasProgramId: !!programId,
        hasConnection: !!connection,
      });
      setTokens([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ownerBase58 = ownerAddress.toBase58();
      console.log(`[useTokenList] Fetching all program accounts for program: ${programId.toBase58()}`);

      // Primero, obtener TODAS las cuentas sin filtro para verificar
      console.log(`[useTokenList] Fetching ALL program accounts (no filters)...`);
      const allAccountsRaw = await connection.getProgramAccounts(programId);
      console.log(`[useTokenList] Total raw accounts: ${allAccountsRaw.length}`);
      
      // Mostrar tamaños de datos de las cuentas
      const dataSizeMap = new Map<number, number>();
      for (const { account } of allAccountsRaw) {
        const size = account.data.length;
        dataSizeMap.set(size, (dataSizeMap.get(size) || 0) + 1);
      }
      console.log('[useTokenList] Data sizes distribution:', Object.fromEntries(dataSizeMap));

      // Usar TODAS las cuentas (ya filtramos por owner después)
      const allAccounts = allAccountsRaw;
      console.log(`[useTokenList] Using ${allAccounts.length} raw accounts`);

      const foundTokens: TokenInfo[] = [];

      // Filtrar por owner y construir TokenInfo
      let skipped = 0;
      for (const { pubkey, account } of allAccounts) {
        try {
          // Verificar que la cuenta pertenezca al owner
          const data = Buffer.from(account.data);
          console.log(`[useTokenList] Processing account ${pubkey.toBase58()}, data length: ${data.length}`);
          
          if (data.length < 144) {
            console.warn(`[useTokenList] Account ${pubkey.toBase58()} has insufficient data length: ${data.length}`);
            skipped++;
            continue;
          }
          
          // Leer owner desde offset 8 (después del discriminator de Anchor)
          const ownerFromOffset8 = new PublicKey(data.slice(8, 40)).toBase58();
          // Leer owner desde offset 0 (incorrecto, pero para debug)
          const ownerFromOffset0 = new PublicKey(data.slice(0, 32)).toBase58();
          
          console.log(`[useTokenList] Owner from offset 8: ${ownerFromOffset8}`);
          console.log(`[useTokenList] Owner from offset 0: ${ownerFromOffset0}`);
          console.log(`[useTokenList] Expected owner: ${ownerBase58}`);
          console.log(`[useTokenList] Match offset 8: ${ownerFromOffset8 === ownerBase58}`);
          console.log(`[useTokenList] Raw bytes (offset 8-40): ${data.slice(8, 40).toString('hex')}`);
          
          const accountOwner = ownerFromOffset8;
          
          if (accountOwner !== ownerBase58) {
            skipped++;
            continue;
          }

          console.log(`[useTokenList] Found token owned by wallet: ${pubkey.toBase58()}`);
          
          if (accountOwner !== ownerBase58) {
            skipped++;
            continue; // No es nuestro token
          }

          console.log(`[useTokenList] Found token owned by wallet: ${pubkey.toBase58()}`);
          
          // Extraer token_id del data (offset 112 para nuevo layout)
          let tokenId = pubkey.toBase58().slice(0, 16); // Usar PDA como fallback único
          try {
            const parsed = parseTokenState(data);
            tokenId = parsed.tokenId || parsed.name || tokenId;
          } catch (err: any) {
            console.warn(`[useTokenList] Error parsing token state: ${err.message}`);
          }

          const tokenInfo = await buildTokenInfo(
            pubkey,
            ownerAddress,
            connection,
            programId,
            tokenId
          );

          if (tokenInfo) {
            foundTokens.push(tokenInfo);
            console.log(`[useTokenList] Successfully built token: ${tokenInfo.name} (${tokenInfo.symbol}) - ID: ${tokenInfo.tokenId}`);
          }
        } catch (err: any) {
          console.warn(`[useTokenList] Error processing account ${pubkey.toBase58()}:`, err.message);
        }
      }

      console.log(`[useTokenList] Scan complete: found ${foundTokens.length} tokens for owner`);
      setTokens(foundTokens);
    } catch (err: any) {
      console.error('[useTokenList] Error fetching token list:', err);
      setError(err?.message || 'Failed to fetch token list');
    } finally {
      setLoading(false);
    }
  }, [ownerAddress, programId, connection]);

  const refetch = useCallback(() => {
    fetchTokenList();
  }, [fetchTokenList]);

  const getTokenById = useCallback(
    (tokenId: string) => {
      return tokens.find((t) => t.tokenId === tokenId);
    },
    [tokens]
  );

  useEffect(() => {
    console.log('[useTokenList] useEffect triggered:', { 
      enabled, 
      hasOwner: !!ownerAddress, 
      hasProgramId: !!programId, 
      hasConnection: !!connection 
    });
    
    if (enabled && ownerAddress && programId && connection) {
      fetchTokenList();
    } else {
      setTokens([]);
    }
  }, [enabled, ownerAddress, programId, connection, fetchTokenList]);

  return {
    tokens,
    loading,
    error,
    refetch,
    getTokenById,
  };
}
