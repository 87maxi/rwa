/**
 * ManageLayout.tsx
 * 
 * Layout principal para la página de gestión.
 * Proporna estructura consistente con header y content area.
 * Incluye navbar con WalletConnect y NetworkStatus.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkStatus } from '@/components/NetworkStatus';
import { ClientOnly } from '@/components/ClientOnly';

// ============================================================================
// Types
// ============================================================================

interface ManageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ManageLayout({ children, className = '' }: ManageLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />

      {/* Noise overlay */}
      <div className="noise-overlay fixed inset-0 pointer-events-none" />

      {/* ============================================
          NAVBAR (igual que la página home)
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18">
            {/* Left side - Logo & Brand */}
            <div className="navbar-brand flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                {/* Animated logo */}
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
      <div className="relative z-10">
        {/* Header */}
        <header className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Back to Home */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-primary transition-colors mb-4"
              aria-label="Volver a la página principal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver al Inicio</span>
            </Link>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow-secondary">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Token Management</h1>
                <p className="text-foreground-muted">Manage your token operations and settings</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="px-4 pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
