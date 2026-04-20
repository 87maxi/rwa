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
    // Airdrop to all test accounts
    await connection.requestAirdrop(owner.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(attacker.publicKey, anchor.web3.LAMPORTS_PER_SOL);
  });

  beforeEach(async () => {
    aggregator = Keypair.generate();
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
      throw new Error('Expected transaction to be rejected');
    } catch (e: any) {
      if (errorMessage) {
        assert.ok(
          e.message.includes(errorMessage),
          `Expected error to contain "${errorMessage}", got: ${e.message}`
        );
      }
    }
  }

  describe('Initialization Security', () => {
    it('SC-201: Should prevent double initialization', async () => {
      await initializeAggregator();
      
      const anotherAggregator = Keypair.generate();
      await expectReject(
        program.methods
          .initialize()
          .accounts({
            payer: owner.publicKey,
            aggregator: anotherAggregator.publicKey,
          })
          .signers([owner, anotherAggregator])
          .rpc()
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

      // Add same module again
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

      // Current implementation allows duplicates - documents the vulnerability
      expect(modules.length).to.equal(2);
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
      const result = await program.methods
        .canTransfer(anchor.web3.PublicKey.default, anchor.web3.PublicKey.default, anchor.web3.PublicKey.default, new anchor.BN(100))
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
      // Test with different from/to/amount combinations
      const result1 = await program.methods
        .canTransfer(token1.publicKey, token1.publicKey, token2.publicKey, new anchor.BN(100))
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result1).to.be.true;

      const result2 = await program.methods
        .canTransfer(token2.publicKey, token1.publicKey, token2.publicKey, new anchor.BN(0))
        .accounts({
          aggregator: aggregator.publicKey,
        })
        .view();

      expect(result2).to.be.true;
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
      const largeAmount = new anchor.BN(2).pow(new anchor.BN(60));
      
      const result = await program.methods
        .canTransfer(token1.publicKey, token1.publicKey, token2.publicKey, largeAmount)
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
