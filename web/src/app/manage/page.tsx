'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkStatus } from '@/components/NetworkStatus';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaConnection, useWalletBalance } from '@/hooks';

export default function ManagePage() {
  const { connected } = useWallet();
  const { shortAddress } = useSolanaConnection();
  const { balance: solBalance } = useWalletBalance();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'transfer' | 'mint' | 'burn' | 'freeze' | 'agents'>('transfer');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Set mounted state on client side only to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [accountToFreeze, setAccountToFreeze] = useState('');

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    
    setIsLoading(true);
    // Simulate transaction (in production, use actual Anchor SDK)
    setTimeout(() => {
      setTransactionHash('5KtPqWNRcGJYr7nE3dXZvQ2RmFbHcJwYpLsGvNuTaDxM');
      setIsLoading(false);
    }, 2000);
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setTransactionHash('3mKpWNRcGJYr7nE3dXZvQ2RmFbHcJwYpLsGvNuTaDxM');
      setIsLoading(false);
    }, 2000);
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setTransactionHash('8xRpWNRcGJYr7nE3dXZvQ2RmFbHcJwYpLsGvNuTaDxM');
      setIsLoading(false);
    }, 2000);
  };

  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setTransactionHash('2vQpWNRcGJYr7nE3dXZvQ2RmFbHcJwYpLsGvNuTaDxM');
      setIsLoading(false);
    }, 2000);
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setTransactionHash('6nTpWNRcGJYr7nE3dXZvQ2RmFbHcJwYpLsGvNuTaDxM');
      setIsLoading(false);
    }, 2000);
  };

  const tabs = [
    { id: 'transfer' as const, label: 'Transfer', icon: 'M7 17L17 7M17 7H7M17 7V17' },
    { id: 'mint' as const, label: 'Mint Tokens', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
    { id: 'burn' as const, label: 'Burn Tokens', icon: 'M19 7l-1 14H6L5 7M5 7h14M5 7l2-3h10l2 3' },
    { id: 'freeze' as const, label: 'Freeze Account', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'agents' as const, label: 'Manage Agents', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  ];

  if (!connected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="orb absolute -top-1/4 -left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="orb absolute top-1/3 -right-1/4 w-80 h-80 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="noise-overlay fixed inset-0 pointer-events-none" />
        <div className="text-center p-8 relative z-10 animate-fadeIn">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Wallet Required</h2>
          <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
            Please connect your Solana wallet to manage tokens and execute transactions.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:from-primary-dark hover:to-secondary-dark transition-all shadow-glow hover:shadow-glow-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb absolute -top-1/4 -left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="orb absolute top-1/3 -right-1/4 w-80 h-80 bg-secondary rounded-full blur-3xl" />
      </div>
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="noise-overlay fixed inset-0 pointer-events-none" />

      {/* ============================================
          ENHANCED NAVBAR WITH ANIMATED HEADER
          ============================================ */}
      <nav className="navbar-container sticky top-0 z-50 backdrop-blur-xl border-b border-surface-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Left side - Logo & Brand with page title */}
            <div className="navbar-brand flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                {/* Animated logo */}
                <div className="relative w-11 h-11 flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500 opacity-40 blur-sm" />
                  <div className="relative w-11 h-11 bg-gradient-to-br from-secondary to-primary rounded-xl flex items-center justify-center shadow-glow-secondary">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="absolute top-1 left-1 w-3 h-3 rounded-tl-lg bg-white/20" />
                </div>
                <div>
                  <h1 className="navbar-brand-text bg-gradient-to-r from-secondary via-primary to-secondary bg-clip-text text-transparent animate-gradientText">
                    Manage Tokens
                  </h1>
                  <p className="navbar-subtitle text-foreground-muted">Solana RWA Platform</p>
                </div>
              </Link>
            </div>

            {/* Right side - Network + Wallet */}
            <div className="navbar-actions flex items-center gap-3">
              <NetworkStatus />
              <div className="navbar-divider" />
              <WalletConnect />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Wallet Info */}
        <div className="glass-card p-8 mb-12 animate-fadeInUp">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm text-foreground-tertiary mb-1">Connected Wallet</p>
              <p className="font-mono text-foreground text-lg">{mounted ? shortAddress : 'Connecting...'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-foreground-tertiary mb-1">SOL Balance</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {isLoading ? '...' : (mounted ? solBalance.toFixed(4) : '0.0000')} SOL
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card overflow-hidden animate-fadeInUp">
          {/* Enhanced Tab Navigation */}
          <div className="border-b border-surface-border" style={{ background: 'rgba(10, 10, 46, 0.3)' }}>
            <div className="tab-container overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${
                    activeTab === tab.id
                      ? 'tab-button-active'
                      : 'tab-button-inactive'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transfer Tab */}
          {activeTab === 'transfer' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Transfer Tokens</h3>
              <p className="text-foreground-tertiary mb-8">Send tokens to another Solana address.</p>
              <form onSubmit={handleTransfer} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000000001"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold shadow-glow hover:shadow-glow-secondary min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Transfer Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Mint Tab */}
          {activeTab === 'mint' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Mint New Tokens</h3>
              <p className="text-foreground-tertiary mb-8">Create new tokens and send to a recipient.</p>
              <form onSubmit={handleMint} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Amount to Mint</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000000001"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold shadow-glow hover:shadow-glow-secondary min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Mint Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Burn Tab */}
          {activeTab === 'burn' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Burn Tokens</h3>
              <p className="text-foreground-tertiary mb-8">Permanently remove tokens from circulation.</p>
              <form onSubmit={handleBurn} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">From Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-error focus:border-transparent transition-all hover:border-error/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Amount to Burn</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000000001"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-error focus:border-transparent transition-all hover:border-error/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-error to-warning text-white rounded-xl font-semibold min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Burn Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Freeze Tab */}
          {activeTab === 'freeze' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Freeze/Unfreeze Account</h3>
              <p className="text-foreground-tertiary mb-8">Toggle the freeze status of a token account.</p>
              <form onSubmit={handleFreeze} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Account Address</label>
                  <input
                    type="text"
                    value={accountToFreeze}
                    onChange={(e) => setAccountToFreeze(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-warning focus:border-transparent transition-all hover:border-warning/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-warning to-error text-white rounded-xl font-semibold min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Toggle Freeze Status'}
                </button>
              </form>
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Manage Agents</h3>
              <p className="text-foreground-secondary mb-8">
                Agents are authorized addresses that can perform token operations on your behalf.
              </p>
              <form onSubmit={handleAddAgent} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">Agent Address</label>
                  <input
                    type="text"
                    value={agentAddress}
                    onChange={(e) => setAgentAddress(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-success focus:border-transparent transition-all hover:border-success/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-success to-secondary text-white rounded-xl font-semibold min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Add Agent'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {transactionHash && (
          <div className="mt-8 bg-success/10 border border-success/20 rounded-2xl p-6 animate-fadeInUp">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-success-light">Transaction Submitted!</p>
                <p className="text-sm text-success-light/80 font-mono">{transactionHash}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
