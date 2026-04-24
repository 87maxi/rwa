'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkStatus } from '@/components/NetworkStatus';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolanaConnection, useWalletBalance } from '@/hooks';
import { ClientOnly } from '@/components/ClientOnly';
import { useTokenActions, type SupplyInfo, type AggregatorState, type IdentityInfo } from '@/hooks/useTokenActions';
import { useSolanaNotification } from '@/hooks';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS, getCurrentNetwork } from '@/config/solana';

export default function ManagePage() {
  const { connected, publicKey } = useWallet();
  const { shortAddress } = useSolanaConnection();
  const { balance: solBalance } = useWalletBalance();
  const [activeTab, setActiveTab] = useState<'transfer' | 'mint' | 'burn' | 'freeze' | 'agents' | 'transferOwner' | 'transferFreeze' | 'supplyInfo' | 'compliance' | 'identity'>('transfer');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [accountToFreeze, setAccountToFreeze] = useState('');
  
  // New form states for additional operations
  const [newOwner, setNewOwner] = useState('');
  const [newFreezeAuthority, setNewFreezeAuthority] = useState('');
  const [aggregatorAccount, setAggregatorAccount] = useState('');
  const [tokenProgramId, setTokenProgramId] = useState('');
  const [moduleProgramId, setModuleProgramId] = useState('');
  const [registryAccount, setRegistryAccount] = useState('');
  const [identityData, setIdentityData] = useState('');
  const [identityName, setIdentityName] = useState('');
  const [identitySymbol, setIdentitySymbol] = useState('');
  const [metadataUri, setMetadataUri] = useState('');
  
  // Display states for read-only info
  const [supplyInfo, setSupplyInfo] = useState<SupplyInfo | null>(null);
  const [aggregatorState, setAggregatorState] = useState<AggregatorState | null>(null);
  const [identityInfo, setIdentityInfo] = useState<IdentityInfo | null>(null);

  // Derive PDA for the token state account from the owner wallet
  // The token state is a PDA seeded with: [owner_wallet_bytes]
  const tokenStatePda = useMemo(() => {
    if (!publicKey) return null;
    
    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.solanaRwa;
      if (!programIdStr) return null;
      
      const programId = new PublicKey(programIdStr);
      // Derive PDA from owner wallet and program ID
      const [derivedPda] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer()],
        programId
      );
      
      return derivedPda.toString();
    } catch {
      return null;
    }
  }, [publicKey]);
  
  const tokenActions = useTokenActions(tokenStatePda);
  
  // Notification system
  const { success, error: showError } = useSolanaNotification();

  const handleTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.transferTokens(publicKey.toString(), recipient, parseFloat(amount) * Math.pow(10, 9));
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setRecipient('');
        setAmount('');
        success(`Transfer successful! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, recipient, amount, tokenActions, success, showError]);

  const handleMint = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.mintTokens(recipient, parseFloat(amount) * Math.pow(10, 9));
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setRecipient('');
        setAmount('');
        success(`Mint successful! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, recipient, amount, tokenActions, success, showError]);

  const handleBurn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.burnTokens(publicKey.toString(), parseFloat(amount) * Math.pow(10, 9));
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setRecipient('');
        setAmount('');
        success(`Burn successful! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, amount, tokenActions, success, showError]);

  const handleFreeze = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.freezeAccount(accountToFreeze);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setAccountToFreeze('');
        success(`Freeze status toggled! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, accountToFreeze, tokenActions, success, showError]);

  const handleAddAgent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.addAgent(agentAddress);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setAgentAddress('');
        success(`Agent added! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, agentAddress, tokenActions, success, showError]);

  const handleTransferOwner = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.transferOwner(newOwner);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setNewOwner('');
        success(`Owner transferred! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, newOwner, tokenActions, success, showError]);

  const handleTransferFreezeAuthority = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.transferFreezeAuthority(newFreezeAuthority);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setNewFreezeAuthority('');
        success(`Freeze authority transferred! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, newFreezeAuthority, tokenActions, success, showError]);

  const handleGetSupplyInfo = useCallback(async () => {
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const info = await tokenActions.getSupplyInfo();
      setSupplyInfo(info);
      if (info) {
        success(`Supply info loaded: ${info.currentSupply.toString()} current supply`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch supply info';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, tokenActions, success, showError]);

  const handleInitializeCompliance = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.initializeComplianceAggregator(aggregatorAccount);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setAggregatorAccount('');
        success(`Compliance aggregator initialized! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, aggregatorAccount, tokenActions, success, showError]);

  const handleAddComplianceModule = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.addComplianceModule(aggregatorAccount, tokenProgramId, moduleProgramId);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setModuleProgramId('');
        success(`Compliance module added! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, aggregatorAccount, tokenProgramId, moduleProgramId, tokenActions, success, showError]);

  const handleGetAggregatorState = useCallback(async () => {
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const state = await tokenActions.getAggregatorState(aggregatorAccount);
      setAggregatorState(state);
      if (state) {
        success(`Aggregator state loaded: ${state.totalUniqueTokens} tokens`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch aggregator state';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, aggregatorAccount, tokenActions, success, showError]);

  const handleInitializeIdentity = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.initializeIdentityRegistry(registryAccount);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setRegistryAccount('');
        success(`Identity registry initialized! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, registryAccount, tokenActions, success, showError]);

  const handleRegisterIdentity = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.registerIdentity(registryAccount, publicKey.toString(), identityData);
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setIdentityData('');
        success(`Identity registered! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, registryAccount, identityData, tokenActions, success, showError]);

  const handleRegisterIdentityWithData = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);
    setTransactionHash(null);

    try {
      const result = await tokenActions.registerIdentityWithData(
        registryAccount,
        publicKey.toString(),
        identityName,
        identitySymbol,
        identityData,
        metadataUri
      );
      if (result.success && result.signature) {
        setTransactionHash(result.signature);
        setIdentityName('');
        setIdentitySymbol('');
        setIdentityData('');
        setMetadataUri('');
        success(`Identity with metadata registered! Signature: ${result.signature.slice(0, 16)}...`);
      } else if (result.error) {
        setErrorMessage(result.error);
        showError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, registryAccount, identityName, identitySymbol, identityData, metadataUri, tokenActions, success, showError]);

  const handleGetIdentity = useCallback(async () => {
    if (!connected || !publicKey) return;
    
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const info = await tokenActions.getIdentity(registryAccount, publicKey.toString());
      setIdentityInfo(info);
      if (info) {
        success(`Identity found: ${info.identity}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch identity';
      setErrorMessage(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, registryAccount, tokenActions, success, showError]);

  const tabs = [
    { id: 'transfer' as const, label: 'Transfer', icon: 'M7 17L17 7M17 7H7M17 7V17' },
    { id: 'mint' as const, label: 'Mint Tokens', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
    { id: 'burn' as const, label: 'Burn Tokens', icon: 'M19 7l-1 14H6L5 7M5 7h14M5 7l2-3h10l2 3' },
    { id: 'freeze' as const, label: 'Freeze Account', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'agents' as const, label: 'Agents', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'transferOwner' as const, label: 'Transfer Owner', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 'transferFreeze' as const, label: 'Transfer Freeze Auth', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 'supplyInfo' as const, label: 'Supply Info', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'compliance' as const, label: 'Compliance', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'identity' as const, label: 'Identity', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Wallet Info */}
        <div className="glass-card p-8 mb-12 animate-fadeInUp">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm text-foreground-tertiary mb-1">Connected Wallet</p>
              <p className="font-mono text-foreground text-lg">{connected ? shortAddress : 'Connecting...'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-foreground-tertiary mb-1">SOL Balance</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {isLoading ? '...' : (connected ? solBalance.toFixed(4) : '0.0000')} SOL
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-error/10 border border-error/20 rounded-2xl p-6 mb-12 animate-fadeInUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-error/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm8-8a2 2 0 10-4 0 2 2 0 004 0zM7.93 15.07l1.41-1.41A7 7 0 0010 14c-3.03 0-5.66-1.94-6.72-4.72l-1.41 1.41A9 9 0 0110 16a9 9 0 01-6.07-2.93zM12 7.93l-1.41 1.41A7 7 0 0010 6c3.03 0 5.66 1.94 6.72 4.72l1.41-1.41A9 9 0 0110 4a9 9 0 01-6.07 2.93l1.41 1.41A7 7 0 0112 7.93z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-error-light">Transaction Failed</p>
                <p className="text-sm text-error-light/80 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

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

          {/* Transfer Owner Tab */}
          {activeTab === 'transferOwner' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Transfer Token Ownership</h3>
              <p className="text-foreground-tertiary mb-8">Transfer the token program ownership to a new address.</p>
              <form onSubmit={handleTransferOwner} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">New Owner Address</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold shadow-glow hover:shadow-glow-secondary min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Transfer Ownership'}
                </button>
              </form>
            </div>
          )}

          {/* Transfer Freeze Authority Tab */}
          {activeTab === 'transferFreeze' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Transfer Freeze Authority</h3>
              <p className="text-foreground-tertiary mb-8">Transfer the freeze authority to a new address.</p>
              <form onSubmit={handleTransferFreezeAuthority} className="max-w-lg space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-2">New Freeze Authority Address</label>
                  <input
                    type="text"
                    value={newFreezeAuthority}
                    onChange={(e) => setNewFreezeAuthority(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-warning focus:border-transparent transition-all hover:border-warning/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-4 btn-primary bg-gradient-to-r from-warning to-primary text-white rounded-xl font-semibold min-h-[56px]"
                >
                  {isLoading ? 'Processing...' : 'Transfer Freeze Authority'}
                </button>
              </form>
            </div>
          )}

          {/* Supply Info Tab */}
          {activeTab === 'supplyInfo' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Supply Information</h3>
              <p className="text-foreground-tertiary mb-8">View current token supply details.</p>
              <div className="flex gap-4 mb-8">
                <button
                  onClick={handleGetSupplyInfo}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold shadow-glow hover:shadow-glow-secondary min-h-[48px]"
                >
                  {isLoading ? 'Loading...' : 'Fetch Supply Info'}
                </button>
              </div>
              {supplyInfo && (
                <div className="glass-card p-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">Current Supply</p>
                      <p className="text-2xl font-bold text-foreground">{supplyInfo.currentSupply.toString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">Max Supply</p>
                      <p className="text-2xl font-bold text-foreground">{supplyInfo.maxSupply.toString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">Remaining Supply</p>
                      <p className="text-2xl font-bold text-success">{supplyInfo.remainingSupply.toString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Compliance Management</h3>
              <p className="text-foreground-tertiary mb-8">Manage compliance modules for your token.</p>
              
              {/* Initialize Aggregator */}
              <div className="glass-card p-6 mb-8">
                <h4 className="text-xl font-bold text-foreground mb-4">Initialize Compliance Aggregator</h4>
                <form onSubmit={handleInitializeCompliance} className="max-w-lg space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Aggregator Account</label>
                    <input
                      type="text"
                      value={aggregatorAccount}
                      onChange={(e) => setAggregatorAccount(e.target.value)}
                      placeholder="Enter aggregator PDA address"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Processing...' : 'Initialize'}
                  </button>
                </form>
              </div>

              {/* Add Module */}
              <div className="glass-card p-6 mb-8">
                <h4 className="text-xl font-bold text-foreground mb-4">Add Compliance Module</h4>
                <form onSubmit={handleAddComplianceModule} className="max-w-lg space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Aggregator Account</label>
                    <input
                      type="text"
                      value={aggregatorAccount}
                      onChange={(e) => setAggregatorAccount(e.target.value)}
                      placeholder="Enter aggregator PDA address"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Token Program ID</label>
                    <input
                      type="text"
                      value={tokenProgramId}
                      onChange={(e) => setTokenProgramId(e.target.value)}
                      placeholder="Enter token program address"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Module Program ID</label>
                    <input
                      type="text"
                      value={moduleProgramId}
                      onChange={(e) => setModuleProgramId(e.target.value)}
                      placeholder="Enter module program address"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-success focus:border-transparent transition-all hover:border-success/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-success to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Processing...' : 'Add Module'}
                  </button>
                </form>
              </div>

              {/* Get Aggregator State */}
              <div className="glass-card p-6">
                <h4 className="text-xl font-bold text-foreground mb-4">Aggregator State</h4>
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    value={aggregatorAccount}
                    onChange={(e) => setAggregatorAccount(e.target.value)}
                    placeholder="Enter aggregator PDA address"
                    className="flex-1 px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                  />
                  <button
                    onClick={handleGetAggregatorState}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Loading...' : 'Fetch State'}
                  </button>
                </div>
                {aggregatorState && (
                  <div className="glass-card p-4 bg-background/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-foreground-tertiary mb-1">Owner</p>
                        <p className="text-sm font-mono text-foreground">{aggregatorState.owner}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground-tertiary mb-1">Total Unique Tokens</p>
                        <p className="text-lg font-bold text-foreground">{aggregatorState.totalUniqueTokens}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground-tertiary mb-1">Total Module Entries</p>
                        <p className="text-lg font-bold text-foreground">{aggregatorState.totalModuleEntries}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground-tertiary mb-1">Token Module Count</p>
                        <p className="text-lg font-bold text-foreground">{aggregatorState.tokenModuleCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Identity Tab */}
          {activeTab === 'identity' && (
            <div className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Identity Management</h3>
              <p className="text-foreground-tertiary mb-8">Manage identity registrations on the blockchain.</p>
              
              {/* Initialize Registry */}
              <div className="glass-card p-6 mb-8">
                <h4 className="text-xl font-bold text-foreground mb-4">Initialize Identity Registry</h4>
                <form onSubmit={handleInitializeIdentity} className="max-w-lg space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Registry Account</label>
                    <input
                      type="text"
                      value={registryAccount}
                      onChange={(e) => setRegistryAccount(e.target.value)}
                      placeholder="Enter registry PDA address"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Processing...' : 'Initialize Registry'}
                  </button>
                </form>
              </div>

              {/* Register Identity */}
              <div className="glass-card p-6 mb-8">
                <h4 className="text-xl font-bold text-foreground mb-4">Register Identity</h4>
                <form onSubmit={handleRegisterIdentity} className="max-w-lg space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Registry Account</label>
                    <input
                      type="text"
                      value={registryAccount}
                      onChange={(e) => setRegistryAccount(e.target.value)}
                      placeholder="Enter registry PDA address"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Identity String</label>
                    <input
                      type="text"
                      value={identityData}
                      onChange={(e) => setIdentityData(e.target.value)}
                      placeholder="Enter identity string"
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-success focus:border-transparent transition-all hover:border-success/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-success to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Processing...' : 'Register Identity'}
                  </button>
                </form>
              </div>

              {/* Register Identity with Data */}
              <div className="glass-card p-6 mb-8">
                <h4 className="text-xl font-bold text-foreground mb-4">Register Identity with Metadata</h4>
                <form onSubmit={handleRegisterIdentityWithData} className="max-w-2xl space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground-secondary mb-2">Name (max 32 chars)</label>
                      <input
                        type="text"
                        value={identityName}
                        onChange={(e) => setIdentityName(e.target.value)}
                        placeholder="Entity name"
                        maxLength={32}
                        className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground-secondary mb-2">Symbol (max 10 chars)</label>
                      <input
                        type="text"
                        value={identitySymbol}
                        onChange={(e) => setIdentitySymbol(e.target.value)}
                        placeholder="Symbol"
                        maxLength={10}
                        className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Identity Data (max 128 chars)</label>
                    <input
                      type="text"
                      value={identityData}
                      onChange={(e) => setIdentityData(e.target.value)}
                      placeholder="Identity data"
                      maxLength={128}
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">Metadata URI (max 256 chars)</label>
                    <input
                      type="text"
                      value={metadataUri}
                      onChange={(e) => setMetadataUri(e.target.value)}
                      placeholder="https://..."
                      maxLength={256}
                      className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Processing...' : 'Register with Data'}
                  </button>
                </form>
              </div>

              {/* Get Identity */}
              <div className="glass-card p-6">
                <h4 className="text-xl font-bold text-foreground mb-4">Lookup Identity</h4>
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    value={registryAccount}
                    onChange={(e) => setRegistryAccount(e.target.value)}
                    placeholder="Enter registry PDA address"
                    className="flex-1 px-4 py-3 rounded-xl bg-background-secondary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                  />
                  <button
                    onClick={handleGetIdentity}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold min-h-[48px]"
                  >
                    {isLoading ? 'Loading...' : 'Lookup Identity'}
                  </button>
                </div>
                {identityInfo && (
                  <div className="glass-card p-4 bg-background/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-foreground-tertiary mb-1">Wallet</p>
                        <p className="text-sm font-mono text-foreground">{identityInfo.wallet}</p>
                      </div>
                      <div>
                        <p className="text-sm text-foreground-tertiary mb-1">Identity</p>
                        <p className="text-sm font-mono text-foreground">{identityInfo.identity}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
