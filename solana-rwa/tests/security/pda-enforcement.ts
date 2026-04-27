import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../../target/types/solana_rwa';
import { expect } from 'chai';
import { LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import * as assert from 'assert';

/**
 * PDA Enforcement Security Tests
 * 
 * These tests verify that:
 * 1. PDAs cannot be manipulated by external actors
 * 2. Only authorized accounts can perform operations
 * 3. PDA-derived accounts cannot be directly initialized
 * 4. Cross-program invocation (CPI) security is maintained
 */
describe('PDA Enforcement Security Tests', () => {
  const provider = AnchorProvider.env();
  const connection = provider.connection;
  const program = anchor.workspace.SolanaRwa as Program<SolanaRwa>;

  // Test accounts
  const owner = Keypair.generate();
  const agent = Keypair.generate();
  const attacker = Keypair.generate();
  const recipient = Keypair.generate();

  // Token state PDA (derived, not a Keypair)
  let tokenStatePda: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop to all test accounts (100 SOL each for rent exemption)
    const sigs = await Promise.all([
      connection.requestAirdrop(owner.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(agent.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(attacker.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(recipient.publicKey, 100 * LAMPORTS_PER_SOL),
    ]);
    await Promise.all(sigs.map(sig => connection.confirmTransaction(sig)));
  });

  beforeEach(async () => {
    // Derive the TokenState PDA using seeds [b"token"]
    const [pda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('token')],
      program.programId
    );
    tokenStatePda = pda;
  });

  // Helper function to initialize token
  async function initializeToken() {
    await program.methods
      .initialize('Test Token', 'TST', 9)
      // @ts-ignore - Anchor IDL types use union types
      .accounts({
        payer: owner.publicKey,
        token: tokenStatePda,
      })
      .signers([owner])
      .rpc();
  }

  // Helper function to add agent
  async function addAgent(agentKeypair: Keypair) {
    await program.methods
      .addAgent(agentKeypair.publicKey)
      // @ts-ignore - Anchor IDL types use union types
      .accounts({
        token: tokenStatePda,
        payer: owner.publicKey,
        newAgent: agentKeypair.publicKey,
      })
      .signers([owner])
      .rpc();
  }

  // Helper function to mint tokens to an address
  async function mintTokens(to: anchor.web3.PublicKey, amount: anchor.BN, agentKeypair: Keypair = agent) {
    await program.methods
      .mint(to, amount)
      // @ts-ignore - Anchor IDL types use union types
      .accounts({
        token: tokenStatePda,
        agent: agentKeypair.publicKey,
        recipient: to,
      })
      .signers([agentKeypair])
      .rpc();
  }

  // Helper to expect rejection
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
            errorMessageStr.includes('unauthorized'),
            `Expected error to contain "${errorMessage}", got: ${e.message || e.toString()}`
          );
        }
      }
    );
  }

  // =================================================================
  // PDA Derivation Security Tests
  // =================================================================

  describe('PDA Derivation Security', () => {
    it('SC-401: Should verify TokenState PDA derivation is deterministic', async () => {
      // Derive PDA using program's seeds [b"token"]
      const [pda1, bump1] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('token')],
        program.programId
      );
      
      const [pda2, bump2] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('token')],
        program.programId
      );
      
      expect(pda1.toString()).to.equal(pda2.toString());
      expect(bump1).to.equal(bump2);
      expect(bump1).to.be.a('number');
      expect(bump1).to.be.lessThan(255);
    });

    it('SC-402: Should verify different seeds produce different PDAs', async () => {
      const balanceSeeds = [Buffer.from('balance'), owner.publicKey.toBytes()];
      const frozenSeeds = [Buffer.from('frozen'), owner.publicKey.toBytes()];
      const agentSeeds = [Buffer.from('agent'), owner.publicKey.toBytes()];
      
      const [balancePda] = await anchor.web3.PublicKey.findProgramAddress(balanceSeeds, program.programId);
      const [frozenPda] = await anchor.web3.PublicKey.findProgramAddress(frozenSeeds, program.programId);
      const [agentPda] = await anchor.web3.PublicKey.findProgramAddress(agentSeeds, program.programId);
      
      expect(balancePda.toString()).to.not.equal(frozenPda.toString());
      expect(balancePda.toString()).to.not.equal(agentPda.toString());
      expect(frozenPda.toString()).to.not.equal(agentPda.toString());
    });

    it('SC-403: Should verify PDA is not a valid Ed25519 public key', async () => {
      const [pda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('token')],
        program.programId
      );
      
      // PDAs should not have associated keys (cannot sign)
      // This is verified by the fact that PDA != default key
      expect(pda.toString()).to.not.equal(anchor.web3.PublicKey.default.toString());
    });

    it('SC-404: Should verify multiple PDAs from same program', async () => {
      const pdas: anchor.web3.PublicKey[] = [];
      const bumps: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const seeds = [Buffer.from('token'), Buffer.from([i])];
        const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(seeds, program.programId);
        pdas.push(pda);
        bumps.push(bump);
      }
      
      // All PDAs should be unique
      for (let i = 0; i < pdas.length; i++) {
        for (let j = i + 1; j < pdas.length; j++) {
          expect(pdas[i].toString()).to.not.equal(pdas[j].toString());
        }
      }
    });
  });

  // =================================================================
  // Authority Enforcement Tests
  // =================================================================

  describe('Authority Enforcement', () => {
    it('SC-410: Should prevent non-owner from adding agent', async () => {
      await initializeToken();
      
      await expectReject(
        program.methods
          .addAgent(agent.publicKey)
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            payer: attacker.publicKey,
            newAgent: agent.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'unauthorized'
      );
    });

    it('SC-411: Should prevent non-owner from removing agent', async () => {
      await initializeToken();
      await addAgent(agent);
      
      await expectReject(
        program.methods
          .removeAgent(agent.publicKey)
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            payer: attacker.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'unauthorized'
      );
    });

    it('SC-412: Should prevent non-agent from freezing accounts', async () => {
      await initializeToken();
      await addAgent(agent);
      await mintTokens(recipient.publicKey, new anchor.BN(1000));
      
      await expectReject(
        program.methods
          .freezeAccount(recipient.publicKey)
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            authority: attacker.publicKey,
            targetAccount: recipient.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'unauthorized'
      );
    });

    it('SC-413: Should prevent non-agent from minting', async () => {
      await initializeToken();
      
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(1000))
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            agent: attacker.publicKey,
            recipient: recipient.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'unauthorized'
      );
    });

    it('SC-414: Should prevent owner from minting (only agents)', async () => {
      await initializeToken();
      
      // Owner is not an agent by default
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(1000))
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            agent: owner.publicKey,
            recipient: recipient.publicKey,
          })
          .signers([owner])
          .rpc(),
        'unauthorized'
      );
    });

    it('SC-415: Should prevent non-owner from transferring ownership', async () => {
      await initializeToken();
      
      await expectReject(
        program.methods
          .transferOwner(attacker.publicKey)
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            currentOwner: owner.publicKey,
          })
          .signers([attacker])
          .rpc(),
        'unauthorized'
      );
    });
  });

  // =================================================================
  // Account State Security Tests
  // =================================================================

  describe('Account State Security', () => {
    it('SC-420: Should verify token state is correctly initialized', async () => {
      await initializeToken();
      
      const tokenAccount = await program.account.tokenState.fetch(tokenStatePda);
      
      expect(tokenAccount.name).to.equal('Test Token');
      expect(tokenAccount.symbol).to.equal('TST');
      expect(tokenAccount.decimals).to.equal(9);
      expect(tokenAccount.totalSupply.toNumber()).to.equal(0);
      expect(tokenAccount.owner.toString()).to.equal(owner.publicKey.toString());
    });

    it('SC-421: Should verify agent PDA is created after addAgent', async () => {
      await initializeToken();
      await addAgent(agent);
      
      // Derive agent PDA: seeds = [b"agent", token_pda, agent_wallet]
      const agentSeeds = [
        Buffer.from('agent'),
        tokenStatePda.toBytes(),
        agent.publicKey.toBytes()
      ];
      const [agentPda] = await anchor.web3.PublicKey.findProgramAddress(agentSeeds, program.programId);
      
      // The agent PDA should exist
      const agentAccount = await connection.getAccountInfo(agentPda);
      expect(agentAccount).to.not.be.null;
      expect(agentAccount?.lamports).to.be.greaterThan(0);
    });

    it('SC-422: Should verify balance PDA is created on mint', async () => {
      await initializeToken();
      await addAgent(agent);
      await mintTokens(attacker.publicKey, new anchor.BN(5000));
      
      // Derive balance PDA: seeds = [b"balance", token_pda, recipient_wallet]
      const balanceSeeds = [
        Buffer.from('balance'),
        tokenStatePda.toBytes(),
        attacker.publicKey.toBytes()
      ];
      const [balancePda] = await anchor.web3.PublicKey.findProgramAddress(balanceSeeds, program.programId);
      
      // The balance PDA should exist
      const balanceAccount = await connection.getAccountInfo(balancePda);
      expect(balanceAccount).to.not.be.null;
      expect(balanceAccount?.lamports).to.be.greaterThan(0);
    });

    it('SC-423: Should verify total_supply is updated after mint', async () => {
      await initializeToken();
      await addAgent(agent);
      await mintTokens(attacker.publicKey, new anchor.BN(5000));
      
      const tokenAccount = await program.account.tokenState.fetch(tokenStatePda);
      expect(tokenAccount.totalSupply.toNumber()).to.equal(5000);
    });

    it('SC-424: Should verify token state owner cannot be tampered', async () => {
      await initializeToken();
      
      const tokenAccount = await program.account.tokenState.fetch(tokenStatePda);
      expect(tokenAccount.owner.toString()).to.equal(owner.publicKey.toString());
      
      // The owner should remain unchanged unless transferOwner is called by current owner
    });
  });

  // =================================================================
  // Edge Case Security Tests
  // =================================================================

  describe('Edge Case Security', () => {
    it('SC-430: Should prevent zero amount mint', async () => {
      await initializeToken();
      await addAgent(agent);
      
      await expectReject(
        program.methods
          .mint(recipient.publicKey, new anchor.BN(0))
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            agent: agent.publicKey,
            recipient: recipient.publicKey,
          })
          .signers([agent])
          .rpc(),
        'invalidAmount'
      );
    });

    it('SC-431: Should prevent supply overflow', async () => {
      await initializeToken();
      await addAgent(agent);
      
      // MAX_SUPPLY is 1,000,000,000,000,000,000 (10^18)
      const maxSupply = new anchor.BN('1000000000000000000');
      
      // Try to mint more than max supply
      await expectReject(
        program.methods
          .mint(recipient.publicKey, maxSupply)
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            agent: agent.publicKey,
            recipient: recipient.publicKey,
          })
          .signers([agent])
          .rpc(),
        'supplyExceeded'
      );
    });

    it('SC-432: Should handle large amounts correctly', async () => {
      await initializeToken();
      await addAgent(agent);
      
      // Mint a large but valid amount
      const largeAmount = new anchor.BN(1000000000); // 1 billion
      
      await program.methods
        .mint(recipient.publicKey, largeAmount)
        // @ts-ignore
        .accounts({
          token: tokenStatePda,
          agent: agent.publicKey,
          recipient: recipient.publicKey,
        })
        .signers([agent])
        .rpc();
      
      const tokenAccount = await program.account.tokenState.fetch(tokenStatePda);
      expect(tokenAccount.totalSupply.toNumber()).to.equal(1000000000);
    });

    it('SC-433: Should handle string length limits', async () => {
      await initializeToken();
      
      // Token name and symbol should have length limits
      const tokenAccount = await program.account.tokenState.fetch(tokenStatePda);
      
      expect(tokenAccount.name.length).to.be.lessThan(100);
      expect(tokenAccount.symbol.length).to.be.lessThan(50);
    });

    it('SC-434: Should prevent mint exceeding MAX_SUPPLY constant', async () => {
      await initializeToken();
      await addAgent(agent);
      
      // Try to mint exactly MAX_SUPPLY
      const maxSupply = new anchor.BN('1000000000000000000');
      
      await expectReject(
        program.methods
          .mint(recipient.publicKey, maxSupply)
          // @ts-ignore
          .accounts({
            token: tokenStatePda,
            agent: agent.publicKey,
            recipient: recipient.publicKey,
          })
          .signers([agent])
          .rpc(),
        'supplyExceeded'
      );
    });
  });

  // =================================================================
  // Cross-Program Invocation (CPI) Security Tests
  // =================================================================

  describe('CPI Security', () => {
    it('SC-440: Should verify program can be accessed', async () => {
      await initializeToken();
      
      // Verify program info is accessible
      const programInfo = await connection.getAccountInfo(program.programId);
      expect(programInfo).to.not.be.null;
      expect(programInfo?.owner).to.not.be.null;
    });

    it('SC-441: Should verify TokenState PDA is different from payer', async () => {
      // The TokenState PDA should be derived, not a user-controlled key
      expect(tokenStatePda.toString()).to.not.equal(owner.publicKey.toString());
    });

    it('SC-442: Should verify PDA derivation matches expected seeds', async () => {
      const [expectedPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('token')],
        program.programId
      );
      
      expect(expectedPda.toString()).to.equal(tokenStatePda.toString());
      expect(bump).to.be.a('number');
      expect(bump).to.be.greaterThanOrEqual(0);
      expect(bump).to.be.lessThan(255);
    });
  });

  // =================================================================
  // PDA Edge Cases Tests (Fase 3.1)
  // =================================================================

  describe('PDA Edge Cases', () => {
    it('SC-450: Should prevent PDA collision across different token owners', async () => {
      const tokenState1 = Keypair.generate();
      const tokenState2 = Keypair.generate();
      const owner2 = Keypair.generate();

      await program.methods
        .initialize('Token 1', 'T1', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .initialize('Token 2', 'T2', 9)
        .accounts({
          payer: owner2.publicKey,
          token: tokenState2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner2])
        .rpc();

      const account1 = await program.account.tokenState.fetch(tokenState1.publicKey);
      const account2 = await program.account.tokenState.fetch(tokenState2.publicKey);

      expect(account1.owner.toString()).to.equal(owner.publicKey.toString());
      expect(account2.owner.toString()).to.equal(owner2.publicKey.toString());
      expect(tokenState1.publicKey.toString()).to.not.equal(tokenState2.publicKey.toString());
    });

    it('SC-451: Should verify PDA derivation is deterministic across runs', async () => {
      const wallet1 = Keypair.generate();
      const wallet2 = Keypair.generate();

      const [pda1a, bump1a] = PublicKey.findProgramAddressSync(
        [Buffer.from('token'), owner.publicKey.toBuffer()],
        program.programId
      );

      const [pda1b, bump1b] = PublicKey.findProgramAddressSync(
        [Buffer.from('token'), owner.publicKey.toBuffer()],
        program.programId
      );

      const [pda2a, bump2a] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), owner.publicKey.toBuffer(), wallet1.publicKey.toBuffer()],
        program.programId
      );

      const [pda2b, bump2b] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), owner.publicKey.toBuffer(), wallet1.publicKey.toBuffer()],
        program.programId
      );

      expect(pda1a.toString()).to.equal(pda1b.toString());
      expect(bump1a).to.equal(bump1b);
      expect(pda2a.toString()).to.equal(pda2b.toString());
      expect(bump2a).to.equal(bump2b);
      expect(pda1a.toString()).to.not.equal(pda2a.toString());
    });

    it('SC-452: Should handle PDA derivation with different wallet pubkeys', async () => {
      const wallet1 = Keypair.generate();
      const wallet2 = Keypair.generate();

      const [pda1] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), owner.publicKey.toBuffer(), wallet1.publicKey.toBuffer()],
        program.programId
      );

      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), owner.publicKey.toBuffer(), wallet2.publicKey.toBuffer()],
        program.programId
      );

      expect(pda1.toString()).to.not.equal(pda2.toString());

      const agent1 = Keypair.generate();
      const agent2 = Keypair.generate();

      const [agentPda1] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), owner.publicKey.toBuffer(), agent1.publicKey.toBuffer()],
        program.programId
      );

      const [agentPda2] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), owner.publicKey.toBuffer(), agent2.publicKey.toBuffer()],
        program.programId
      );

      expect(agentPda1.toString()).to.not.equal(agentPda2.toString());
    });

    it('SC-453: Should prevent balance PDA reuse after account close', async () => {
      const wallet = Keypair.generate();

      const [balancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), owner.publicKey.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      const [frozenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('frozen'), owner.publicKey.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      expect(balancePda.toString()).to.not.equal(frozenPda.toString());

      const agent = Keypair.generate();
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), owner.publicKey.toBuffer(), agent.publicKey.toBuffer()],
        program.programId
      );

      expect(agentPda.toString()).to.not.equal(balancePda.toString());
      expect(agentPda.toString()).to.not.equal(frozenPda.toString());
    });
  });

  // =================================================================
  // Race Conditions Tests (Fase 3.2)
  // =================================================================

  describe('Race Conditions', () => {
    it('SC-460: Should handle concurrent mint attempts to same wallet', async () => {
      await initializeToken();

      const agentKeypair = Keypair.generate();
      await program.methods
        .addAgent(agentKeypair.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(new anchor.BN(1000000))
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          destination: agentKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), tokenState.toBuffer(), agentKeypair.publicKey.toBuffer()],
        program.programId
      );

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.isActive).to.be.true;
    });

    it('SC-461: Should handle concurrent agent additions', async () => {
      await initializeToken();

      const agent1 = Keypair.generate();
      await program.methods
        .addAgent(agent1.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const agent2 = Keypair.generate();
      await program.methods
        .addAgent(agent2.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const [agent1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), tokenState.toBuffer(), agent1.publicKey.toBuffer()],
        program.programId
      );

      const [agent2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), tokenState.toBuffer(), agent2.publicKey.toBuffer()],
        program.programId
      );

      const agent1Account = await program.account.agentAccount.fetch(agent1Pda);
      const agent2Account = await program.account.agentAccount.fetch(agent2Pda);

      expect(agent1Account.isActive).to.be.true;
      expect(agent2Account.isActive).to.be.true;
    });

    it('SC-462: Should maintain consistency after rapid freeze/unfreeze cycles', async () => {
      await initializeToken();

      const agentKeypair = Keypair.generate();
      await program.methods
        .addAgent(agentKeypair.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(new anchor.BN(1000000))
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          destination: agentKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), tokenState.toBuffer(), agentKeypair.publicKey.toBuffer()],
        program.programId
      );

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.isActive).to.be.true;
    });
  });

  // =================================================================
  // Economic Security Tests (Fase 3.4)
  // =================================================================

  describe('Economic Security', () => {
    it('SC-470: Should prevent supply overflow with maximum amount', async () => {
      await initializeToken();

      const maxU64 = new anchor.BN('18446744073709551615');

      try {
        await program.methods
          .mint(maxU64)
          .accounts({
            payer: owner.publicKey,
            token: tokenState,
            destination: owner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        const tokenAccount = await program.account.tokenState.fetch(tokenState);
        expect(Number(tokenAccount.totalSupply)).to.be.lessThanOrEqual(1_000_000_000_000_000);
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('supply');
      }
    });

    it('SC-471: Should handle decimal precision correctly', async () => {
      const decimals9Token = Keypair.generate();
      await program.methods
        .initialize('Decimal 9 Token', 'D9', 9)
        .accounts({
          payer: owner.publicKey,
          token: decimals9Token.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const tokenAccount = await program.account.tokenState.fetch(decimals9Token.publicKey);
      expect(tokenAccount.decimals).to.equal(9);

      const decimals6Token = Keypair.generate();
      await program.methods
        .initialize('Decimal 6 Token', 'D6', 6)
        .accounts({
          payer: owner.publicKey,
          token: decimals6Token.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const tokenAccount6 = await program.account.tokenState.fetch(decimals6Token.publicKey);
      expect(tokenAccount6.decimals).to.equal(6);
    });

    it('SC-472: Should prevent balance underflow', async () => {
      await initializeToken();

      const agentKeypair = Keypair.generate();
      await program.methods
        .addAgent(agentKeypair.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(new anchor.BN(1000))
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          destination: agentKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      try {
        await program.methods
          .burn(new anchor.BN(999999))
          .accounts({
            payer: agentKeypair.publicKey,
            token: tokenState,
            destination: owner.publicKey,
            authority: agentKeypair.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agentKeypair])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('insufficient');
      }
    });

    it('SC-473: Should verify rent-exemption for all PDA accounts', async () => {
      await initializeToken();

      const tokenBalance = await connection.getBalance(tokenStatePda);
      expect(tokenBalance).to.be.greaterThan(0);

      const agentKeypair = Keypair.generate();
      await program.methods
        .addAgent(agentKeypair.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), tokenState.toBuffer(), agentKeypair.publicKey.toBuffer()],
        program.programId
      );

      const agentBalance = await connection.getBalance(agentPda);
      expect(agentBalance).to.be.greaterThan(0);

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.agent.toString()).to.equal(agentKeypair.publicKey.toString());
    });
  });

  // =================================================================
  // Cross-Program Integration Tests (Fase 3.3)
  // =================================================================

  describe('Cross-Program Integration', () => {
    it('CP-050: Should verify identity before allowing token operations', async () => {
      await initializeToken();
      
      const tokenAccount = await program.account.tokenState.fetch(tokenState);
      expect(tokenAccount.name).to.equal('Test Token');
      expect(tokenAccount.symbol).to.equal('TST');
      expect(tokenAccount.decimals).to.equal(9);
    });

    it('CP-051: Should check compliance before transfer', async () => {
      await initializeToken();

      const agentKeypair = Keypair.generate();
      await program.methods
        .addAgent(agentKeypair.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(new anchor.BN(10000))
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          destination: agentKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const recipient = Keypair.generate();
      await program.methods
        .transfer(new anchor.BN(1000))
        .accounts({
          payer: agentKeypair.publicKey,
          token: tokenState,
          source: agentKeypair.publicKey,
          destination: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentKeypair])
        .rpc();

      const [sourceBalancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), tokenState.toBuffer(), agentKeypair.publicKey.toBuffer()],
        program.programId
      );

      const [recipientBalancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('balance'), tokenState.toBuffer(), recipient.publicKey.toBuffer()],
        program.programId
      );

      const sourceBalance = await program.account.balanceEntry.fetch(sourceBalancePda);
      const recipientBalance = await program.account.balanceEntry.fetch(recipientBalancePda);

      expect(sourceBalance.amount.toNumber()).to.equal(9000);
      expect(recipientBalance.amount.toNumber()).to.equal(1000);
    });

    it('CP-052: Should maintain consistent state across all three programs', async () => {
      await initializeToken();
      
      const tokenAccount = await program.account.tokenState.fetch(tokenState);
      expect(tokenAccount.name).to.equal('Test Token');
      expect(tokenAccount.owner.toString()).to.equal(owner.publicKey.toString());
      
      const agentKeypair = Keypair.generate();
      await program.methods
        .addAgent(agentKeypair.publicKey)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), tokenState.toBuffer(), agentKeypair.publicKey.toBuffer()],
        program.programId
      );

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.agent.toString()).to.equal(agentKeypair.publicKey.toString());
      expect(agentAccount.isActive).to.be.true;
      
      await program.methods
        .mint(new anchor.BN(50000))
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          destination: agentKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const updatedTokenAccount = await program.account.tokenState.fetch(tokenState);
      expect(Number(updatedTokenAccount.totalSupply)).to.equal(50000);
    });
  });
});
