'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Wallet Required</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Please connect your Solana wallet to deploy a new token.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Deploy New Token
              </h1>
            </div>
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">About Token Deployment</p>
              <p className="text-sm text-blue-700 mt-1">
                Deploying a new compliant security token on Solana. The token will be registered on-chain with your wallet as the owner.
              </p>
            </div>
          </div>
        </div>

        {/* Deployment Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Token Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">Configure your new security token parameters</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Token Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Token Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={tokenConfig.name}
                onChange={(e) => setTokenConfig({ ...tokenConfig, name: e.target.value })}
                placeholder="My Security Token"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Token Symbol */}
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                Symbol <span className="text-red-500">*</span>
              </label>
              <input
                id="symbol"
                type="text"
                value={tokenConfig.symbol}
                onChange={(e) => setTokenConfig({ ...tokenConfig, symbol: e.target.value.toUpperCase() })}
                placeholder="MST"
                maxLength={10}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Decimals and Initial Supply */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="decimals" className="block text-sm font-medium text-gray-700 mb-2">
                  Decimals
                </label>
                <input
                  id="decimals"
                  type="number"
                  value={tokenConfig.decimals}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, decimals: Number(e.target.value) })}
                  min="0"
                  max="18"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="initialSupply" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Authority Configuration */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Authority Configuration</h3>
              <p className="text-sm text-gray-600">
                Leave blank to use your connected wallet as the authority.
              </p>

              <div>
                <label htmlFor="mintAuthority" className="block text-sm font-medium text-gray-700 mb-2">
                  Mint Authority
                </label>
                <input
                  id="mintAuthority"
                  type="text"
                  value={tokenConfig.mintAuthority}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, mintAuthority: e.target.value })}
                  placeholder="Leave blank for current wallet"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="freezeAuthority" className="block text-sm font-medium text-gray-700 mb-2">
                  Freeze Authority
                </label>
                <input
                  id="freezeAuthority"
                  type="text"
                  value={tokenConfig.freezeAuthority}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, freezeAuthority: e.target.value })}
                  placeholder="Leave blank for current wallet"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Deployment Summary */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-2">Deployment Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-600">Token:</span>
                  <span className="ml-2 text-purple-900 font-medium">{tokenConfig.name}</span>
                </div>
                <div>
                  <span className="text-purple-600">Symbol:</span>
                  <span className="ml-2 text-purple-900 font-medium">{tokenConfig.symbol}</span>
                </div>
                <div>
                  <span className="text-purple-600">Decimals:</span>
                  <span className="ml-2 text-purple-900 font-medium">{tokenConfig.decimals}</span>
                </div>
                <div>
                  <span className="text-purple-600">Network:</span>
                  <span className="ml-2 text-purple-900 font-medium">Solana Localnet</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
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
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-medium text-green-900 text-lg">Token Deployed Successfully!</h3>
                <p className="text-sm text-green-700 mt-1">Your token has been registered on the Solana blockchain.</p>
                <div className="mt-3 bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-600 mb-1">Transaction Hash</p>
                  <p className="text-sm font-mono text-green-800 break-all">{transactionHash}</p>
                </div>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/manage"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Token
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg text-sm font-medium hover:bg-green-50 transition-all"
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
