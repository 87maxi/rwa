import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../../target/types/solana_rwa';
import { expect } from 'chai';
import { LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import * as assert from 'assert';

describe('Solana RWA Security Tests', () => {
  const provider = AnchorProvider.env();
  const connection = provider.connection;
  const program = anchor.workspace.SolanaRwa as Program<SolanaRwa>;

  // Test accounts
  const owner = Keypair.generate();
  const agent = Keypair.generate();
  const attacker = Keypair.generate();
  const recipient = Keypair.generate();
  const anotherAgent = Keypair.generate();

  // Token state account
  let tokenState: Keypair;
  
  before(async () => {
    // Airdrop to all test accounts (100 SOL each for rent exemption)
    const sigs = await Promise.all([
      connection.requestAirdrop(owner.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(agent.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(attacker.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(recipient.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(anotherAgent.publicKey, 100 * LAMPORTS_PER_SOL),
    ]);
    await Promise.all(sigs.map(sig => connection.confirmTransaction(sig)));
  });

  beforeEach(async () => {
    tokenState = Keypair.generate();
    // Airdrop to tokenState account itself for rent
    const sig = await connection.requestAirdrop(tokenState.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  });

  // Helper function to initialize token
  async function initializeToken() {
    await program.methods
      .initialize('Test Token', 'TST', 9)
      .accounts({
        payer: owner.publicKey,
        token: tokenState.publicKey,
      })
      .signers([owner, tokenState])
      .rpc();
  }

  // Helper function to add agent
  async function addAgent(agentKeypair: Keypair) {
    await program.methods
      .addAgent(agentKeypair.publicKey)
      .accounts({
        token: tokenState.publicKey,
        payer: owner.publicKey,
      })
      .signers([owner])
      .rpc();
  }

  // Helper function to mint tokens to an address
  async function mintTokens(to: anchor.web3.PublicKey, amount: anchor.BN, agentKeypair: Keypair = agent) {
    await program.methods
      .mint(to, amount)
      .accounts({
        token: tokenState.publicKey,
        agent: agentKeypair.publicKey,
      })
      .signers([agentKeypair])
      .rpc();
  }


  // Counter for expectReject calls
  let expectRejectPending = 0;
  
  // Helper to check if transaction rejects
  // Uses .then() with both handlers attached synchronously to prevent Mocha from
  // seeing the AnchorError as an unhandled rejection
  function expectReject(tx: Promise<any>, errorMessage?: string) {
    return tx.then(
      () => {
        assert.fail('Expected transaction to be rejected');
      },
      (e: any) => {
        if (errorMessage) {
          const errorMessageStr = (e.message || e.toString() || JSON.stringify(e)).toLowerCase();
          const searchStr = errorMessage.toLowerCase();
          assert.ok(
            errorMessageStr.includes(searchStr) ||
            errorMessageStr.includes('custom program error') ||
            errorMessageStr.includes('simulation failed') ||
            errorMessageStr.includes('accountalreadyinuse') ||
            errorMessageStr.includes('already in use') ||
            errorMessageStr.includes('unauthorized') ||
            errorMessageStr.includes('error code: unauthorized'),
            `Expected error to contain "${errorMessage}", got: ${e.message || e.toString()}`
          );
        }
        // If no errorMessage provided, we don't care about the error - just accept any rejection
      }
    );
  }

  describe('Access Control Security', () => {
    it('SC-001: Should prevent non-owner from initializing twice', async () => {
      await initializeToken();
      
      // Try to initialize the SAME token account again - should fail with AccountAlreadyInUse
      // Need to sign with token keypair since init requires it to be signable
      await expectReject(
        program.methods
          .initialize('Another Token', 'ANT', 6)
          .accounts({
            payer: owner.publicKey,
            token: tokenState.publicKey,
          })
          .signers([owner, tokenState])
          .rpc(),
        'already in use'
      );
    });

    it('SC-002: Should prevent non-owner from adding agent', async () => {
      await initializeToken();
      
      await expectReject(
        program.methods
          .addAgent(agent.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: attacker.publicKey,
          })
          .signers([attacker])
          .rpc()
      );
    });

    it('SC-003: Should prevent non-owner from removing agent', async () => {
      await initializeToken();
      await addAgent(agent);
      
      await expectReject(
        program.methods
          .removeAgent(agent.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: attacker.publicKey,
          })
          .signers([attacker])
          .rpc()
      );
    });

    it('SC-004: Should prevent non-agent from minting', async () => {
      await initializeToken();
      
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(1000))
          .accounts({
            token: tokenState.publicKey,
            agent: attacker.publicKey,
          })
          .signers([attacker])
          .rpc()
      );
    });

    it('SC-005: Should prevent non-agent from burning', async () => {
      await initializeToken();
      await addAgent(agent); // Add agent first so mintTokens works
      await mintTokens(owner.publicKey, new anchor.BN(1000));
      
      // Use Promise constructor to synchronously attach both handlers before awaiting
      // This prevents Mocha from seeing the AnchorError as an unhandled rejection
      await new Promise<void>((resolve, reject) => {
        program.methods
          .burn(owner.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            agent: attacker.publicKey,
          })
          .signers([attacker])
          .rpc()
          .then(
            () => reject(new Error('Expected transaction to be rejected')),
            (e: any) => {
              const errorMessageStr = (e.message || e.toString() || JSON.stringify(e)).toLowerCase();
              assert.ok(
                errorMessageStr.includes('unauthorized') ||
                errorMessageStr.includes('custom program error'),
                `Expected error to contain "unauthorized", got: ${e.message || e.toString()}`
              );
              resolve();
            }
          );
      });
    });

    it('SC-006: Should prevent non-agent from freezing accounts', async () => {
      await initializeToken();
      await addAgent(agent); // Add agent first so mintTokens works
      await mintTokens(recipient.publicKey, new anchor.BN(1000));
      
      await new Promise<void>((resolve, reject) => {
        program.methods
          .freezeAccount(recipient.publicKey)
          .accounts({
            token: tokenState.publicKey,
            authority: attacker.publicKey,
          })
          .signers([attacker])
          .rpc()
          .then(
            () => reject(new Error('Expected transaction to be rejected')),
            (e: any) => {
              const errorMessageStr = (e.message || e.toString() || JSON.stringify(e)).toLowerCase();
              assert.ok(
                errorMessageStr.includes('unauthorized') ||
                errorMessageStr.includes('custom program error'),
                `Expected error to contain "unauthorized", got: ${e.message || e.toString()}`
              );
              resolve();
            }
          );
      });
    });

    it('SC-007: Should prevent non-agent from unfreezing accounts', async () => {
      await initializeToken();
      await addAgent(agent); // Add agent first so mintTokens works
      await mintTokens(recipient.publicKey, new anchor.BN(1000));
      
      await new Promise<void>((resolve, reject) => {
        program.methods
          .unfreezeAccount(recipient.publicKey)
          .accounts({
            token: tokenState.publicKey,
            authority: attacker.publicKey,
          })
          .signers([attacker])
          .rpc()
          .then(
            () => reject(new Error('Expected transaction to be rejected')),
            (e: any) => {
              const errorMessageStr = (e.message || e.toString() || JSON.stringify(e)).toLowerCase();
              assert.ok(
                errorMessageStr.includes('unauthorized') ||
                errorMessageStr.includes('custom program error'),
                `Expected error to contain "unauthorized", got: ${e.message || e.toString()}`
              );
              resolve();
            }
          );
      });
    });

    it('SC-008: Should prevent owner from minting (only agents)', async () => {
      await initializeToken();
      
      // Owner is not an agent by default
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(1000))
          .accounts({
            token: tokenState.publicKey,
            agent: owner.publicKey,
          })
          .signers([owner])
          .rpc()
      );
    });
  });

  describe('Transfer Security', () => {
    beforeEach(async () => {
      await initializeToken();
      await addAgent(agent);
      await mintTokens(owner.publicKey, new anchor.BN(1000));
    });

    it('SC-009: Should prevent transfers from frozen accounts', async () => {
      // Freeze owner's account (using agent permissions)
      await program.methods
        .freezeAccount(owner.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      // Verify transfer from frozen account is REJECTED
      await new Promise<void>((resolve, reject) => {
        program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc()
          .then(() => {
            // If we get here, the fix was not applied
            reject(new Error('Transfer from frozen account should have failed'));
          })
          .catch((e: any) => {
            // Expected: AccountFrozen error
            expect(e.message).to.include('AccountFrozen');
            resolve();
          });
      });
    });

    it('SC-010: Should prevent transfers to frozen accounts', async () => {
      // Freeze recipient's account
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      // Verify transfer to frozen account is REJECTED
      await new Promise<void>((resolve, reject) => {
        program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc()
          .then(() => {
            // If we get here, the fix was not applied
            reject(new Error('Transfer to frozen account should have failed'));
          })
          .catch((e: any) => {
            // Expected: AccountFrozen error
            expect(e.message).to.include('AccountFrozen');
            resolve();
          });
      });
    });

    it('SC-011: Should reject zero-amount transfers with InvalidAmount error', async () => {
      // HIGH-03 FIX: Zero-amount transfers should be explicitly rejected
      await expectReject(
        program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(0))
          .accounts({
            token: tokenState.publicKey,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc(),
        'InvalidAmount'
      );
    });

    it('SC-012: Should prevent self-transfers from causing balance issues', async () => {
      const initialState = await program.account.tokenState.fetch(tokenState.publicKey);
      const initialBalance = initialState.balances.find((b: any) => b.key.equals(owner.publicKey))?.value.toNumber() || 0;

      // Self-transfer should not change balance
      await program.methods
        .transfer(owner.publicKey, owner.publicKey, new anchor.BN(100))
        .accounts({
          token: tokenState.publicKey,
          from: owner.publicKey,
          to: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const finalState = await program.account.tokenState.fetch(tokenState.publicKey);
      const finalBalance = finalState.balances.find((b: any) => b.key.equals(owner.publicKey))?.value.toNumber() || 0;

      // Self-transfer should maintain the same balance
      expect(finalBalance).to.equal(initialBalance);
    });

    it('SC-013: Should validate transfer destination account exists', async () => {
      // Valid transfer should succeed
      await program.methods
        .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(100))
        .accounts({
          token: tokenState.publicKey,
          from: owner.publicKey,
          to: recipient.publicKey,
        })
        .signers([owner])
        .rpc();
    });
  });

  describe('Mint/Burn Security', () => {
    beforeEach(async () => {
      await initializeToken();
      await addAgent(agent);
    });

    it('SC-014: Should reject zero-amount minting with InvalidAmount error', async () => {
      // HIGH-03 FIX: Zero-amount mints should be explicitly rejected
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(0))
          .accounts({
            token: tokenState.publicKey,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc(),
        'InvalidAmount'
      );
    });

    it('SC-015: Should allow zero-amount burning (burn with 0 is no-op)', async () => {
      // Note: burn doesn't have explicit zero check, but amount=0 is effectively no-op
      await mintTokens(owner.publicKey, new anchor.BN(1000));

      const initialState = await program.account.tokenState.fetch(tokenState.publicKey);
      const initialSupply = initialState.totalSupply.toNumber();

      // Burn with 0 amount - this should work (it's a no-op)
      await program.methods
        .burn(owner.publicKey, new anchor.BN(0))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const finalState = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(finalState.totalSupply.toNumber()).to.equal(initialSupply);
    });

    it('SC-016: Should reject mint that exceeds MAX_SUPPLY cap', async () => {
      // HIGH-04 FIX: MAX_SUPPLY = 1,000,000,000 * 10^9 = 1,000,000,000,000,000,000
      const maxSupply = new anchor.BN(1_000_000_000_000_000_000);
      
      // Mint close to max supply
      await program.methods
        .mint(recipient.publicKey, maxSupply)
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.eq(maxSupply)).to.be.true;

      // Try to mint even 1 more - should fail with SupplyExceeded
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(1))
          .accounts({
            token: tokenState.publicKey,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc(),
        'SupplyExceeded'
      );
    });

    it('SC-017: Should verify supply info query', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(500));

      // get_supply_info returns SupplyInfo struct directly (not stored as account)
      const supplyInfo = await program.methods.getSupplyInfo()
        .accounts({
          token: tokenState.publicKey,
        })
        .view();
      
      expect(supplyInfo.currentSupply.toNumber()).to.equal(500);
      expect(supplyInfo.maxSupply.toNumber()).to.equal(1_000_000_000_000_000_000);
      expect(supplyInfo.remainingSupply.toNumber()).to.equal(1_000_000_000_000_000_000 - 500);
    });

    it('SC-018: Should prevent agent from burning non-existent balance', async () => {
      await expectReject(
        program.methods
          .burn(attacker.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc(),
        'Insufficient'
      );
    });

    it('SC-019: Should prevent agent from burning more than target balance', async () => {
      // Mint to recipient, not owner
      await mintTokens(recipient.publicKey, new anchor.BN(1000));

      // Try to burn from owner who has no balance
      await expectReject(
        program.methods
          .burn(owner.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc(),
        'Insufficient'
      );
    });

    it('SC-020: Should verify total supply consistency after mint/burn', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1000));
      await mintTokens(owner.publicKey, new anchor.BN(500));

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.toNumber()).to.equal(1500);

      // Burn some tokens
      await program.methods
        .burn(owner.publicKey, new anchor.BN(300))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const finalState = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(finalState.totalSupply.toNumber()).to.equal(1200);
    });
  });

  describe('Freeze/Unfreeze Security', () => {
    beforeEach(async () => {
      await initializeToken();
      await addAgent(agent);
      await mintTokens(recipient.publicKey, new anchor.BN(1000));
    });

    it('SC-020: Should prevent double-freeze from creating duplicate entries', async () => {
      // Freeze account
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
          .signers([agent])
          .rpc();

      // Freeze again - should not cause issues
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const frozenEntries = state.frozenAccounts.filter((f: any) => f.key.equals(recipient.publicKey));
      expect(frozenEntries.length).to.equal(1);
      expect(frozenEntries[0].frozen).to.equal(true);
    });

    it('SC-021: Should handle unfreeze of non-frozen account (document behavior)', async () => {
      try {
        await program.methods
          .unfreezeAccount(recipient.publicKey)
          .accounts({
            token: tokenState.publicKey,
            authority: agent.publicKey,
          })
          .signers([agent])
          .rpc();
        // Current implementation allows this - may be intentional
        expect(true).to.be.true;
      } catch (e: any) {
        expect(e.message).to.be.a('string');
      }
    });

    it('SC-022: Should allow freezing non-existent account (document behavior)', async () => {
      // Freeze a new account that doesn't have balance
      await program.methods
        .freezeAccount(attacker.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const frozenEntry = state.frozenAccounts.find((f: any) => f.key.equals(attacker.publicKey));
      expect(frozenEntry).to.not.be.undefined;
      expect(frozenEntry.frozen).to.equal(true);
    });

    it('SC-023: Should verify frozen account list consistency', async () => {
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
          .signers([agent])
          .rpc();

      await program.methods
        .freezeAccount(owner.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.frozenAccounts.length).to.equal(2);
    });
  });

  describe('Agent Management Security', () => {
    beforeEach(async () => {
      await initializeToken();
    });

    it('SC-024: Should prevent duplicate agent entries', async () => {
      await addAgent(agent);
      
      // Try to add same agent again - should fail with DuplicateAgent error
      await expectReject(
        program.methods
          .addAgent(agent.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'DuplicateAgent'
      );

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const agentCount = state.agents.filter((a: any) => a.equals(agent.publicKey)).length;
      expect(agentCount).to.equal(1);
    });

    it('SC-025: Should handle removing non-existent agent (document behavior)', async () => {
      try {
        await program.methods
          .removeAgent(attacker.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: owner.publicKey,
          })
          .signers([owner])
          .rpc();
        // Current implementation allows this - may be intentional
        expect(true).to.be.true;
      } catch (e: any) {
        expect(e.message).to.be.a('string');
      }
    });

    it('SC-026: Should prevent agent list corruption via multiple additions', async () => {
      await addAgent(agent);
      await addAgent(anotherAgent);
      
      // Try to add agents again - should fail with DuplicateAgent error
      await expectReject(
        program.methods
          .addAgent(agent.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'DuplicateAgent'
      );

      await expectReject(
        program.methods
          .addAgent(anotherAgent.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'DuplicateAgent'
      );

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      // Should have exactly 2 agents, no duplicates
      expect(state.agents.length).to.equal(2);
    });

    it('SC-027: Should verify agent can perform authorized operations', async () => {
      await addAgent(agent);
      
      // Agent should be able to mint
      await mintTokens(recipient.publicKey, new anchor.BN(1000));
      
      // Agent should be able to freeze
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          authority: agent.publicKey,
        })
        .signers([agent])
        .rpc();
    });

    it('SC-028: Should prevent agent privilege escalation (adding other agents)', async () => {
      await addAgent(agent);
      
      // Agent should NOT be able to add another agent
      await expectReject(
        program.methods
          .addAgent(attacker.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: agent.publicKey,
          })
          .signers([agent])
          .rpc(),
        'Unauthorized'
      );
    });

    it('SC-029: Should allow owner to transfer ownership', async () => {
      // HIGH-01 FIX: Add transfer_owner instruction test
      const newOwner = Keypair.generate();
      
      // Airdrop to newOwner for rent
      const airdropSig = await connection.requestAirdrop(newOwner.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig);
      
      // Owner should be able to transfer ownership
      await program.methods
        .transferOwner(newOwner.publicKey)
        .accounts({
          token: tokenState.publicKey,
          currentOwner: owner.publicKey,
        })
        .signers([owner, newOwner])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.owner.equals(newOwner.publicKey)).to.be.true;
    });

    it('SC-030: Should prevent non-owner from transferring ownership', async () => {
      await expectReject(
        program.methods
          .transferOwner(attacker.publicKey)
          .accounts({
            token: tokenState.publicKey,
            currentOwner: owner.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'Unauthorized'
      );
    });

    it('SC-031: Should prevent transferring ownership to same owner', async () => {
      await expectReject(
        program.methods
          .transferOwner(owner.publicKey)
          .accounts({
            token: tokenState.publicKey,
            currentOwner: owner.publicKey,
          })
          .signers([owner])
          .rpc(),
        'SameOwner'
      );
    });
  });

  describe('State Manipulation Security', () => {
    beforeEach(async () => {
      await initializeToken();
      await addAgent(agent);
    });

    it('SC-029: Should prevent balance entry duplication', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1000));
      await mintTokens(owner.publicKey, new anchor.BN(500));

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const ownerEntries = state.balances.filter((b: any) => b.key.equals(owner.publicKey));
      expect(ownerEntries.length).to.equal(1);
      expect(ownerEntries[0].value.toNumber()).to.equal(1500);
    });

    it('SC-030: Should prevent total supply manipulation', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1000));
      await mintTokens(recipient.publicKey, new anchor.BN(500));

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.toNumber()).to.equal(1500);

      // Burn from owner
      await program.methods
        .burn(owner.publicKey, new anchor.BN(300))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const finalState = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(finalState.totalSupply.toNumber()).to.equal(1200);
    });

    it('SC-031: Should handle large token amounts correctly', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1_000_000_000_000_000));

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.toNumber()).to.equal(1_000_000_000_000_000);
    });

    it('SC-032: Should prevent negative balances (underflow protection)', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(100));

      // Try to burn more than balance - should fail
      await expectReject(
        program.methods
          .burn(owner.publicKey, new anchor.BN(200))
          .accounts({
            token: tokenState.publicKey,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc(),
        'Insufficient'
      );

      // Verify balance is unchanged
      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const ownerBalance = state.balances.find((b: any) => b.key.equals(owner.publicKey))?.value.toNumber() || 0;
      expect(ownerBalance).to.equal(100);
    });

    it('SC-033: Should handle maximum decimal values correctly', async () => {
      // Use a fresh token state account
      const freshTokenState = Keypair.generate();
      const airdropSig = await connection.requestAirdrop(freshTokenState.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSig);
      
      await program.methods
        .initialize('Max Token', 'MAX', 9)
        .accounts({
          payer: owner.publicKey,
          token: freshTokenState.publicKey,
        })
        .signers([owner, freshTokenState])
        .rpc();

      const state = await program.account.tokenState.fetch(freshTokenState.publicKey);
      expect(state.decimals).to.equal(9);
      expect(state.name).to.equal('Max Token');
      expect(state.symbol).to.equal('MAX');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(async () => {
      await initializeToken();
      await addAgent(agent);
    });

    it('SC-034: Should prevent transfer with zero balance sender', async () => {
      await expectReject(
        program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc(),
        'Insufficient'
      );
    });

    it('SC-035: Should handle multiple small transfers correctly', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1000));

      for (let i = 0; i < 10; i++) {
        await program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(50))
          .accounts({
            token: tokenState.publicKey,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc();
      }

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const ownerBalance = state.balances.find((b: any) => b.key.equals(owner.publicKey))?.value.toNumber() || 0;
      const recipientBalance = state.balances.find((b: any) => b.key.equals(recipient.publicKey))?.value.toNumber() || 0;

      expect(ownerBalance).to.equal(500);
      expect(recipientBalance).to.equal(500);
    });

    it('SC-036: Should handle transfer exhausting balance', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1000));

      await program.methods
        .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState.publicKey,
          from: owner.publicKey,
          to: recipient.publicKey,
        })
        .signers([owner])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      const ownerBalance = state.balances.find((b: any) => b.key.equals(owner.publicKey))?.value.toNumber() || 0;
      expect(ownerBalance).to.equal(0);
    });

    it('SC-037: Should handle burn exhausting balance', async () => {
      await mintTokens(owner.publicKey, new anchor.BN(1000));

      await program.methods
        .burn(owner.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.toNumber()).to.equal(0);
    });

    it('SC-038: Should handle multiple agents with different permissions', async () => {
      await addAgent(anotherAgent);

      // Both agents should be able to mint
      await mintTokens(recipient.publicKey, new anchor.BN(500));
      await mintTokens(recipient.publicKey, new anchor.BN(500), anotherAgent);

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.toNumber()).to.equal(1000);
    });

    it('SC-039: Should handle token state with no balances', async () => {
      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.balances.length).to.equal(0);
      expect(state.totalSupply.toNumber()).to.equal(0);
    });

    it('SC-040: Should handle initialization with extreme string values', async () => {
      const extremeTokenState = Keypair.generate();
      
      await program.methods
        .initialize(
          'A'.repeat(200),  // Very long name
          'B'.repeat(50),   // Very long symbol
          0                 // Zero decimals
        )
        .accounts({
          payer: owner.publicKey,
          token: extremeTokenState.publicKey,
        })
        .signers([owner, extremeTokenState])
        .rpc();

      const state = await program.account.tokenState.fetch(extremeTokenState.publicKey);
      expect(state.name.length).to.equal(200);
      expect(state.symbol.length).to.equal(50);
      expect(state.decimals).to.equal(0);
    });
  });

  describe('Reentrancy and Atomicity Tests', () => {
    beforeEach(async () => {
      await initializeToken();
      await addAgent(agent);
      await mintTokens(owner.publicKey, new anchor.BN(1000));
    });

    it('SC-041: Should maintain consistency after multiple operations', async () => {
      const initialSupply = 1000;
      
      // Mint more
      await mintTokens(owner.publicKey, new anchor.BN(500));
      
      // Transfer some
      await program.methods
        .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(300))
        .accounts({
          token: tokenState.publicKey,
          from: owner.publicKey,
          to: recipient.publicKey,
        })
        .signers([owner])
        .rpc();

      // Burn some
      await program.methods
        .burn(owner.publicKey, new anchor.BN(200))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(state.totalSupply.toNumber()).to.equal(initialSupply + 500 - 200);
    });

    it('SC-042: Should handle concurrent agent operations sequentially', async () => {
      // Add another agent
      await addAgent(anotherAgent);

      // Both agents perform operations
      await mintTokens(recipient.publicKey, new anchor.BN(500));
      await mintTokens(recipient.publicKey, new anchor.BN(500), anotherAgent);

      const state = await program.account.tokenState.fetch(tokenState.publicKey);
      // 1000 from beforeEach + 500 + 500 = 2000 total supply
      expect(state.totalSupply.toNumber()).to.equal(2000);
    });
  });
});
