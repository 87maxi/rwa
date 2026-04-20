'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaConnection } from '@/hooks/useSolanaConnection';

export function WalletConnect() {
  const { connected } = useWallet();
  const { networkLabel, networkColor, shortAddress } = useSolanaConnection();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg animate-pulse min-w-[140px] text-center">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Network Indicator */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
        style={{ borderLeft: `3px solid ${networkColor}` }}
      >
        <div 
          className="w-2 h-2 rounded-full animate-pulse" 
          style={{ backgroundColor: networkColor }}
        />
        <span className="text-gray-700">{networkLabel}</span>
      </div>

      {/* Solana Wallet Button */}
      {connected ? (
        <div className="flex items-center gap-2">
          <WalletMultiButton className="solana-wallet-btn" />
          <span className="hidden sm:inline-block px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
            {shortAddress}
          </span>
        </div>
      ) : (
        <WalletMultiButton className="solana-wallet-btn" />
      )}
    </div>
  );
}
