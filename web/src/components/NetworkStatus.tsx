'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';

/**
 * NetworkStatus component - Displays real-time network status
 * Shows current network, slot number, and connection status
 */
export function NetworkStatus() {
  const { connection }: { connection: Connection } = useConnection();
  const [networkType, setNetworkType] = useState<'localnet' | 'devnet' | 'mainnet'>('localnet');
  const [slot, setSlot] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState<boolean>(false);

  const fetchSlot = useCallback(async () => {
    try {
      const currentSlot = await connection.getSlot();
      setSlot(currentSlot);
      setConnected(true);
      setLastUpdate(new Date());
    } catch {
      setConnected(false);
    }
  }, [connection]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Detect network type from connection config
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      setNetworkType('localnet');
    } else if (endpoint.includes('devnet')) {
      setNetworkType('devnet');
    } else if (endpoint.includes('mainnet')) {
      setNetworkType('mainnet');
    }

    // Initial fetch
    fetchSlot();

    // Poll slot every 5 seconds
    const interval = setInterval(fetchSlot, 5000);

    return () => clearInterval(interval);
  }, [connection, fetchSlot, mounted]);

  const networkLabel = getNetworkLabel(networkType);
  const networkColor = getNetworkColor(networkType);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div
        className={`
          relative backdrop-blur-xl rounded-xl shadow-2xl
          px-4 py-2.5 min-w-72 overflow-hidden
          animate-[fadeInUp_0.3s_ease-out]
          border
        `}
        style={{
          background: `linear-gradient(135deg, ${networkColor}10 0%, ${networkColor}05 100%)`,
          borderColor: `${networkColor}30`
        }}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-xl" style={{ boxShadow: `inset 0 0 20px ${networkColor}10` }} />
        
        {/* Scanning line animation */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r-transparent via-primary to-transparent opacity-50"
             style={{
               background: `linear-gradient(90deg, transparent, ${networkColor}, transparent)`,
               animation: 'shimmer 3s ease-in-out infinite'
             }}
        />
        
        <div className="relative flex items-center gap-3">
          {/* Status indicator */}
          <div className="relative flex-shrink-0">
            <div
              className={`
                w-2.5 h-2.5 rounded-full
                ${connected ? 'bg-success' : 'bg-error'}
                ${connected ? 'animate-pulse' : ''}
              `}
            />
            {connected && (
              <div
                className={`
                  absolute inset-0 rounded-full
                  bg-success animate-ping
                  opacity-50
                `}
              />
            )}
          </div>
          
          {/* Network info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">{networkLabel}</span>
              <span className="text-[10px] text-foreground-muted font-mono">
                #{slot.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-foreground-muted">
              <span className={connected ? 'text-success' : 'text-error'}>
                {connected ? '● Connected' : '○ Disconnected'}
              </span>
              <span className="hidden sm:inline opacity-50">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Network icon */}
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-foreground-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function getNetworkLabel(network: 'localnet' | 'devnet' | 'mainnet'): string {
  const labels: Record<string, string> = {
    localnet: 'Localnet',
    devnet: 'Devnet',
    mainnet: 'Mainnet',
  };
  return labels[network] || 'Unknown';
}

function getNetworkColor(network: 'localnet' | 'devnet' | 'mainnet'): string {
  const colors: Record<string, string> = {
    localnet: '#8b5cf6',
    devnet: '#f59e0b',
    mainnet: '#10b981',
  };
  return colors[network] || colors.localnet;
}

/**
 * NetworkBadge component - Compact network status badge
 */
export function NetworkBadge({ network }: { network?: 'localnet' | 'devnet' | 'mainnet' }) {
  const net = network || 'localnet';
  const label = getNetworkLabel(net);
  const color = getNetworkColor(net);

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        border backdrop-blur-sm
      `}
      style={{
        background: `${color}10`,
        borderColor: `${color}30`,
        color: color
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
