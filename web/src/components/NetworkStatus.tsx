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
          backdrop-blur-md border-l-4 rounded-lg shadow-xl
          px-4 py-3 min-w-64
          animate-[fadeInUp_0.3s_ease-out]
          ${networkColor}
        `}
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="relative">
            <div 
              className={`
                w-3 h-3 rounded-full
                ${connected ? 'bg-emerald-400' : 'bg-red-400'}
                ${connected ? 'animate-pulse' : ''}
              `}
            />
            {connected && (
              <div 
                className={`
                  absolute inset-0 rounded-full
                  bg-emerald-400 animate-ping
                  opacity-75
                `}
              />
            )}
          </div>
          
          {/* Network info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{networkLabel}</span>
              <span className="text-xs text-white/70">
                Slot: {slot.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-white/60">
              {connected ? 'Connected' : 'Disconnected'}
              <span className="ml-2">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
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
    localnet: 'bg-blue-500/90 border-blue-400 text-white',
    devnet: 'bg-amber-500/90 border-amber-400 text-white',
    mainnet: 'bg-emerald-500/90 border-emerald-400 text-white',
  };
  return colors[network] || colors.localnet;
}

/**
 * NetworkBadge component - Compact network status badge
 */
export function NetworkBadge({ network }: { network?: 'localnet' | 'devnet' | 'mainnet' }) {
  const net = network || 'localnet';
  const label = getNetworkLabel(net);

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        backdrop-blur-md border
        ${getNetworkColor(net)}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${net === 'localnet' ? 'bg-blue-400' : net === 'devnet' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
      {label}
    </span>
  );
}
