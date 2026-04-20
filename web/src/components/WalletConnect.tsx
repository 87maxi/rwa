'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getNetworkFromUrl } from '@/config/solana';
import '@solana/wallet-adapter-react-ui/styles.css';
import { useState, useEffect } from 'react';

export function WalletConnect() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState<string>('localnet');

  // Read localStorage only on client side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedNetwork = localStorage.getItem('solanaNetwork') || 'localnet';
    setNetwork(getNetworkFromUrl(savedNetwork));
  }, []);

  // Format address for display
  const address = publicKey?.toString() || '';
  const shortAddress = address.length > 10 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  const networkColors: Record<string, string> = {
    localnet: '#8b5cf6',
    devnet: '#f59e0b',
    mainnet: '#10b981',
  };

  const networkLabels: Record<string, string> = {
    localnet: 'Local',
    devnet: 'Devnet',
    mainnet: 'Mainnet',
  };

  const networkColor = networkColors[network] || networkColors.localnet;
  const networkLabel = networkLabels[network] || 'Local';

  // Custom styling for the wallet button
  const customStyles = `
    .solana-wallet-btn {
      background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%) !important;
      border: none !important;
      border-radius: 12px !important;
      padding: 12px 24px !important;
      font-weight: 600 !important;
      font-size: 15px !important;
      color: white !important;
      min-height: 48px !important;
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.35) !important;
      transition: all 0.3s ease !important;
      font-family: 'DM Sans', system-ui, sans-serif !important;
      letter-spacing: 0.01em !important;
    }
    
    .solana-wallet-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 0 35px rgba(139, 92, 246, 0.5) !important;
    }
    
    .solana-wallet-button {
      font-family: 'DM Sans', system-ui, sans-serif !important;
    }
    
    .solana-wallet-dropdown {
      background: rgba(10, 10, 46, 0.95) !important;
      backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(100, 120, 200, 0.2) !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
      min-width: 280px !important;
    }
    
    .solana-wallet-dropdown-list button {
      padding: 14px 18px !important;
      font-size: 15px !important;
      color: #e2e8f0 !important;
      border: none !important;
      transition: all 0.2s ease !important;
      min-height: 52px !important;
    }
    
    .solana-wallet-dropdown-list button:hover {
      background: rgba(139, 92, 246, 0.15) !important;
      color: #a78bfa !important;
    }
    
    .solana-wallet-dropdown-divider {
      border-color: rgba(100, 120, 200, 0.15) !important;
    }
    
    .solana-wallet-dropdown-disconnect {
      color: #ef4444 !important;
    }
    
    .solana-wallet-modal-button {
      font-size: 14px !important;
      padding: 10px 16px !important;
    }
  `;

  // Render placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="relative">
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        <WalletMultiButton className="solana-wallet-btn" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="relative">
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        <WalletMultiButton className="solana-wallet-btn" />
      </div>
    );
  }

  return (
    <div className="relative">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="flex items-center gap-3">
        {/* Network indicator badge */}
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ 
            background: 'rgba(10, 10, 46, 0.6)',
            borderColor: 'rgba(100, 120, 200, 0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Pulsing dot */}
          <div className="relative">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ 
                backgroundColor: networkColor,
                boxShadow: `0 0 8px ${networkColor}60`
              }}
            />
            <div 
              className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-60" 
              style={{ backgroundColor: networkColor }}
            />
          </div>
          <span 
            className="text-sm font-semibold tabular-nums"
            style={{ color: networkColor }}
          >
            {networkLabel}
          </span>
        </div>
        
        {/* Wallet address with disconnect hover */}
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 group cursor-pointer"
          style={{ 
            background: 'rgba(10, 10, 46, 0.6)',
            borderColor: 'rgba(100, 120, 200, 0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => {
            // Trigger disconnect when clicking the wallet info
            document.dispatchEvent(new CustomEvent('wallet-disconnect'));
          }}
        >
          <span className="text-sm font-mono text-foreground-secondary group-hover:text-foreground transition-colors tabular-nums">
            {shortAddress}
          </span>
          
          {/* Disconnect icon - visible on hover */}
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
          >
            <svg className="w-3.5 h-3.5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
