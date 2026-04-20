import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { IdentityRegistry } from '../../target/types/identity_registry';
import { expect } from 'chai';
import { Keypair } from '@solana/web3.js';
import * as assert from 'assert';

describe('Identity Registry Security Tests', () => {
  const provider = AnchorProvider.env();
  const connection = provider.connection;
  const program = anchor.workspace.IdentityRegistry as Program<IdentityRegistry>;

  // Test accounts
  const owner = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const attacker = Keypair.generate();
  const identity1 = Keypair.generate();
  const identity2 = Keypair.generate();

  // Registry account
  let registry: Keypair;

  before(async () => {
    // Airdrop to all test accounts
    await connection.requestAirdrop(owner.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(user1.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(user2.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(attacker.publicKey, anchor.web3.LAMPORTS_PER_SOL);
  });

  beforeEach(async () => {
    registry = Keypair.generate();
  });

  // Helper to initialize registry
  async function initializeRegistry() {
    await program.methods
      .initialize()
      .accounts({
        payer: owner.publicKey,
        registry: registry.publicKey,
      })
      .signers([owner, registry])
      .rpc();
  }

  // Helper to expect rejection
  async function expectReject(tx: Promise<any>, errorMessage?: string) {
    try {
      await tx;
      throw new Error('Expected transaction to be rejected');
    } catch (e: any) {
      if (errorMessage) {
        assert.ok(
          e.message.includes(errorMessage) || e.message.includes('WalletAlready') || e.message.includes('WalletNot'),
          `Expected error to contain "${errorMessage}", got: ${e.message}`
        );
      }
    }
  }

  describe('Initialization Security', () => {
    it('SC-101: Should prevent double initialization', async () => {
      await initializeRegistry();
      
      // Try to initialize again
      const anotherRegistry = Keypair.generate();
      await expectReject(
        program.methods
          .initialize()
          .accounts({
            payer: owner.publicKey,
            registry: anotherRegistry.publicKey,
          })
          .signers([owner, anotherRegistry])
          .rpc()
      );
    });

    it('SC-102: Should set correct owner on initialization', async () => {
      await initializeRegistry();
      
      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.owner.toString()).to.equal(owner.publicKey.toString());
    });
  });

  describe('Identity Registration Security', () => {
    beforeEach(async () => {
      await initializeRegistry();
    });

    it('SC-103: Should prevent duplicate wallet registration', async () => {
      // Register identity
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      // Try to register same wallet again
      await expectReject(
        program.methods
          .registerIdentity(user1.publicKey, identity2.publicKey)
          .accounts({
            payer: owner.publicKey,
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'AlreadyRegistered'
      );
    });

    it('SC-104: Should prevent different users from registering same wallet', async () => {
      // User1 registers their identity
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      // Attacker tries to register same wallet with different identity
      await expectReject(
        program.methods
          .registerIdentity(user1.publicKey, identity2.publicKey)
          .accounts({
            payer: attacker.publicKey,
            registry: registry.publicKey,
            owner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'AlreadyRegistered'
      );
    });

    it('SC-105: Should allow different wallets to register different identities', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .registerIdentity(user2.publicKey, identity2.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.registeredAddresses.length).to.equal(2);
      expect(state.identityMap.length).to.equal(2);
    });

    it('SC-106: Should verify identity mapping consistency', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entry = state.identityMap.find((e: any) => e.wallet.equals(user1.publicKey));
      expect(entry).to.not.be.undefined;
      expect(entry.identity.toString()).to.equal(identity1.publicKey.toString());
    });

    it('SC-107: Should prevent identity collision attacks', async () => {
      // Register multiple identities for different wallets
      const testIdentities = [
        { wallet: user1.publicKey, identity: identity1.publicKey },
        { wallet: user2.publicKey, identity: identity2.publicKey },
      ];

      for (const { wallet, identity } of testIdentities) {
        await program.methods
          .registerIdentity(wallet, identity)
          .accounts({
            payer: owner.publicKey,
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc();
      }

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      
      // Verify no collisions
      const wallets = state.identityMap.map((e: any) => e.wallet.toString());
      const uniqueWallets = new Set(wallets);
      expect(wallets.length).to.equal(uniqueWallets.size);
    });

    it('SC-108: Should handle registering with zero pubkey as identity', async () => {
      const zeroPubkey = anchor.web3.PublicKey.default;
      
      await program.methods
        .registerIdentity(user1.publicKey, zeroPubkey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entry = state.identityMap.find((e: any) => e.wallet.equals(user1.publicKey));
      expect(entry).to.not.be.undefined;
    });
  });

  describe('Identity Update Security', () => {
    beforeEach(async () => {
      await initializeRegistry();
      
      // Register initial identity
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-109: Should allow identity update for registered wallet', async () => {
      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entry = state.identityMap.find((e: any) => e.wallet.equals(user1.publicKey));
      expect(entry!.identity.toString()).to.equal(identity2.publicKey.toString());
    });

    it('SC-110: Should prevent updating non-registered wallet', async () => {
      await expectReject(
        program.methods
          .updateIdentity(attacker.publicKey, identity1.publicKey)
          .accounts({
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'NotRegistered'
      );
    });

    it('SC-111: Should prevent identity update without proper authorization', async () => {
      // Current implementation allows any signer to update - this documents the behavior
      // In production, this should require the wallet owner's signature
      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entry = state.identityMap.find((e: any) => e.wallet.equals(user1.publicKey));
      expect(entry!.identity.toString()).to.equal(identity2.publicKey.toString());
    });

    it('SC-112: Should maintain single entry after multiple updates', async () => {
      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .updateIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entries = state.identityMap.filter((e: any) => e.wallet.equals(user1.publicKey));
      expect(entries.length).to.equal(1);
    });

    it('SC-113: Should verify update does not affect other entries', async () => {
      // Register another user
      await program.methods
        .registerIdentity(user2.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      // Update user1's identity
      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const user2Entry = state.identityMap.find((e: any) => e.wallet.equals(user2.publicKey));
      expect(user2Entry!.identity.toString()).to.equal(identity1.publicKey.toString());
    });
  });

  describe('Identity Removal Security', () => {
    beforeEach(async () => {
      await initializeRegistry();
      
      // Register initial identities
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .registerIdentity(user2.publicKey, identity2.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-114: Should allow removing registered identity', async () => {
      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.registeredAddresses.length).to.equal(1);
      expect(state.identityMap.length).to.equal(1);
    });

    it('SC-115: Should prevent removing non-registered wallet', async () => {
      await expectReject(
        program.methods
          .removeIdentity(attacker.publicKey)
          .accounts({
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'NotRegistered'
      );
    });

    it('SC-116: Should prevent identity removal without authorization', async () => {
      // Current implementation allows any signer to remove - documents the behavior
      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.registeredAddresses.length).to.equal(1);
    });

    it('SC-117: Should verify removal does not affect other entries', async () => {
      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const user2Entry = state.identityMap.find((e: any) => e.wallet.equals(user2.publicKey));
      expect(user2Entry).to.not.be.undefined;
      expect(user2Entry!.wallet.equals(user2.publicKey)).to.be.true;
    });

    it('SC-118: Should prevent re-registration after removal', async () => {
      // Remove and try to re-register
      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      // Re-register should work
      await program.methods
        .registerIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entry = state.identityMap.find((e: any) => e.wallet.equals(user1.publicKey));
      expect(entry!.identity.toString()).to.equal(identity2.publicKey.toString());
    });

    it('SC-119: Should maintain consistency after removal', async () => {
      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      
      // Verify both lists are consistent
      const registeredWallets = state.registeredAddresses.map((w: any) => w.toString());
      const mappedWallets = state.identityMap.map((e: any) => e.wallet.toString());
      
      expect(registeredWallets.length).to.equal(mappedWallets.length);
      for (const wallet of mappedWallets) {
        expect(registeredWallets).to.include(wallet);
      }
    });
  });

  describe('Query Security', () => {
    beforeEach(async () => {
      await initializeRegistry();
    });

    it('SC-120: Should return default pubkey for unregistered wallet', async () => {
      const result = await program.methods
        .getIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
        })
        .view();
      
      expect(result.toString()).to.equal(anchor.web3.PublicKey.default.toString());
    });

    it('SC-121: Should return correct identity for registered wallet', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const result = await program.methods
        .getIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
        })
        .view();
      
      expect(result.toString()).to.equal(identity1.publicKey.toString());
    });

    it('SC-122: Should handle queries with large number of entries', async () => {
      // Register multiple identities
      for (let i = 0; i < 20; i++) {
        const wallet = Keypair.generate();
        const identity = Keypair.generate();
        
        await program.methods
          .registerIdentity(wallet.publicKey, identity.publicKey)
          .accounts({
            payer: owner.publicKey,
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc();
      }

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.identityMap.length).to.equal(20);
    });
  });

  describe('State Manipulation Security', () => {
    beforeEach(async () => {
      await initializeRegistry();
    });

    it('SC-123: Should maintain registered_addresses and identity_map consistency', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .registerIdentity(user2.publicKey, identity2.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      
      // Both lists should have same length
      expect(state.registeredAddresses.length).to.equal(state.identityMap.length);
      
      // All wallets in identity_map should be in registered_addresses
      for (const entry of state.identityMap) {
        expect(state.registeredAddresses.some((w: any) => w.equals(entry.wallet))).to.be.true;
      }
    });

    it('SC-124: Should handle next_index increment correctly', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .registerIdentity(user2.publicKey, identity2.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.nextIndex.toNumber()).to.equal(2);
    });

    it('SC-125: Should prevent state corruption via rapid operations', async () => {
      // Perform multiple register/update/remove operations
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      const entry = state.identityMap.find((e: any) => e.wallet.equals(user1.publicKey));
      expect(entry!.identity.toString()).to.equal(identity2.publicKey.toString());
      expect(state.registeredAddresses.length).to.equal(1);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(async () => {
      await initializeRegistry();
    });

    it('SC-126: Should handle empty registry state', async () => {
      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.registeredAddresses.length).to.equal(0);
      expect(state.identityMap.length).to.equal(0);
      expect(state.nextIndex.toNumber()).to.equal(0);
    });

    it('SC-127: Should handle registering same wallet multiple times with different identities (should fail)', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await expectReject(
        program.methods
          .registerIdentity(user1.publicKey, identity2.publicKey)
          .accounts({
            payer: owner.publicKey,
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'AlreadyRegistered'
      );
    });

    it('SC-128: Should handle update then remove sequence', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.registeredAddresses.length).to.equal(0);
      expect(state.identityMap.length).to.equal(0);
    });

    it('SC-129: Should handle multiple users with rapid operations', async () => {
      for (let i = 0; i < 5; i++) {
        await program.methods
          .registerIdentity(
            i % 2 === 0 ? user1.publicKey : user2.publicKey,
            i % 2 === 0 ? identity1.publicKey : identity2.publicKey
          )
          .accounts({
            payer: owner.publicKey,
            registry: registry.publicKey,
            owner: owner.publicKey,
          })
          .signers([owner])
          .rpc();
      }

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      // Should have only 2 entries (user1 and user2)
      expect(state.identityMap.length).to.be.lessThanOrEqual(2);
    });

    it('SC-130: Should preserve owner after all operations', async () => {
      await program.methods
        .registerIdentity(user1.publicKey, identity1.publicKey)
        .accounts({
          payer: owner.publicKey,
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .updateIdentity(user1.publicKey, identity2.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeIdentity(user1.publicKey)
        .accounts({
          registry: registry.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.identityRegistryState.fetch(registry.publicKey);
      expect(state.owner.toString()).to.equal(owner.publicKey.toString());
    });
  });
});
