'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useWalletContextSafe, WalletLogger } from '@/wallet';
import { useWalletManager } from '@/hooks/useWalletManager';
import type { WalletName } from '@solana/wallet-adapter-base';

interface WalletOption {
  name: string;
  icon: string;
}

const WALLET_OPTIONS: Record<string, WalletOption> = {
  Phantom: { name: 'Phantom', icon: '🟣' },
  Solflare: { name: 'Solflare', icon: '🔴' },
  Ledger: { name: 'Ledger', icon: '⚫' },
  Trezor: { name: 'Trezor', icon: '🟡' },
  Coinbase: { name: 'Coinbase', icon: '🔵' },
};

export function WalletConnect() {
  // Use new wallet abstraction layer when available
  const walletContext = useWalletContextSafe();
  // Fallback to legacy hook
  const legacyManager = useWalletManager();

  // Prefer new context values, fallback to legacy
  const connected = walletContext?.connected ?? legacyManager.connected;
  const publicKey = walletContext?.publicKey ?? legacyManager.publicKey;
  const selectedWallet = walletContext?.currentWallet ?? legacyManager.selectedWallet;
  const availableWallets = walletContext?.availableWallets ?? legacyManager.availableWallets;
  const lastError = legacyManager.lastError;

  const [showDropdown, setShowDropdown] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const shortAddress = useMemo(() => {
    if (!publicKey) return '';
    const addr = typeof publicKey === 'string' ? publicKey : publicKey.toString();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }, [publicKey]);

  const handleConnect = useCallback(async (walletName: string) => {
    setConnecting(true);
    setShowDropdown(false);
    try {
      if (walletContext) {
        walletContext.logger.logConnection({
          wallet: walletName,
          status: 'connecting',
        });
        const result = await walletContext.connect(walletName as WalletName);
        if (result.success) {
          walletContext.logger.logConnection({
            wallet: walletName,
            status: 'connected',
            publicKey: result.publicKey,
          });
        } else {
          walletContext.logger.logConnection({
            wallet: walletName,
            status: 'error',
            error: result.error || 'Connection failed',
          });
        }
      } else {
        await legacyManager.connectToWallet(walletName as WalletName);
      }
    } catch {
      // Error is handled by respective hook
    } finally {
      setConnecting(false);
    }
  }, [walletContext, legacyManager.connectToWallet]);

  const handleDisconnect = useCallback(() => {
    if (walletContext) {
      walletContext.disconnect();
    } else {
      legacyManager.disconnect();
    }
    setShowDropdown(false);
  }, [walletContext, legacyManager.disconnect]);

  if (!connected) {
    return (
      <div className="relative">
        <button
          onClick={() => !connecting && setShowDropdown(!showDropdown)}
          disabled={connecting}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6a4 4 0 00-4-4H8a4 4 0 00-4 4v2a4 4 0 004 4h8a4 4 0 004-4V9z" />
              </svg>
              Connect Wallet
            </>
          )}
        </button>

        {lastError && (
          <div className="absolute top-full left-0 right-0 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {lastError.message}
          </div>
        )}

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl z-50 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-400 px-3 py-2 uppercase tracking-wider">Select wallet</p>
              {availableWallets.length > 0 ? (
                availableWallets.map((w) => {
                  const option = WALLET_OPTIONS[w.adapter.name];
                  return (
                    <button
                      key={w.adapter.name}
                      onClick={() => handleConnect(w.adapter.name)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                      disabled={connecting}
                    >
                      <span className="text-xl">{option?.icon || '💼'}</span>
                      <span className="text-white font-medium">{w.adapter.name}</span>
                      {w.adapter.icon && (
                        <Image src={w.adapter.icon} alt={w.adapter.name} width={20} height={20} className="ml-auto" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-gray-400 text-sm">
                  No wallet extensions detected
                  <div className="mt-2 text-xs text-gray-500">
                    Install Phantom or Solflare
                  </div>
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-t border-gray-700/50">
              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Need a wallet? &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-mono text-gray-300">{shortAddress}</span>
        {selectedWallet && (
          <span className="text-xs text-gray-500">{selectedWallet}</span>
        )}
      </div>
      <button
        onClick={handleDisconnect}
        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
      >
        Disconnect
      </button>
    </div>
  );
}
