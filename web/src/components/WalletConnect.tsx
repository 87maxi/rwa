'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaConnection } from '@/hooks/useSolanaConnection';

// Custom styles for wallet adapter buttons
const walletButtonStyles = `
  .solana-wallet-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%) !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 10px 20px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    color: white !important;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3) !important;
    transition: all 0.3s ease !important;
    cursor: pointer !important;
  }
  
  .solana-wallet-btn:hover {
    box-shadow: 0 0 30px rgba(6, 182, 212, 0.5) !important;
    transform: translateY(-1px) !important;
  }
  
  .solana-wallet-dropdown-list {
    background: rgba(15, 15, 36, 0.95) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(139, 92, 246, 0.2) !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
    overflow: hidden !important;
  }
  
  .solana-wallet-dropdown-list button {
    color: #f1f5f9 !important;
    transition: all 0.2s ease !important;
  }
  
  .solana-wallet-dropdown-list button:hover {
    background: rgba(139, 92, 246, 0.2) !important;
  }
`;

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
        <div className="px-4 py-2 bg-surface/50 border border-surface-border rounded-xl animate-pulse min-w-[140px] text-center">
          <span className="text-xs text-foreground-muted">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: walletButtonStyles }} />
      
      <div className="flex items-center gap-3">
        {/* Network Badge - Enhanced */}
        <div 
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${networkColor}15 0%, ${networkColor}08 100%)`,
            border: `1px solid ${networkColor}30`
          }}
        >
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: `inset 0 0 10px ${networkColor}20` }} />
          
          <div className="relative flex items-center gap-2">
            {/* Pulsing dot */}
            <div className="relative">
              <div 
                className="w-2 h-2 rounded-full animate-ping opacity-75" 
                style={{ backgroundColor: networkColor }}
              />
              <div 
                className="absolute inset-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: networkColor }}
              />
            </div>
            <span className="relative text-foreground-secondary" style={{ color: networkColor }}>{networkLabel}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-surface-border" />

        {/* Wallet Section */}
        {connected ? (
          <div className="flex items-center gap-2">
            {/* Address Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              <span className="text-xs font-mono text-success-light">{shortAddress}</span>
            </div>
            
            {/* Wallet Button */}
            <button className="solana-wallet-btn" />
          </div>
        ) : (
          <button className="solana-wallet-btn" />
        )}
      </div>
    </>
  );
}
