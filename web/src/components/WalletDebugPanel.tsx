'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletContextSafe } from '@/wallet/WalletProvider';

/**
 * Debug panel for wallet detection diagnostics.
 *
 * This component helps identify:
 * - Which wallets are detected and their state
 * - window.ethereum conflicts
 * - Wallet Standard compatibility
 * - Connection state transitions
 * - Transaction logs from WalletLogger
 *
 * Usage: Import and add <WalletDebugPanel /> anywhere in the app tree
 * under WalletProvider. Enable/disable via ?debug=wallet in URL.
 */

interface WalletDebugInfo {
  wallets: Array<{
    name: string;
    icon: string | null;
    readyState: string;
    url: string | null;
  }>;
  walletStandard: {
    supported: boolean;
    providersCount: number;
  };
  solana: {
    exists: boolean;
    isSolana: boolean;
    isPhantom?: boolean;
  };
  connectionState: {
    connected: boolean;
    connecting: boolean;
    publicKey: string | null;
    wallet: string | null;
  };
  ethereum: {
    hasConflict: boolean;
    providers: string[];
    recommendation: string;
  };
}

export function WalletDebugPanel() {
  const { wallets, connected, connecting, publicKey, wallet } = useWallet();

  // Safely access wallet context
  const walletContext = useWalletContextSafe();
  const hasWalletContext = !!walletContext;

  const [loggerEntries, setLoggerEntries] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<WalletDebugInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Check URL parameter for enabling debug panel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const initialVisible = params.get('debug') === 'wallet';
      setIsVisible(initialVisible);
    }
  }, []);

  // Collect debug information
  const collectDebugInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const walletInfo = wallets.map(w => ({
      name: w.adapter.name,
      icon: w.adapter.icon,
      readyState: w.readyState,
      url: w.adapter.url || null,
    }));

    // Check Wallet Standard support
    const walletStandardProviders = (window as any).__SOLANA_WALLET_STANDARD_PROVIDERS__;
    const walletStandardCount = walletStandardProviders ?
      (Array.isArray(walletStandardProviders) ? walletStandardProviders.length : Object.keys(walletStandardProviders).length) : 0;

    // Check Solana object
    const solanaExists = 'solana' in window;
    const solanaObj = (window as any).solana;
    const isSolana = solanaObj && typeof solanaObj.signTransaction === 'function';
    const isPhantom = solanaObj?.isPhantom === true;

    // Ethereum shield status
    let ethereumInfo = {
      hasConflict: false,
      providers: [] as string[],
      recommendation: 'Not available',
    };

    if (walletContext?.ethereumShield) {
      const status = walletContext.ethereumShield.getConflictStatus();
      ethereumInfo = status;
    }

    setDebugInfo({
      wallets: walletInfo,
      walletStandard: {
        supported: typeof walletStandardProviders !== 'undefined',
        providersCount: walletStandardCount,
      },
      solana: {
        exists: solanaExists,
        isSolana: !!isSolana,
        isPhantom,
      },
      connectionState: {
        connected,
        connecting,
        publicKey: publicKey?.toString() || null,
        wallet: wallet?.adapter.name || null,
      },
      ethereum: ethereumInfo,
    });

    // Update logger entries
    if (walletContext?.logger) {
      setLoggerEntries(walletContext.logger.getEntries());
    }

    // Log ethereum shield status
    if (walletContext?.ethereumShield) {
      walletContext.ethereumShield.logStatus();
    }
  }, [wallets, connected, connecting, publicKey, wallet, walletContext]);

  // Update debug info periodically
  useEffect(() => {
    if (!isVisible) return;
    collectDebugInfo();
    const interval = setInterval(collectDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [isVisible, collectDebugInfo]);

  // Log connection state changes
  useEffect(() => {
    if (!isVisible) return;

    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] connected=${connected} connecting=${connecting} wallet=${wallet?.adapter.name || 'none'} publicKey=${publicKey?.toString()?.slice(0, 8) || 'none'}`;

    setLogs(prev => {
      const updated = [...prev, log];
      return updated.slice(-50);
    });
  }, [connected, connecting, wallet, publicKey, isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] px-3 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg border border-gray-700 hover:bg-gray-700"
      >
        🔧 Wallet Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[80vh] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
        <h3 className="text-sm font-semibold text-white">🔧 Wallet Debug Panel</h3>
        <div className="flex items-center gap-2">
          {hasWalletContext && (
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
              Abstraction Layer ✓
            </span>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Connection State */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Connection State</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            Connected: {connected ? '✓' : '✗'}
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${connecting ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
            Connecting: {connecting ? '✓' : '✗'}
          </div>
          <div className="col-span-2 px-2 py-1 rounded text-xs bg-gray-500/10 text-gray-300 font-mono truncate">
            Wallet: {wallet?.adapter.name || 'None'}
          </div>
          <div className="col-span-2 px-2 py-1 rounded text-xs bg-gray-500/10 text-gray-300 font-mono truncate">
            Public Key: {publicKey?.toString() || 'None'}
          </div>
        </div>
      </div>

      {/* Detected Wallets */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Detected Wallets ({wallets.length})</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {wallets.length === 0 ? (
            <p className="text-xs text-gray-500">No wallets detected</p>
          ) : (
            wallets.map((w) => (
              <div key={w.adapter.name} className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-gray-500/10">
                <span>{w.adapter.name}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded ${
                  w.readyState === 'Installed' ? 'bg-green-500/20 text-green-400' :
                  w.readyState === 'Loadable' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {w.readyState}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ethereum Shield Status */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Ethereum Shield</h4>
        {debugInfo?.ethereum ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Conflict Detected:</span>
              <span className={debugInfo.ethereum.hasConflict ? 'text-red-400' : 'text-green-400'}>
                {debugInfo.ethereum.hasConflict ? '⚠ Yes' : '✓ No'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Providers:</span>
              <span className="text-gray-300">
                {debugInfo.ethereum.providers.length > 0 ? debugInfo.ethereum.providers.join(', ') : 'None'}
              </span>
            </div>
            <div className="px-2 py-1 rounded text-xs bg-gray-500/10 text-gray-400">
              {debugInfo.ethereum.recommendation}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Loading...</p>
        )}
      </div>

      {/* Solana Object Status */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Solana Object</h4>
        {debugInfo?.solana ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">window.solana Exists:</span>
              <span className={debugInfo.solana.exists ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.solana.exists ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Is Solana Provider:</span>
              <span className={debugInfo.solana.isSolana ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.solana.isSolana ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Is Phantom:</span>
              <span className={debugInfo.solana.isPhantom ? 'text-green-400' : 'text-gray-400'}>
                {debugInfo.solana.isPhantom ? '✓' : '✗'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Loading...</p>
        )}
      </div>

      {/* Wallet Standard Status */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Wallet Standard</h4>
        {debugInfo?.walletStandard ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Supported:</span>
              <span className={debugInfo.walletStandard.supported ? 'text-green-400' : 'text-yellow-400'}>
                {debugInfo.walletStandard.supported ? '✓' : '⚠'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Providers Detected:</span>
              <span className="text-gray-300">
                {debugInfo.walletStandard.providersCount}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Loading...</p>
        )}
      </div>

      {/* Logger Entries */}
      {hasWalletContext && loggerEntries.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-700/50">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Logger Entries ({loggerEntries.length})
          </h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {loggerEntries.slice(-10).map((entry, i) => (
              <div key={i} className="text-[10px] font-mono">
                <span className="text-gray-500">[{entry.timestamp?.slice(11, 19)}]</span>{' '}
                <span className={`
                  ${entry.level === 'error' ? 'text-red-400' : ''}
                  ${entry.level === 'warn' ? 'text-yellow-400' : ''}
                  ${entry.level === 'info' ? 'text-blue-400' : ''}
                  ${entry.level === 'debug' ? 'text-gray-400' : ''}
                `}>
                  [{entry.level?.toUpperCase()}]
                </span>{' '}
                <span className="text-purple-400">[{entry.category}]</span>{' '}
                <span className="text-gray-300">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Logs */}
      <div className="flex-1 px-4 py-3 overflow-hidden flex flex-col min-h-0">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Connection Logs</h4>
        <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-gray-300 leading-relaxed">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-800/50 flex gap-2">
        <button
          onClick={collectDebugInfo}
          className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-400 text-xs rounded-lg hover:bg-blue-500/30 transition-colors"
        >
          🔄 Refresh
        </button>
        <button
          onClick={() => {
            setLogs([]);
            if (walletContext?.logger) {
              walletContext.logger.clear();
            }
          }}
          className="flex-1 px-3 py-2 bg-gray-500/20 text-gray-400 text-xs rounded-lg hover:bg-gray-500/30 transition-colors"
        >
          🗑️ Clear Logs
        </button>
        {hasWalletContext && (
          <button
            onClick={() => {
              if (walletContext?.logger) {
                navigator.clipboard.writeText(walletContext.logger.exportLogs());
              }
            }}
            className="flex-1 px-3 py-2 bg-green-500/20 text-green-400 text-xs rounded-lg hover:bg-green-500/30 transition-colors"
          >
            📋 Export
          </button>
        )}
      </div>
    </div>
  );
}
