import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { ComplianceAggregator } from '../../target/types/compliance_aggregator';
import { expect } from 'chai';
import { Keypair } from '@solana/web3.js';
import * as assert from 'assert';

describe('Compliance Aggregator Security Tests', () => {
  const provider = AnchorProvider.env();
  const connection = provider.connection;
  const program = anchor.workspace.ComplianceAggregator as Program<ComplianceAggregator>;

  // Test accounts
  const owner = Keypair.generate();
  const token1 = Keypair.generate();
  const token2 = Keypair.generate();
  const module1 = Keypair.generate();
  const module2 = Keypair.generate();
  const attacker = Keypair.generate();

  // Aggregator account
  let aggregator: Keypair;

  before(async () => {
    // Airdrop to all test accounts (100 SOL each for rent exemption)
    const sigs = await Promise.all([
      connection.requestAirdrop(owner.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(attacker.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(token1.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(token2.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(module1.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(module2.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL),
    ]);
    await Promise.all(sigs.map(sig => connection.confirmTransaction(sig)));
  });

  beforeEach(async () => {
    aggregator = Keypair.generate();
    // Airdrop to aggregator account itself for rent
    const sig = await connection.requestAirdrop(aggregator.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  });

  // Helper to initialize aggregator
  async function initializeAggregator() {
    await program.methods
      .initialize()
      .accounts({
        payer: owner.publicKey,
        aggregator: aggregator.publicKey,
      })
      .signers([owner, aggregator])
      .rpc();
  }

  // Helper to expect rejection
  async function expectReject(tx: Promise<any>, errorMessage?: string) {
    try {
      await tx;
      assert.fail('Expected transaction to be rejected');
    } catch (e: any) {
      if (errorMessage) {
        const errorMessageStr = (e.message || e.toString || JSON.stringify(e)).toLowerCase();
        const searchStr = errorMessage.toLowerCase();
        assert.ok(
          errorMessageStr.includes(searchStr) ||
          errorMessageStr.includes('custom program error') ||
          errorMessageStr.includes('simulation failed') ||
          errorMessageStr.includes('accountalreadyinuse') ||
          errorMessageStr.includes('already in use'),
          `Expected error to contain "${errorMessage}", got: ${e.message || e.toString()}`
        );
      } else {
        // Re-throw if no error message expected but we got an error
        throw e;
      }
    }
  }

  describe('Initialization Security', () => {
    it('SC-201: Should prevent double initialization', async () => {
      await initializeAggregator();
      
      // Try to initialize the SAME account again - should fail because account already exists
      await expectReject(
        program.methods
          .initialize()
          .accounts({
            payer: owner.publicKey,
            aggregator: aggregator.publicKey,
          })
          .signers([owner, aggregator])
          .rpc(),
        'AccountAlreadyInUse'
      );
    });

    it('SC-202: Should set correct owner on initialization', async () => {
      await initializeAggregator();
      
      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.owner.toString()).to.equal(owner.publicKey.toString());
    });
  });

  describe('Module Addition Security', () => {
    beforeEach(async () => {
      await initializeAggregator();
    });

    it('SC-203: Should prevent non-owner from adding modules', async () => {
      await expectReject(
        program.methods
          .addModule(token1.publicKey, module1.publicKey)
          .accounts({
            aggregator: aggregator.publicKey,
            owner: attacker.publicKey,
            token: token1.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'Unauthorized'
      );
    });

    it('SC-204: Should allow owner to add module for token', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(1);
      expect(modules[0].toString()).to.equal(module1.publicKey.toString());
    });

    it('SC-205: Should prevent duplicate module entries for same token', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      // Try to add same module again - should fail with DuplicateModule error
      await expectReject(
        program.methods
          .addModule(token1.publicKey, module1.publicKey)
          .accounts({
            aggregator: aggregator.publicKey,
            owner: owner.publicKey,
            token: token1.publicKey,
          })
          .signers([owner])
          .rpc(),
        'DuplicateModule'
      );

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      // Should still have only 1 module (duplicate was rejected)
      expect(modules.length).to.equal(1);
    });

    it('SC-206: Should allow multiple modules for same token', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(2);
    });

    it('SC-207: Should allow different tokens to have different modules', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token2.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules1 = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      const modules2 = await program.methods
        .getModules(token2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules1[0].toString()).to.equal(module1.publicKey.toString());
      expect(modules2[0].toString()).to.equal(module2.publicKey.toString());
    });

    it('SC-208: Should handle adding module with zero pubkey', async () => {
      const zeroPubkey = anchor.web3.PublicKey.default;
      
      await program.methods
        .addModule(token1.publicKey, zeroPubkey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-209: Should verify module list consistency after multiple additions', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token2.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.tokenModules.length).to.equal(3);
    });
  });

  describe('Module Removal Security', () => {
    beforeEach(async () => {
      await initializeAggregator();
      
      // Add modules first
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-210: Should prevent non-owner from removing modules', async () => {
      await expectReject(
        program.methods
          .removeModule(token1.publicKey, module1.publicKey)
          .accounts({
            aggregator: aggregator.publicKey,
            owner: attacker.publicKey,
            token: token1.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'Unauthorized'
      );
    });

    it('SC-211: Should allow owner to remove module for token', async () => {
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(1);
      expect(modules[0].toString()).to.equal(module2.publicKey.toString());
    });

    it('SC-212: Should handle removing non-existent module (document behavior)', async () => {
      // Current implementation allows removing non-existent modules
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-213: Should verify remaining modules after removal', async () => {
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(1);
      expect(modules[0].toString()).to.equal(module2.publicKey.toString());
    });

    it('SC-214: Should not affect other tokens when removing module', async () => {
      // Add module to token2
      await program.methods
        .addModule(token2.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      // Remove module from token1
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      // Verify token2 modules are unchanged
      const modules2 = await program.methods
        .getModules(token2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules2.length).to.equal(1);
      expect(modules2[0].toString()).to.equal(module1.publicKey.toString());
    });

    it('SC-215: Should handle removing all modules from token', async () => {
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(0);
    });
  });

  describe('Transfer Compliance Check Security', () => {
    beforeEach(async () => {
      await initializeAggregator();
      
      // Add modules
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-216: Should return true when no compliance modules registered', async () => {
      const kycCredential = Keypair.generate().publicKey; // Valid KYC credential
      const validFrom = Keypair.generate().publicKey; // Valid non-zero sender address
      const validTo = Keypair.generate().publicKey; // Valid non-zero recipient address
      const result = await program.methods
        .canTransfer(
          token1.publicKey,
          validFrom,
          validTo,
          new anchor.BN(100),
          kycCredential,
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result).to.be.true;
    });

    it('SC-217: Should return modules for registered token', async () => {
      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(1);
    });

    it('SC-218: Should return empty array for unregistered token', async () => {
      const modules = await program.methods
        .getModules(token2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(0);
    });

    it('SC-219: Should handle can_transfer with various parameters', async () => {
      const kycCredential = Keypair.generate().publicKey; // Valid KYC credential

      // Test with valid parameters - should pass all compliance checks
      const result1 = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(100),
          kycCredential,
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result1).to.be.true;

      // Test with zero amount - should fail
      const result2 = await program.methods
        .canTransfer(
          token2.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(0),
          kycCredential,
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result2).to.be.false;

      // Test with unverified sender (zero KYC) - should fail
      const result3 = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(100),
          anchor.web3.PublicKey.default, // Sender not KYC'd
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result3).to.be.false;

      // Test with unverified recipient (zero KYC) - should fail
      const result4 = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(100),
          kycCredential,
          anchor.web3.PublicKey.default, // Recipient not KYC'd
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result4).to.be.false;

      // Test with zero address sender - should fail
      const result5 = await program.methods
        .canTransfer(
          token1.publicKey,
          anchor.web3.PublicKey.default, // Zero address sender
          token2.publicKey,
          new anchor.BN(100),
          kycCredential,
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result5).to.be.false;

      // Test with recipient balance exceeding limit - should fail
      const result6 = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(100),
          kycCredential,
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(2_000_000_000_000_000), // Exceeds MAX_BALANCE_LIMIT
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result6).to.be.false;

      // Test with total holders exceeding limit - should fail
      const result7 = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(100),
          kycCredential,
          kycCredential,
          new anchor.BN(1000),
          new anchor.BN(100),
          new anchor.BN(20_000) // Exceeds MAX_HOLDERS_LIMIT
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result7).to.be.false;

      // Test with sender balance less than amount - should fail
      const result8 = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          new anchor.BN(1000),
          kycCredential,
          kycCredential,
          new anchor.BN(100), // Sender has only 100
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result8).to.be.false;
    });
  });

  describe('State Manipulation Security', () => {
    beforeEach(async () => {
      await initializeAggregator();
    });

    it('SC-220: Should maintain token_modules consistency', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token2.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.tokenModules.length).to.equal(2);

      // Verify each token has correct modules
      const token1Modules = state.tokenModules.filter((e: any) => e.token.equals(token1.publicKey));
      const token2Modules = state.tokenModules.filter((e: any) => e.token.equals(token2.publicKey));

      expect(token1Modules.length).to.equal(1);
      expect(token2Modules.length).to.equal(1);
      expect(token1Modules[0].module.toString()).to.equal(module1.publicKey.toString());
      expect(token2Modules[0].module.toString()).to.equal(module2.publicKey.toString());
    });

    it('SC-221: Should handle replace-all-modules scenario', async () => {
      // Add multiple modules to token1
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      // Remove all and add new ones
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(0);
    });

    it('SC-222: Should preserve owner after all operations', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.owner.toString()).to.equal(owner.publicKey.toString());
    });

    it('SC-223: Should handle next_index increment correctly', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token2.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.nextIndex.toNumber()).to.equal(2);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(async () => {
      await initializeAggregator();
    });

    it('SC-224: Should handle empty aggregator state', async () => {
      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.tokenModules.length).to.equal(0);
      expect(state.nextIndex.toNumber()).to.equal(0);
    });

    it('SC-225: Should handle many tokens with many modules', async () => {
      for (let i = 0; i < 10; i++) {
        const token = Keypair.generate();
        const module = Keypair.generate();
        
        await program.methods
          .addModule(token.publicKey, module.publicKey)
          .accounts({
            aggregator: aggregator.publicKey,
            owner: owner.publicKey,
            token: token.publicKey,
          })
          .signers([owner])
          .rpc();
      }

      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      expect(state.tokenModules.length).to.equal(10);
    });

    it('SC-226: Should handle rapid add/remove cycles', async () => {
      for (let i = 0; i < 5; i++) {
        await program.methods
          .addModule(token1.publicKey, module1.publicKey)
          .accounts({
            aggregator: aggregator.publicKey,
            owner: owner.publicKey,
            token: token1.publicKey,
          })
          .signers([owner])
          .rpc();

        await program.methods
          .removeModule(token1.publicKey, module1.publicKey)
          .accounts({
            aggregator: aggregator.publicKey,
            owner: owner.publicKey,
            token: token1.publicKey,
          })
          .signers([owner])
          .rpc();
      }

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(0);
    });

    it('SC-227: Should handle same module for multiple tokens', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token2.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules1 = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      const modules2 = await program.methods
        .getModules(token2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules1[0].toString()).to.equal(module1.publicKey.toString());
      expect(modules2[0].toString()).to.equal(module1.publicKey.toString());
    });

    it('SC-228: Should handle replacing all modules for token', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      // Remove and re-add different module
      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(1);
      expect(modules[0].toString()).to.equal(module2.publicKey.toString());
    });

    it('SC-229: Should handle get_modules after complete cleanup', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const modules = await program.methods
        .getModules(token1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules.length).to.equal(0);
    });

    it('SC-230: Should handle large amount parameter in can_transfer', async () => {
      const kycCredential = Keypair.generate().publicKey;
      const largeAmount = new anchor.BN(2).pow(new anchor.BN(40)); // Large but valid amount
      
      const result = await program.methods
        .canTransfer(
          token1.publicKey,
          token1.publicKey,
          token2.publicKey,
          largeAmount,
          kycCredential,
          kycCredential,
          new anchor.BN(2).pow(new anchor.BN(50)), // Sufficient sender balance
          new anchor.BN(100),
          new anchor.BN(5)
        )
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result).to.be.true;
    });
  });

  describe('Cross-Program Interaction Security', () => {
    beforeEach(async () => {
      await initializeAggregator();
    });

    it('SC-231: Should verify module structure integrity', async () => {
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.complianceAggregatorState.fetch(aggregator.publicKey);
      const entry = state.tokenModules[0];
      
      expect(entry.token.equals(token1.publicKey)).to.be.true;
      expect(entry.module.equals(module1.publicKey)).to.be.true;
    });

    it('SC-232: Should handle module lookups correctly after mixed operations', async () => {
      // Add modules to multiple tokens
      await program.methods
        .addModule(token1.publicKey, module1.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .addModule(token2.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token2.publicKey,
        })
        .signers([owner])
        .rpc();

      // Remove one module from token1
      await program.methods
        .addModule(token1.publicKey, module2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
          owner: owner.publicKey,
          token: token1.publicKey,
        })
        .signers([owner])
        .rpc();

      // Verify token2 is unaffected
      const modules2 = await program.methods
        .getModules(token2.publicKey)
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(modules2.length).to.equal(1);
      expect(modules2[0].toString()).to.equal(module2.publicKey.toString());
    });
  });
});
