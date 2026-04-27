'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { WalletName } from '@solana/wallet-adapter-base';

/**
 * Custom hook for managing Solana wallet connections.
 *
 * Fase 2 - Simplificado:
 * - Sin polling en connectToWallet (conexión directa)
 * - Un solo useEffect de conexión (sin race conditions)
 * - Sin auto-connect redundante
 * - Estado basado en pendingWallet
 *
 * This hook wraps @solana/wallet-adapter-react and provides:
 * - Reliable wallet selection with proper async handling
 * - Connection state tracking
 * - Error handling with descriptive messages
 * - Detailed logging for diagnostics
 */
export function useWalletManager() {
  const {
    connected,
    publicKey,
    connecting,
    disconnect,
    connect,
    wallets,
    select,
    wallet,
  } = useWallet();

  // Track the wallet we're trying to connect to
  const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null);
  const [selectedWalletName, setSelectedWalletName] = useState<WalletName | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Ref for logging previous state
  const lastConnectionStateRef = useRef({ connected, connecting, wallet: wallet?.adapter.name });

  // ============================================================
  // Fase 1.3 - Logging de estado de conexión para diagnóstico
  // ============================================================
  useEffect(() => {
    const currentState = { connected, connecting, wallet: wallet?.adapter.name };
    const stateChanged =
      currentState.connected !== lastConnectionStateRef.current.connected ||
      currentState.connecting !== lastConnectionStateRef.current.connecting ||
      currentState.wallet !== lastConnectionStateRef.current.wallet;

    if (stateChanged) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [WalletManager]`;

      console.log(`${prefix} STATE CHANGE:`, {
        connected: currentState.connected,
        connecting: currentState.connecting,
        wallet: currentState.wallet,
        publicKey: publicKey?.toString()?.slice(0, 8) + '...',
        pendingWallet: pendingWallet,
      });

      if (currentState.connected) {
        console.log(`${prefix} ✓ CONNECTED successfully via wallet: ${currentState.wallet}`);
      } else if (currentState.connecting) {
        console.log(`${prefix} ⏳ CONNECTING to wallet: ${currentState.wallet || pendingWallet || 'unknown'}`);
      } else if (lastConnectionStateRef.current.connected && !currentState.connected) {
        console.log(`${prefix} ✗ DISCONNECTED`);
      }

      lastConnectionStateRef.current = currentState;
    }
  }, [connected, connecting, wallet, publicKey, pendingWallet]);

  // Log available wallets on mount and when wallets change
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [WalletManager] Available wallets (${wallets.length}):`);
    wallets.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.adapter.name} | readyState: ${w.readyState} | icon: ${w.adapter.icon || 'none'}`);
    });
  }, [wallets]);

  // Clear error when connected
  useEffect(() => {
    if (connected) {
      setLastError(null);
      setPendingWallet(null);
    }
  }, [connected]);

  /**
   * Select a wallet and prepare for connection.
   * Fase 2: Simpler approach - just select and return true if ready.
   */
  const selectWallet = useCallback((walletName: WalletName) => {
    const walletInstance = wallets.find(w => w.adapter.name === walletName);
    if (!walletInstance) {
      const error = new Error(`Wallet "${walletName}" not found`);
      setLastError(error);
      return false;
    }

    setLastError(null);
    setPendingWallet(walletName);
    setSelectedWalletName(walletName);
    select(walletName);
    return true;
  }, [wallets, select]);

  /**
   * Connect to the currently selected wallet.
   * Fase 2: Direct connection without polling.
   */
  const doConnect = useCallback(async () => {
    try {
      await connect();
      setPendingWallet(null);
    } catch (err) {
      setLastError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [connect]);

  /**
   * Select and connect to a wallet in one call.
   * Fase 2: Simplified - no polling, direct connection.
   *
   * The wallet-adapter-react select() is synchronous and prepares
   * the wallet for connection. The connect() call then triggers
   * the wallet's UI (popup, extension, etc.).
   */
  const connectToWallet = useCallback(async (walletName: WalletName): Promise<void> => {
    const selected = selectWallet(walletName);
    if (!selected) {
      throw new Error(`Failed to select wallet "${walletName}"`);
    }

    // Direct connection - no polling needed
    // The wallet-adapter handles the async UI interaction internally
    try {
      await connect();
      setPendingWallet(null);
    } catch (err) {
      setLastError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [selectWallet, connect]);

  /**
   * Disconnect from the current wallet.
   */
  const handleDisconnect = useCallback(() => {
    setSelectedWalletName(null);
    setLastError(null);
    setPendingWallet(null);
    disconnect();
  }, [disconnect]);

  /**
   * Get the public key as a string, or null if not connected.
   */
  const publicKeyString = publicKey?.toString() || null;

  /**
   * Format the public key for display (e.g., "Abc...Def").
   */
  const formatAddress = useCallback((address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  /**
   * Get available wallets that are ready to use.
   */
  const availableWallets = wallets.filter(
    w => w.readyState === 'Installed' || w.readyState === 'Loadable'
  );

  return {
    // State
    connected,
    connecting,
    publicKey: publicKeyString,
    selectedWallet: selectedWalletName,
    pendingWallet,
    lastError,
    availableWallets,

    // Actions
    connectToWallet,
    selectWallet,
    doConnect,
    disconnect: handleDisconnect,
    formatAddress,

    // Helpers
    wallets,
    wallet,
  };
}

export type WalletManager = ReturnType<typeof useWalletManager>;
