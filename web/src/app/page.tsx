'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RWA</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Solana RWA Platform
              </h1>
            </div>
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Powered by Solana Blockchain
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Compliant Security
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Tokens</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Create and manage ERC-3643 compliant security tokens on Solana with built-in KYC/AML compliance,
            transfer restrictions, and regulatory controls.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Deploy Token Card */}
          <Link href="/deploy" className="group block">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-purple-600 transition-colors">
                Deploy New Token
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Create a new compliant security token on Solana with customizable compliance rules and identity verification.
              </p>
              <ul className="text-sm text-gray-500 space-y-3">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Maximum balance per wallet
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Maximum number of holders
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Transfer lock period
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  Identity verification (KYC/AML)
                </li>
              </ul>
            </div>
          </Link>

          {/* Manage Tokens Card */}
          <Link href="/manage" className="group block">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-500 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-blue-600 transition-colors">
                Manage Tokens
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Transfer tokens, manage identities, and monitor compliance status in real-time.
              </p>
              <ul className="text-sm text-gray-500 space-y-3">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  Transfer tokens to verified investors
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  Register and verify investor identities
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  View compliance status
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  Manage trusted claim issuers
                </li>
              </ul>
            </div>
          </Link>
        </div>

        {/* About Section */}
        <div className="mt-20 bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              About Solana RWA Tokenization
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real World Assets (RWA) tokenization on Solana provides fast, low-cost, and compliant
              security token issuance with enterprise-grade features.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Identity Registry */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Identity Registry</h4>
              <p className="text-sm text-gray-600">
                On-chain identity verification with claim-based authentication and multi-signature support
              </p>
            </div>

            {/* Compliance Modules */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Compliance Modules</h4>
              <p className="text-sm text-gray-600">
                Modular compliance rules enforced at the smart contract level with customizable policies
              </p>
            </div>

            {/* Trusted Issuers */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">Trusted Issuers</h4>
              <p className="text-sm text-gray-600">
                Authorized third parties for KYC/AML claim verification and delegated management
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {connected && (
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-purple-600">3</div>
              <div className="text-sm text-gray-600 mt-1">Smart Contracts</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-blue-600">10+</div>
              <div className="text-sm text-gray-600 mt-1">Wallet Support</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-indigo-600">{'<1s'}</div>
              <div className="text-sm text-gray-600 mt-1">Transaction Time</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="text-3xl font-bold text-green-600">{'< $0.01'}</div>
              <div className="text-sm text-gray-600 mt-1">Avg. Fee</div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-white/50 backdrop-blur-sm border-t border-gray-200/50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2026 Solana RWA Token Platform. Built with Anchor Framework & Next.js</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
