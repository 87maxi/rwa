/**
 * Wallet Provider - Unified context provider for wallet operations
 *
 * Provides a centralized interface for wallet connection, transaction signing,
 * and network management that is agnostic to the underlying wallet implementation.
 *
 * This provider wraps @solana/wallet-adapter-react and adds:
 * - Centralized logging via WalletLogger
 * - Ethereum conflict detection via EthereumShield
 * - Unified transaction management
 * - Clean API for consumer hooks
 */

'use client';

import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import type { WalletName } from '@solana/wallet-adapter-base';

import { WalletLogger } from './logger';
import { EthereumShield } from './ethereum-shield';
import type {
  WalletContextType,
  WalletStatus,
  WalletInfo,
  ConnectionResult,
  TransactionResult,
} from './types';
import type { NetworkType } from '@/config/solana';
import { getNetworkFromUrl } from '@/config/solana';

// ============================================================================
// Context
// ============================================================================

const WalletContext = createContext<WalletContextType | null>(null);

/**
 * Hook to access the wallet context (throws if not available)
 */
export function useWalletContext(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}

/**
 * Hook to safely access the wallet context (returns null if not available)
 */
export function useWalletContextSafe(): WalletContextType | null {
  return useContext(WalletContext);
}

// ============================================================================
// Provider Component
// ============================================================================

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Solana wallet adapter hooks
  const {
    connected,
    connecting,
    publicKey,
    connect,
    disconnect,
    wallets,
    select,
    wallet,
    signTransaction,
  } = useWallet();

  const { connection } = useConnection();

  // Initialize singleton services
  const logger = useMemo(() => new WalletLogger({
    enabled: process.env.NODE_ENV !== 'production',
    minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }), []);

  const ethereumShield = useMemo(() => new EthereumShield(), []);

  // Track wallet selection state
  const [currentWalletName, setCurrentWalletName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for stabilizing callbacks
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  const selectRef = useRef(select);
  const signTransactionRef = useRef(signTransaction);
  const walletsRef = useRef(wallets);
  const walletRef = useRef(wallet);
  const connectionRef = useRef(connection);

  useEffect(() => { connectRef.current = connect; }, [connect]);
  useEffect(() => { disconnectRef.current = disconnect; }, [disconnect]);
  useEffect(() => { selectRef.current = select; }, [select]);
  useEffect(() => { signTransactionRef.current = signTransaction; }, [signTransaction]);
  useEffect(() => { walletsRef.current = wallets; }, [wallets]);
  useEffect(() => { walletRef.current = wallet; }, [wallet]);
  useEffect(() => { connectionRef.current = connection; }, [connection]);

  // Derived state
  const status: WalletStatus = useMemo(() => {
    if (error) return 'error';
    if (connected) return 'connected';
    if (connecting) return 'connecting';
    return 'disconnected';
  }, [connected, connecting, error]);

  const network: NetworkType = useMemo(() => {
    if (!connection) return 'localnet';
    return getNetworkFromUrl(connection.rpcEndpoint);
  }, [connection]);

  const endpoint = connection?.rpcEndpoint || 'http://localhost:8899';

  // Map wallet adapter wallets to our WalletInfo type
  const availableWallets: WalletInfo[] = useMemo(() => {
    return wallets.map((w) => ({
      name: w.adapter.name,
      icon: w.adapter.icon || null,
      url: w.adapter.url || null,
      readyState: w.readyState,
      adapter: w.adapter,
    }));
  }, [wallets]);

  // ========================================================================
  // Connection Actions
  // ========================================================================

  /**
   * Select a wallet by name
   */
  const selectWallet = useCallback((walletName: string): boolean => {
    const walletInstance = walletsRef.current.find(
      (w) => w.adapter.name === walletName
    );

    if (!walletInstance) {
      const errorMsg = `Wallet "${walletName}" not found`;
      setError(errorMsg);
      logger.logError({
        category: 'wallet',
        message: errorMsg,
        context: { availableWallets: walletsRef.current.map((w) => w.adapter.name) },
      });
      return false;
    }

    setError(null);
    setCurrentWalletName(walletName);
    selectRef.current(walletName as WalletName);

    logger.logConnection({
      wallet: walletName,
      status: 'connecting',
    });

    return true;
  }, [logger]);

  /**
   * Connect to the currently selected wallet
   */
  const connectWallet = useCallback(async (walletName?: string): Promise<ConnectionResult> => {
    try {
      // If a wallet name is provided, select it first
      if (walletName) {
        const selected = selectWallet(walletName);
        if (!selected) {
          return {
            success: false,
            publicKey: null,
            wallet: null,
            error: `Failed to select wallet "${walletName}"`,
          };
        }

        // Wait for wallet adapter to propagate selection state
        // Without this delay, connect() throws WalletNotSelectedError
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify a wallet is actually selected before connecting
      if (!walletRef.current) {
        const errorMsg = 'No wallet selected. Please select a wallet first.';
        setError(errorMsg);
        logger.logError({
          category: 'wallet',
          message: errorMsg,
        });
        return {
          success: false,
          publicKey: null,
          wallet: null,
          error: errorMsg,
        };
      }

      // Attempt connection
      await connectRef.current();

      const result: ConnectionResult = {
        success: true,
        publicKey: publicKey,
        wallet: currentWalletName || wallet?.adapter.name || null,
        error: null,
      };

      logger.logConnection({
        wallet: result.wallet,
        status: 'connected',
        publicKey: result.publicKey,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);

      logger.logError({
        category: 'wallet',
        message: 'Connection failed',
        error: err,
        context: { wallet: walletName },
      });

      return {
        success: false,
        publicKey: null,
        wallet: walletName || null,
        error: message,
      };
    }
  }, [connect, publicKey, currentWalletName, wallet, selectWallet, logger]);

  /**
   * Disconnect from the current wallet
   */
  const disconnectWallet = useCallback(async (): Promise<void> => {
    const previousWallet = currentWalletName;
    const previousKey = publicKey?.toString();

    disconnectRef.current();
    setCurrentWalletName(null);
    setError(null);

    logger.logConnection({
      wallet: previousWallet,
      status: 'disconnected',
      publicKey: null,
    });

    console.info(`[Wallet] Disconnected from ${previousWallet || 'wallet'} (${previousKey?.slice(0, 8)}...)`);
  }, [disconnect, currentWalletName, publicKey, logger]);

  // ========================================================================
  // Transaction Actions
  // ========================================================================

  /**
   * Sign a transaction with the connected wallet
   */
  const signTx = useCallback(async (transaction: Transaction): Promise<Transaction> => {
    if (!signTransactionRef.current) {
      throw new Error('Wallet does not support transaction signing');
    }

    logger.logTransaction({
      programId: transaction.instructions[0]?.programId.toString(),
      instructions: transaction.instructions.length,
      accounts: transaction.instructions.flatMap((ix) =>
        ix.keys.map((k) => k.pubkey.toString())
      ),
    });

    const signed = await signTransactionRef.current(transaction);

    logger.logTransaction({
      signature: null,
      programId: signed.instructions[0]?.programId.toString(),
      instructions: signed.instructions.length,
    });

    return signed;
  }, [logger]);

  /**
   * Sign and send a transaction with full logging
   */
  const signAndSend = useCallback(async (transaction: Transaction): Promise<TransactionResult> => {
    const currentConnection = connectionRef.current;
    const currentPublicKey = publicKey;

    if (!currentConnection) {
      throw new Error('Connection not available');
    }

    if (!currentPublicKey) {
      throw new Error('Wallet not connected');
    }

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await currentConnection.getLatestBlockhash();

    logger.logNetwork({
      endpoint,
      method: 'getLatestBlockhash',
      response: {
        blockhash: blockhash.toString(),
        lastValidBlockHeight,
      },
    });

    // Set transaction fields
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = currentPublicKey;

    // Log transaction build data
    logger.logTransaction({
      programId: transaction.instructions[0]?.programId.toString(),
      instructions: transaction.instructions.length,
      accounts: transaction.instructions.flatMap((ix) =>
        ix.keys.map((k) => k.pubkey.toString())
      ),
      data: transaction.instructions[0]?.data.toString('hex'),
      blockhash: blockhash.toString(),
      blockHeight: lastValidBlockHeight,
    });

    try {
      // Sign transaction
      const signedTransaction = await signTx(transaction);

      // Serialize and send
      const serializedTransaction = signedTransaction.serialize({ verifySignatures: false });

      const signature = await currentConnection.sendRawTransaction(serializedTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      logger.logTransaction({
        signature,
        blockhash: blockhash.toString(),
        blockHeight: lastValidBlockHeight,
      });

      // Confirm transaction
      await currentConnection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      // Get transaction logs
      let logs: string[] = [];
      try {
        const txDetails = await currentConnection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        logs = txDetails?.meta?.logMessages || [];
      } catch {
        // Logs are optional
      }

      const result: TransactionResult = {
        signature,
        blockhash: blockhash.toString(),
        blockHeight: lastValidBlockHeight,
        commitment: 'confirmed',
        logs,
        error: null,
      };

      logger.logTransaction({
        signature,
        commitment: 'confirmed',
        logs,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Handle specific error cases
      if (message.includes('User rejected') || message.includes('rejected') || message.includes('User canceled')) {
        throw new Error('Transaction rejected by user');
      }

      if (message.includes('blockhash not found') || message.includes('Blockhash not found')) {
        throw new Error('Failed to get a valid blockhash. Please try again.');
      }

      if (message.includes('Plugin Closed') || message.includes('plugin closed')) {
        logger.warn('transaction', 'Plugin Closed error - wallet closed before send completed', {
          error: message,
        });
        throw new Error('Wallet plugin closed. Please try again and keep the wallet window open.');
      }

      logger.logError({
        category: 'transaction',
        message: 'Transaction failed',
        error: err,
        context: { blockhash: blockhash.toString() },
      });

      throw err;
    }
  }, [connection, publicKey, endpoint, signTx, logger]);

  // ========================================================================
  // State Change Logging
  // ========================================================================

  // Log connection state changes
  useEffect(() => {
    const currentState = { connected, connecting, wallet: wallet?.adapter.name };
    logger.logConnection({
      wallet: wallet?.adapter.name || null,
      status: connected ? 'connected' : connecting ? 'connecting' : 'disconnected',
      publicKey,
    });
  }, [connected, connecting, wallet, publicKey, logger]);

  // Log available wallets on mount
  useEffect(() => {
    logger.debug('wallet', `Available wallets: ${wallets.length}`, {
      wallets: wallets.map((w) => ({
        name: w.adapter.name,
        readyState: w.readyState,
      })),
    });
  }, [wallets, logger]);

  // ========================================================================
  // Context Value
  // ========================================================================

  const contextValue = useMemo<WalletContextType>(() => ({
    // Connection state
    status,
    publicKey,
    connected,
    connecting,
    currentWallet: currentWalletName || wallet?.adapter.name || null,
    availableWallets,

    // Connection actions
    connect: connectWallet,
    disconnect: disconnectWallet,
    selectWallet,

    // Transaction actions
    signAndSend,
    signTransaction: signTx,

    // Network state
    network,
    endpoint,
    connection,

    // Services
    logger,
    ethereumShield,
  }), [
    status,
    publicKey,
    connected,
    connecting,
    currentWalletName,
    wallet,
    availableWallets,
    connectWallet,
    disconnectWallet,
    selectWallet,
    signAndSend,
    signTx,
    network,
    endpoint,
    connection,
    logger,
    ethereumShield,
  ]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}
