'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { useWallet } from '@solana/wallet-adapter-react';
import { NetworkStatus } from '@/components/NetworkStatus';
import { ClientOnly } from '@/components/ClientOnly';

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background orbs - enhanced depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb-1 orb" />
        <div className="orb-2 orb" />
        <div className="orb-3 orb" />
      </div>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-40" />

      {/* Noise overlay */}
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
          <div className="absolute top-3 left-3/4 w-1.5 h-1.5 bg-primary rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Left side - Logo & Brand */}
            <div className="navbar-brand flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                {/* Animated logo with enhanced effects */}
                <div className="relative w-11 h-11 flex-shrink-0">
                  {/* Outer glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500 opacity-40 blur-sm" />
                  {/* Inner logo */}
                  <div className="relative w-11 h-11 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow">
                    <span className="text-white font-bold text-sm tracking-wider">RWA</span>
                  </div>
                  {/* Corner highlight */}
                  <div className="absolute top-1 left-1 w-3 h-3 rounded-tl-lg bg-white/20" />
                </div>
                <div>
                  <h1 className="navbar-brand-text bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradientText">
                    Solana RWA
                  </h1>
                  <p className="navbar-subtitle text-foreground-muted">Token Platform</p>
                </div>
              </Link>
              
              {/* Network badge */}
              <div className="hidden md:flex navbar-badge">
                <div className="relative">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-60 bg-success" />
                </div>
                <span className="text-success-light">Solana Active</span>
              </div>
            </div>

            {/* Right side - Network + Wallet */}
            <div className="navbar-actions flex items-center gap-3">
              <ClientOnly fallback={<div className="w-24 h-10" />}>
                <NetworkStatus />
              </ClientOnly>
              <div className="navbar-divider" />
              <ClientOnly fallback={<div className="w-32 h-12" />}>
                <WalletConnect />
              </ClientOnly>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================
          MAIN CONTENT
          ============================================ */}
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Section - enhanced with better typography and spacing */}
        <div className="text-center mb-20 animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-full text-sm font-semibold text-primary-light mb-8">
            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            Powered by Solana Blockchain
          </div>
          
          {/* Main heading - larger, more impactful */}
          <h2 className="text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight">
            Compliant Security
            <span className="block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradientText">
              Tokens
            </span>
          </h2>
          
          {/* Description - enhanced readability */}
          <p className="text-xl text-foreground-secondary max-w-3xl mx-auto leading-relaxed">
            Create and manage compliant security tokens on Solana with built-in KYC/AML compliance,
            transfer restrictions, and regulatory controls.
          </p>
        </div>

        {/* Feature Cards - enhanced with textures and better spacing */}
        <div className="grid md:grid-cols-2 gap-10 mt-16">
          {/* Deploy Token Card */}
          <Link href="/deploy" className="group block">
            <div className="feature-card relative overflow-hidden">
              {/* Functional texture - dot pattern for action cards */}
              <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
              
              {/* Animated top border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-glow">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-primary-light transition-colors">
                  Deploy New Token
                </h3>
                <p className="text-foreground-secondary mb-8 leading-relaxed text-lg">
                  Create a new compliant security token on Solana with customizable compliance rules and identity verification.
                </p>
                <ul className="text-sm text-foreground-tertiary space-y-4">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    Maximum balance per wallet
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    Maximum number of holders
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    Transfer lock period
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    Identity verification (KYC/AML)
                  </li>
                </ul>
              </div>
            </div>
          </Link>

          {/* Manage Tokens Card */}
          <Link href="/manage" className="group block">
            <div className="feature-card relative overflow-hidden">
              {/* Functional texture - dot pattern for action cards */}
              <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
              
              {/* Animated top border */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-dark rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-glow-secondary">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-secondary-light transition-colors">
                  Manage Tokens
                </h3>
                <p className="text-foreground-secondary mb-8 leading-relaxed text-lg">
                  Transfer tokens, manage identities, and monitor compliance status in real-time.
                </p>
                <ul className="text-sm text-foreground-tertiary space-y-4">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />
                    Transfer tokens to verified investors
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />
                    Register and verify investor identities
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />
                    View compliance status
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-secondary rounded-full flex-shrink-0" />
                    Manage trusted claim issuers
                  </li>
                </ul>
              </div>
            </div>
          </Link>
        </div>

        {/* About Section - enhanced with hexagonal texture for info blocks */}
        <div className="mt-24 glass-card rounded-3xl p-10 animate-fade-in-up">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-foreground mb-4">
              About Solana RWA Tokenization
            </h3>
            <p className="text-foreground-secondary max-w-2xl mx-auto text-lg">
              Real World Assets (RWA) tokenization on Solana provides fast, low-cost, and compliant
              security token issuance with enterprise-grade features.
            </p>
          </div>
          
          {/* Info cards with hexagonal texture */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Identity Registry */}
            <div className="text-center p-8 rounded-2xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors relative overflow-hidden">
              {/* Hexagonal texture for info blocks */}
              <div className="absolute inset-0 hex-pattern opacity-40 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-bold text-xl mb-3 text-foreground">Identity Registry</h4>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  On-chain identity verification with claim-based authentication and multi-signature support
                </p>
              </div>
            </div>

            {/* Compliance Modules */}
            <div className="text-center p-8 rounded-2xl bg-secondary/5 border border-secondary/10 hover:border-secondary/30 transition-colors relative overflow-hidden">
              {/* Hexagonal texture for info blocks */}
              <div className="absolute inset-0 hex-pattern opacity-40 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary to-secondary-dark rounded-xl flex items-center justify-center mx-auto mb-6 shadow-glow-secondary">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-bold text-xl mb-3 text-foreground">Compliance Modules</h4>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  Modular compliance rules enforced at the smart contract level with customizable policies
                </p>
              </div>
            </div>

            {/* Trusted Issuers */}
            <div className="text-center p-8 rounded-2xl bg-primary-light/5 border border-primary-light/10 hover:border-primary-light/30 transition-colors relative overflow-hidden">
              {/* Hexagonal texture for info blocks */}
              <div className="absolute inset-0 hex-pattern opacity-40 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-light to-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-xl mb-3 text-foreground">Trusted Issuers</h4>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  Authorized third parties for KYC/AML claim verification and delegated management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section - enhanced with better spacing */}
        {connected && (
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up">
            <div className="glass-card p-8 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">3</div>
              <div className="text-sm text-foreground-tertiary mt-2 font-medium">Smart Contracts</div>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">10+</div>
              <div className="text-sm text-foreground-tertiary mt-2 font-medium">Wallet Support</div>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-success to-secondary bg-clip-text text-transparent">
                <span>{"<"}1s</span>
              </div>
              <div className="text-sm text-foreground-tertiary mt-2 font-medium">Transaction Time</div>
            </div>
            <div className="glass-card p-8 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-warning to-success bg-clip-text text-transparent">
                <span>{"<"}$0.01</span>
              </div>
              <div className="text-sm text-foreground-tertiary mt-2 font-medium">Avg. Fee</div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="mt-24 footer-container border-t border-surface-border">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-foreground-tertiary">
            <p className="text-sm">© 2026 Solana RWA Token Platform. Built with Anchor Framework & Next.js</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
