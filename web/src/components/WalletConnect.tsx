'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Wallet } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletOption {
  name: string;
  icon: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  { name: 'Phantom', icon: '🟣' },
  { name: 'Solflare', icon: '🔴' },
  { name: 'Ledger', icon: '⚫' },
  { name: 'Trezor', icon: '🟡' },
  { name: 'Coinbase', icon: '🔵' },
];

function isWalletReady(wallet: Wallet): boolean {
  return wallet.readyState === 'Installed' || wallet.readyState === 'Loadable';
}

export function WalletConnect() {
  const { connected, publicKey, disconnect, connect, wallets, select } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  // Format address for display
  const address = publicKey?.toString() || '';
  const shortAddress = address.length > 10
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  // Filter wallets that are available
  const availableWallets = useMemo(() => {
    return wallets.filter(isWalletReady);
  }, [wallets]);

  const handleConnect = async (walletName: string) => {
    const wallet = wallets.find(w => w.adapter.name === walletName);
    if (!wallet) {
      console.error('Wallet not found:', walletName);
      setShowDropdown(false);
      return;
    }
    
    try {
      // select() must be called before connect() and may need to be awaited
      select(wallet.adapter.name);
      // Wait a tick for the wallet state to update
      await new Promise(resolve => setTimeout(resolve, 0));
      await connect();
    } catch (err) {
      console.error('Connection error:', err);
      // Check if it's a user rejection or NotSelected error
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('UserRejectedRequest') || errorMsg.includes('user rejected')) {
        console.log('Wallet connection rejected by user');
      } else if (errorMsg.includes('NotSelected')) {
        console.error('WalletNotSelectedError: select() may not have completed. Try again.');
      }
    } finally {
      setShowDropdown(false);
    }
  };

  if (!connected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6a4 4 0 00-4-4H8a4 4 0 00-4 4v2a4 4 0 004 4h8a4 4 0 004-4V9z" />
          </svg>
          Connect Wallet
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl z-50 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-400 px-3 py-2 uppercase tracking-wider">Select wallet</p>
              {availableWallets.length > 0 ? (
                availableWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleConnect(wallet.adapter.name)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="text-xl">{WALLET_OPTIONS.find(w => w.name === wallet.adapter.name)?.icon || '💼'}</span>
                    <span className="text-white font-medium">{wallet.adapter.name}</span>
                    {wallet.adapter.icon && (
                      <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-5 h-5 ml-auto" />
                    )}
                  </button>
                ))
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
                Don't have a wallet? →
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
      </div>
      <button
        onClick={() => {
          disconnect();
          setShowDropdown(false);
        }}
        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
      >
        Disconnect
      </button>
    </div>
  );
}
