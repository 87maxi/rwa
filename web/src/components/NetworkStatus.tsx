'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import type { Connection } from '@solana/web3.js';

export function NetworkStatus() {
  const { connection } = useConnection();
  const [slot, setSlot] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const fetchSlot = useCallback(async () => {
    const startTime = Date.now();
    try {
      const slotNumber = await connection.getSlot();
      const end_time = Date.now();
      setSlot(slotNumber);
      setLatency(end_time - startTime);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, [connection]);

  useEffect(() => {
    // Initial fetch
    fetchSlot();
    
    // Update every 5 seconds
    const interval = setInterval(fetchSlot, 5000);
    
    return () => clearInterval(interval);
  }, [fetchSlot]);

  const getNetworkColor = (network: string): string => {
    const colors: Record<string, string> = {
      localnet: '#8b5cf6',
      devnet: '#f59e0b',
      mainnet: '#10b981',
      unknown: '#64748b',
    };
    return colors[network] || colors.unknown;
  };

  const getNetworkLabel = (network: string): string => {
    const labels: Record<string, string> = {
      localnet: 'Localnet',
      devnet: 'Devnet',
      mainnet: 'Mainnet',
      unknown: 'Unknown',
    };
    return labels[network] || labels.unknown;
  };

  // Get network from connection config or default to localnet
  const network = connection.rpcEndpoint.includes('devnet') 
    ? 'devnet' 
    : connection.rpcEndpoint.includes('mainnet') 
      ? 'mainnet' 
      : 'localnet';

  const color = getNetworkColor(network);
  const label = getNetworkLabel(network);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface/50 border border-surface-border" 
      style={{ 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div className="relative">
          {/* Outer ring */}
          <div 
            className="w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: isConnected ? color : '#ef4444',
              boxShadow: `0 0 6px ${isConnected ? color + '60' : '#ef444460'}`
            }}
          />
          {/* Pulse animation */}
          {isConnected && (
            <div 
              className="absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-60" 
              style={{ backgroundColor: color }}
            />
          )}
        </div>
        <span className="text-xs font-semibold text-foreground truncate">{label}</span>
      </div>
      
      <div className="h-4 w-px bg-surface-border" />
      
      {/* Slot and latency */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-foreground-muted tabular-nums">Slot: <span className="text-foreground-secondary tabular-nums">{slot.toLocaleString()}</span></span>
        <span className={`tabular-nums ${latency > 200 ? 'text-warning' : 'text-success'}`}>{latency}ms</span>
      </div>
    </div>
  );
}

export function NetworkBadge({ network }: { network?: 'localnet' | 'devnet' | 'mainnet' }) {
  const color = network === 'mainnet' ? '#10b981' : network === 'devnet' ? '#f59e0b' : '#8b5cf6';
  const label = network === 'mainnet' ? 'Mainnet' : network === 'devnet' ? 'Devnet' : 'Localnet';

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ 
        background: `${color}15`,
        borderColor: `${color}30`,
        color: color,
        border: '1.5px solid'
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}
