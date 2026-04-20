'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaConnection, useWalletBalance } from '@/hooks';

export default function ManagePage() {
  const { connected } = useWallet();
  const { shortAddress } = useSolanaConnection();
  const { balance: solBalance } = useWalletBalance();
  const [activeTab, setActiveTab] = useState<'transfer' | 'mint' | 'burn' | 'freeze' | 'agents'>('transfer');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Wallet Required</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Please connect your Solana wallet to manage tokens and execute transactions.
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                Token Management
              </h1>
            </div>
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Wallet Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Connected Wallet</p>
              <p className="font-mono text-gray-900">{shortAddress}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">SOL Balance</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {isLoading ? '...' : solBalance.toFixed(4)} SOL
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 bg-purple-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Transfer Tab */}
          {activeTab === 'transfer' && (
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Transfer Tokens</h3>
              <form onSubmit={handleTransfer} className="max-w-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000000001"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Transfer Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Mint Tab */}
          {activeTab === 'mint' && (
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Mint New Tokens</h3>
              <form onSubmit={handleMint} className="max-w-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Mint</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000000001"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Mint Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Burn Tab */}
          {activeTab === 'burn' && (
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Burn Tokens</h3>
              <form onSubmit={handleBurn} className="max-w-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Address</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Burn</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000000001"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Burn Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Freeze Tab */}
          {activeTab === 'freeze' && (
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Freeze/Unfreeze Account</h3>
              <form onSubmit={handleFreeze} className="max-w-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Address</label>
                  <input
                    type="text"
                    value={accountToFreeze}
                    onChange={(e) => setAccountToFreeze(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg font-medium hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Toggle Freeze Status'}
                </button>
              </form>
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Manage Agents</h3>
              <p className="text-gray-600 mb-6">
                Agents are authorized addresses that can perform token operations on your behalf.
              </p>
              <form onSubmit={handleAddAgent} className="max-w-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent Address</label>
                  <input
                    type="text"
                    value={agentAddress}
                    onChange={(e) => setAgentAddress(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Add Agent'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {transactionHash && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-green-800">Transaction Submitted!</p>
                <p className="text-sm text-green-600 font-mono">{transactionHash}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
