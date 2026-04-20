'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkStatus } from '@/components/NetworkStatus';
import { useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_CONFIG } from '@/config/solana';

interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  mintAuthority: string;
  freezeAuthority: string;
}

export default function DeployPage() {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [tokenConfig, setTokenConfig] = useState<TokenConfig>({
    name: TOKEN_CONFIG.defaultName,
    symbol: TOKEN_CONFIG.defaultSymbol,
    decimals: TOKEN_CONFIG.defaultDecimals,
    initialSupply: '0',
    mintAuthority: '',
    freezeAuthority: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setIsLoading(true);
    // Simulate token deployment (in production, use actual Anchor SDK)
    setTimeout(() => {
      setTransactionHash('7xRpWNRcGJYr7nE3dXZvQ2RmFbHcJwYpLsGvNuTaDxM');
      setIsLoading(false);
    }, 3000);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Animated background orbs */}
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
            Please connect your Solana wallet to deploy a new token.
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
        {/* Animated gradient top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-primary animate-gradientShift" style={{ backgroundSize: '200% auto' }} />
        
        {/* Header animation - floating particles */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-primary rounded-full animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-5 left-1/3 w-1.5 h-1.5 bg-secondary rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-2 left-1/2 w-1 h-1 bg-primary-light rounded-full animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-8 left-2/3 w-2 h-2 bg-secondary rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Left side - Logo & Brand with page title */}
            <div className="navbar-brand flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                {/* Animated logo */}
                <div className="relative w-11 h-11 flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500 opacity-40 blur-sm" />
                  <div className="relative w-11 h-11 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="absolute top-1 left-1 w-3 h-3 rounded-tl-lg bg-white/20" />
                </div>
                <div>
                  <h1 className="navbar-brand-text bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradientText">
                    Deploy Token
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
      <main className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Info Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-12 backdrop-blur-sm">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-light mb-1">About Token Deployment</p>
              <p className="text-base text-foreground-secondary leading-relaxed">
                Deploying a new compliant security token on Solana. The token will be registered on-chain with your wallet as the owner. Ensure all configuration details are accurate before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Deployment Form */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fadeInUp">
          <div className="p-8 border-b border-surface-border">
            <h2 className="text-2xl font-bold text-foreground">Token Configuration</h2>
            <p className="text-sm text-foreground-tertiary mt-1">Configure your new security token parameters</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Token Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground-secondary mb-2">
                Token Name <span className="text-error">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={tokenConfig.name}
                onChange={(e) => setTokenConfig({ ...tokenConfig, name: e.target.value })}
                placeholder="My Security Token"
                className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                required
              />
            </div>

            {/* Token Symbol */}
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-foreground-secondary mb-2">
                Symbol <span className="text-error">*</span>
              </label>
              <input
                id="symbol"
                type="text"
                value={tokenConfig.symbol}
                onChange={(e) => setTokenConfig({ ...tokenConfig, symbol: e.target.value.toUpperCase() })}
                placeholder="MST"
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                required
              />
            </div>

            {/* Decimals and Initial Supply */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="decimals" className="block text-sm font-medium text-foreground-secondary mb-2">
                  Decimals
                </label>
                <input
                  id="decimals"
                  type="number"
                  value={tokenConfig.decimals}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, decimals: Number(e.target.value) })}
                  min="0"
                  max="18"
                  className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                />
              </div>

              <div>
                <label htmlFor="initialSupply" className="block text-sm font-medium text-foreground-secondary mb-2">
                  Initial Supply (Post-Deployment)
                </label>
                <input
                  id="initialSupply"
                  type="number"
                  value={tokenConfig.initialSupply}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, initialSupply: e.target.value })}
                  placeholder="0"
                  step="0.000000001"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                />
              </div>
            </div>

            {/* Authority Configuration */}
            <div className="bg-background-secondary/50 rounded-2xl p-6 space-y-4 border border-surface-border">
              <h3 className="font-semibold text-foreground text-lg">Authority Configuration</h3>
              <p className="text-sm text-foreground-tertiary">
                Leave blank to use your connected wallet as the authority.
              </p>

              <div>
                <label htmlFor="mintAuthority" className="block text-sm font-medium text-foreground-secondary mb-2">
                  Mint Authority
                </label>
                <input
                  id="mintAuthority"
                  type="text"
                  value={tokenConfig.mintAuthority}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, mintAuthority: e.target.value })}
                  placeholder="Leave blank for current wallet"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                />
              </div>

              <div>
                <label htmlFor="freezeAuthority" className="block text-sm font-medium text-foreground-secondary mb-2">
                  Freeze Authority
                </label>
                <input
                  id="freezeAuthority"
                  type="text"
                  value={tokenConfig.freezeAuthority}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, freezeAuthority: e.target.value })}
                  placeholder="Leave blank for current wallet"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                />
              </div>
            </div>

            {/* Deployment Summary */}
            <div className="bg-primary/10 rounded-2xl p-6 border border-primary/20">
              <h3 className="font-semibold text-primary-light mb-3 text-lg">Deployment Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-primary-light">Token:</span>
                  <span className="ml-2 text-foreground font-medium">{tokenConfig.name}</span>
                </div>
                <div>
                  <span className="text-primary-light">Symbol:</span>
                  <span className="ml-2 text-foreground font-medium">{tokenConfig.symbol}</span>
                </div>
                <div>
                  <span className="text-primary-light">Decimals:</span>
                  <span className="ml-2 text-foreground font-medium">{tokenConfig.decimals}</span>
                </div>
                <div>
                  <span className="text-primary-light">Network:</span>
                  <span className="ml-2 text-foreground font-medium">Solana Localnet</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg hover:from-primary-dark hover:to-secondary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:shadow-glow-secondary min-h-[56px]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deploying Token...
                </span>
              ) : (
                'Deploy Token'
              )}
            </button>
          </form>
        </div>

        {/* Transaction Status */}
        {transactionHash && (
          <div className="mt-8 bg-success/10 border border-success/20 rounded-2xl p-8 animate-fadeInUp">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-success-light text-xl">Token Deployed Successfully!</h3>
                <p className="text-sm text-success-light/80 mt-1">Your token has been registered on the Solana blockchain.</p>
                <div className="mt-4 bg-background rounded-xl p-4 border border-success/20">
                  <p className="text-xs text-success-light/80 mb-1">Transaction Hash</p>
                  <p className="text-sm font-mono text-success-light break-all">{transactionHash}</p>
                </div>
                <div className="mt-6 flex gap-4">
                  <Link
                    href="/manage"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-success text-white rounded-xl text-sm font-semibold hover:bg-success-light transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Token
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-background-secondary text-success border border-success/30 rounded-xl text-sm font-semibold hover:bg-success/10 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Go Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
