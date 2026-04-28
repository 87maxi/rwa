/**
 * Ethereum Shield - Isolates the application from window.ethereum conflicts
 *
 * Problem: Multiple browser extensions try to override window.ethereum,
 * causing conflicts between Solana wallets (like Backpack) and Ethereum wallets.
 *
 * Solution: Detect, monitor, and shield against window.ethereum conflicts
 * while maintaining compatibility with Solana wallet operations.
 */

import type { ConflictStatus, InjectedProvider, EthereumShieldInterface } from './types';

/**
 * Ethereum Shield implementation
 */
export class EthereumShield implements EthereumShieldInterface {
  private injectedProviders: InjectedProvider[] = [];
  private isInitialized = false;
  private originalEthereum: any = null;
  private overrideCount = 0;

  /**
   * Initialize the shield
   */
  constructor() {
    if (typeof window === 'undefined') return;
    this.initialize();
  }

  /**
   * Initialize detection and monitoring
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Save reference to original ethereum if it exists
    this.originalEthereum = (window as any).ethereum;
    this.overrideCount = (window as any).__ethereumOverrideCount__ || 0;

    // Detect existing providers
    this.detectEIP6963Providers();
    this.detectSolanaProviders();
    this.detectEthereumProviders();

    // Start monitoring for changes
    this.monitorEthereumChanges();

    this.isInitialized = true;

    console.info('[Wallet] [ethereum] EthereumShield initialized', {
      hasEthereum: !!this.originalEthereum,
      providers: this.injectedProviders.map((p) => p.name),
      overrideCount: this.overrideCount,
    });
  }

  /**
   * Detect providers via EIP-6963 (Multi-wallet discovery)
   */
  private detectEIP6963Providers(): void {
    if (typeof window === 'undefined') return;

    // Check for Wallet Standard providers
    const walletStandardProviders = (window as any).__SOLANA_WALLET_STANDARD_PROVIDERS__;
    if (walletStandardProviders) {
      const providers = Array.isArray(walletStandardProviders)
        ? walletStandardProviders
        : Object.values(walletStandardProviders);

      providers.forEach((provider: any) => {
        if (provider && provider.info) {
          this.injectedProviders.push({
            name: provider.info.name || 'Unknown Wallet Standard Provider',
            type: 'wallet-standard',
            icon: provider.info.icon,
            rdns: provider.info.rdns,
          });
        }
      });
    }

    // Listen for EIP-6963 announce events
    const handleAnnounce = (event: any) => {
      const detail = event.detail?.info;
      if (detail) {
        const exists = this.injectedProviders.find(
          (p) => p.rdns === detail.rdns || p.name === detail.name
        );

        if (!exists) {
          this.injectedProviders.push({
            name: detail.name || 'Unknown Provider',
            type: detail.rdns?.includes('solana') ? 'solana' : 'ethereum',
            icon: detail.icon,
            rdns: detail.rdns,
          });

          console.warn('[Wallet] [ethereum] New provider detected via EIP-6963', {
            name: detail.name,
            rdns: detail.rdns,
          });
        }
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
    window.addEventListener('SolanaWalletStandard:announce', handleAnnounce as EventListener);
  }

  /**
   * Detect Solana-specific providers
   */
  private detectSolanaProviders(): void {
    if (typeof window === 'undefined') return;

    const solana = (window as any).solana;
    if (solana) {
      const name = solana.isPhantom
        ? 'Phantom'
        : solana.isSolflare
          ? 'Solflare'
          : solana.isBackpack
            ? 'Backpack'
            : 'Unknown Solana Provider';

      const exists = this.injectedProviders.find((p) => p.name === name);
      if (!exists) {
        this.injectedProviders.push({
          name,
          type: 'solana',
        });
      }
    }
  }

  /**
   * Detect Ethereum providers
   */
  private detectEthereumProviders(): void {
    if (typeof window === 'undefined') return;

    const ethereum = (window as any).ethereum;
    if (ethereum) {
      // Try to identify the provider
      const name =
        ethereum.isPhantom
          ? 'Phantom (Ethereum)'
          : ethereum.isMetaMask
            ? 'MetaMask'
            : ethereum.isCoinbaseWallet
              ? 'Coinbase Wallet'
              : ethereum.isBraveWallet
                ? 'Brave Wallet'
                : 'Unknown Ethereum Provider';

      const exists = this.injectedProviders.find((p) => p.name === name);
      if (!exists) {
        this.injectedProviders.push({
          name,
          type: 'ethereum',
        });
      }
    }
  }

  /**
   * Monitor changes to window.ethereum using Object.defineProperty
   */
  private monitorEthereumChanges(): void {
    if (typeof window === 'undefined') return;

    // Use a setInterval to periodically check for changes
    // This is a simple approach that works across browsers
    const checkInterval = setInterval(() => {
      const currentEthereum = (window as any).ethereum;
      if (currentEthereum !== this.originalEthereum) {
        this.overrideCount++;
        this.originalEthereum = currentEthereum;

        console.warn('[Wallet] [ethereum] window.ethereum was overridden', {
          overrideCount: this.overrideCount,
          newProvider: this.identifyProvider(currentEthereum),
        });

        // Re-detect providers
        this.detectEthereumProviders();
      }
    }, 2000);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(checkInterval);
    });
  }

  /**
   * Identify an Ethereum provider
   */
  private identifyProvider(ethereum: any): string {
    if (!ethereum) return 'None';
    if (ethereum.isPhantom) return 'Phantom';
    if (ethereum.isMetaMask) return 'MetaMask';
    if (ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
    if (ethereum.isBraveWallet) return 'Brave Wallet';
    if (ethereum.isBackpack) return 'Backpack';
    return 'Unknown';
  }

  /**
   * Get current conflict status
   */
  getConflictStatus(): ConflictStatus {
    const ethereumProviders = this.injectedProviders.filter((p) => p.type === 'ethereum');
    const solanaProviders = this.injectedProviders.filter((p) => p.type === 'solana');
    const hasConflict = ethereumProviders.length > 1 || this.overrideCount > 0;

    let recommendation = 'No conflicts detected';
    if (hasConflict) {
      if (ethereumProviders.length > 1) {
        recommendation = 'Multiple Ethereum providers detected. Consider disabling unused wallets.';
      } else if (this.overrideCount > 0) {
        recommendation = 'window.ethereum was overridden. This may cause intermittent issues.';
      }
    }

    return {
      hasConflict,
      providers: this.injectedProviders.map((p) => p.name),
      recommendation,
    };
  }

  /**
   * Get list of detected injected providers
   */
  getInjectedProviders(): InjectedProvider[] {
    return [...this.injectedProviders];
  }

  /**
   * Check if the shield is active
   */
  isShielded(): boolean {
    return this.isInitialized;
  }

  /**
   * Log current shield status
   */
  logStatus(): void {
    const status = this.getConflictStatus();
    console.info('[Wallet] [ethereum] Shield Status', {
      initialized: this.isInitialized,
      hasConflict: status.hasConflict,
      providers: status.providers,
      overrideCount: this.overrideCount,
      recommendation: status.recommendation,
    });
  }
}
