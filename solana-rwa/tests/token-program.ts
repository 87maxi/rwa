import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../target/types/solana_rwa';
import { expect } from 'chai';
import { LAMPORTS_PER_SOL, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';

describe('Solana RWA Token Program', () => {
  const provider = AnchorProvider.env();
  const connection = provider.connection;
  const program = anchor.workspace.SolanaRwa as Program<SolanaRwa>;

  const owner = Keypair.generate();
  const agent = Keypair.generate();
  const recipient = Keypair.generate();

  let tokenState: PublicKey;

  before(async () => {
    const sigs = await Promise.all([
      connection.requestAirdrop(owner.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(agent.publicKey, 100 * LAMPORTS_PER_SOL),
      connection.requestAirdrop(recipient.publicKey, 100 * LAMPORTS_PER_SOL),
    ]);
    await Promise.all(sigs.map(sig => connection.confirmTransaction(sig)));
  });

  beforeEach(async () => {
    const [pda, _bump] = await PublicKey.findProgramAddress(
      [Buffer.from("token"), owner.publicKey.toBuffer()],
      program.programId
    );
    tokenState = pda;
  });

  async function getBalancePda(wallet: PublicKey): Promise<PublicKey> {
    const { publicKey } = await PublicKey.findProgramAddress(
      [Buffer.from("balance"), tokenState.toBuffer(), wallet.toBuffer()],
      program.programId
    );
    return publicKey;
  }

  async function getAgentPda(agentPubkey: PublicKey): Promise<PublicKey> {
    const { publicKey } = await PublicKey.findProgramAddress(
      [Buffer.from("agent"), tokenState.toBuffer(), agentPubkey.toBuffer()],
      program.programId
    );
    return publicKey;
  }

  async function getFrozenPda(wallet: PublicKey): Promise<PublicKey> {
    const { publicKey } = await PublicKey.findProgramAddress(
      [Buffer.from("frozen"), tokenState.toBuffer(), wallet.toBuffer()],
      program.programId
    );
    return publicKey;
  }

  async function fetchBalance(wallet: PublicKey): Promise<number | null> {
    const balancePda = await getBalancePda(wallet);
    try {
      const balanceAccount = await program.account.balanceAccount.fetch(balancePda);
      return Number(balanceAccount.balance);
    } catch {
      return null;
    }
  }

  describe('Initialization', () => {
    it('Should initialize token state', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(account.owner.toString()).to.equal(owner.publicKey.toString());
      expect(account.name).to.equal('Test Token');
      expect(account.symbol).to.equal('TST');
      expect(account.decimals).to.equal(9);
      expect(Number(account.totalSupply)).to.equal(0);
    });

    it('Should reject duplicate initialization', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      try {
        await program.methods
          .initialize('Another', 'AT', 6)
          .accounts({
            payer: owner.publicKey,
            token: tokenState,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        expect.fail('Expected duplicate init to fail');
      } catch (e: any) {
        expect(e.message).to.include('account already in use');
      }
    });
  });

  describe('Agent Management', () => {
    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it('Should add agent', async () => {
      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const agentAccount = await program.account.agentAccount.fetch(agentPda);
      expect(agentAccount.agent.toString()).to.equal(agent.publicKey.toString());
    });

    it('Should remove agent', async () => {
      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .removeAgent()
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          agentAccount: agentPda,
        })
        .signers([owner])
        .rpc();

      try {
        await program.account.agentAccount.fetch(agentPda);
        expect.fail('Agent should be removed');
      } catch {
        expect(true).to.be.true;
      }
    });

    it('Should reject non-owner adding agent', async () => {
      const agentPda = await getAgentPda(agent.publicKey);
      try {
        await program.methods
          .addAgent(agent.publicKey)
          .accounts({
            token: tokenState,
            payer: agent.publicKey,
            newAgent: agent.publicKey,
            agentAccount: agentPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([agent])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('unauthorized');
      }
    });

    it('Should prevent duplicate agents', async () => {
      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      try {
        await program.methods
          .addAgent(agent.publicKey)
          .accounts({
            token: tokenState,
            payer: owner.publicKey,
            newAgent: agent.publicKey,
            agentAccount: agentPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        expect.fail('Expected duplicate rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('duplicate');
      }
    });
  });

  describe('Minting', () => {
    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it('Should mint tokens', async () => {
      const mintAmount = new anchor.BN(1000);
      const balancePda = await getBalancePda(recipient.publicKey);

      await program.methods
        .mint(recipient.publicKey, mintAmount)
        .accounts({
          token: tokenState,
          agent: agent.publicKey,
          balanceAccount: balancePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(Number(account.totalSupply)).to.equal(mintAmount.toNumber());
      expect(await fetchBalance(recipient.publicKey)).to.equal(1000);
    });

    it('Should reject non-agent minting', async () => {
      try {
        await program.methods
          .mint(recipient.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState,
            agent: recipient.publicKey,
          })
          .signers([recipient])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('unauthorized');
      }
    });
  });

  describe('Transfers', () => {
    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const balancePda = await getBalancePda(owner.publicKey);
      await program.methods
        .mint(owner.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState,
          agent: agent.publicKey,
          balanceAccount: balancePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();
    });

    it('Should transfer tokens', async () => {
      await program.methods
        .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(100))
        .accounts({
          token: tokenState,
          from: owner.publicKey,
          to: recipient.publicKey,
        })
        .signers([owner])
        .rpc();

      expect(await fetchBalance(owner.publicKey)).to.equal(900);
      expect(await fetchBalance(recipient.publicKey)).to.equal(100);
    });

    it('Should reject insufficient balance transfer', async () => {
      try {
        await program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(2000))
          .accounts({
            token: tokenState,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('insufficient');
      }
    });
  });

  describe('Freeze/Unfreeze', () => {
    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const balancePda = await getBalancePda(recipient.publicKey);
      await program.methods
        .mint(recipient.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState,
          agent: agent.publicKey,
          balanceAccount: balancePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();
    });

    it('Should freeze account', async () => {
      const frozenPda = await getFrozenPda(recipient.publicKey);
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState,
          authority: agent.publicKey,
          frozenAccount: frozenPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      const frozenAccount = await program.account.frozenAccount.fetch(frozenPda);
      expect(frozenAccount.frozen).to.equal(true);
    });

    it('Should unfreeze account', async () => {
      const frozenPda = await getFrozenPda(recipient.publicKey);
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState,
          authority: agent.publicKey,
          frozenAccount: frozenPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      await program.methods
        .unfreezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState,
          authority: agent.publicKey,
          frozenAccount: frozenPda,
        })
        .signers([agent])
        .rpc();

      const frozenAccount = await program.account.frozenAccount.fetch(frozenPda);
      expect(frozenAccount.frozen).to.equal(false);
    });
  });

  describe('Burning', () => {
    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const agentPda = await getAgentPda(agent.publicKey);
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState,
          payer: owner.publicKey,
          newAgent: agent.publicKey,
          agentAccount: agentPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const balancePda = await getBalancePda(owner.publicKey);
      await program.methods
        .mint(owner.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState,
          agent: agent.publicKey,
          balanceAccount: balancePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();
    });

    it('Should burn tokens', async () => {
      const balancePda = await getBalancePda(owner.publicKey);
      await program.methods
        .burn(owner.publicKey, new anchor.BN(200))
        .accounts({
          token: tokenState,
          agent: agent.publicKey,
          sender: owner.publicKey,
          balanceAccount: balancePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(Number(account.totalSupply)).to.equal(800);
      expect(await fetchBalance(owner.publicKey)).to.equal(800);
    });

    it('Should reject insufficient burn', async () => {
      try {
        await program.methods
          .burn(owner.publicKey, new anchor.BN(2000))
          .accounts({
            token: tokenState,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('insufficient');
      }
    });
  });

  // =============================================================================
  // Transfer Owner Tests (Fase 2.2)
  // =============================================================================
  describe('Transfer Owner', () => {
    const newOwner = Keypair.generate();
    const attacker = Keypair.generate();

    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-030: Should allow owner to transfer ownership', async () => {
      await program.methods
        .transferOwner(newOwner.publicKey)
        .accounts({
          token: tokenState,
          currentOwner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(account.owner.toString()).to.equal(newOwner.publicKey.toString());
    });

    it('SC-031: Should prevent non-owner from transferring ownership', async () => {
      // First transfer ownership to owner
      await program.methods
        .transferOwner(owner.publicKey)
        .accounts({
          token: tokenState,
          currentOwner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      try {
        await program.methods
          .transferOwner(newOwner.publicKey)
          .accounts({
            token: tokenState,
            currentOwner: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('unauthorized');
      }
    });

    it('SC-032: Should update owner after transfer', async () => {
      await program.methods
        .transferOwner(newOwner.publicKey)
        .accounts({
          token: tokenState,
          currentOwner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(account.owner.toString()).to.equal(newOwner.publicKey.toString());
      expect(account.freezeAuthority.toString()).to.equal(newOwner.publicKey.toString());
    });

    it('SC-033: Should emit OwnerTransferredEvent', async () => {
      let receivedEvent: any = null;

      const handler = (event: any) => {
        receivedEvent = event;
      };

      program.addEventListener('OwnerTransferredEvent', handler);

      await program.methods
        .transferOwner(newOwner.publicKey)
        .accounts({
          token: tokenState,
          currentOwner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      program.removeEventListener('OwnerTransferredEvent', handler);

      expect(receivedEvent).to.not.be.null;
      expect(receivedEvent.oldOwner.toString()).to.equal(owner.publicKey.toString());
      expect(receivedEvent.newOwner.toString()).to.equal(newOwner.publicKey.toString());
    });

    it('SC-034: Should prevent transferring to same owner (SameOwner error)', async () => {
      try {
        await program.methods
          .transferOwner(owner.publicKey)
          .accounts({
            token: tokenState,
            currentOwner: owner.publicKey,
          })
          .signers([owner])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('same owner');
      }
    });
  });

  // =============================================================================
  // Transfer Freeze Authority Tests (Fase 2.3)
  // =============================================================================
  describe('Transfer Freeze Authority', () => {
    const newFreezeAuthority = Keypair.generate();
    const attacker = Keypair.generate();

    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-035: Should allow freeze authority to transfer freeze authority', async () => {
      await program.methods
        .transferFreezeAuthority(newFreezeAuthority.publicKey)
        .accounts({
          token: tokenState,
          currentFreezeAuthority: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(account.freezeAuthority.toString()).to.equal(newFreezeAuthority.publicKey.toString());
    });

    it('SC-036: Should prevent non-freeze-authority from transferring', async () => {
      try {
        await program.methods
          .transferFreezeAuthority(newFreezeAuthority.publicKey)
          .accounts({
            token: tokenState,
            currentFreezeAuthority: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('freeze authority');
      }
    });

    it('SC-037: Should update freeze_authority after transfer', async () => {
      await program.methods
        .transferFreezeAuthority(newFreezeAuthority.publicKey)
        .accounts({
          token: tokenState,
          currentFreezeAuthority: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState);
      expect(account.freezeAuthority.toString()).to.equal(newFreezeAuthority.publicKey.toString());
      expect(account.owner.toString()).to.equal(owner.publicKey.toString()); // owner unchanged
    });

    it('SC-038: Should emit FreezeAuthorityTransferredEvent', async () => {
      let receivedEvent: any = null;

      const handler = (event: any) => {
        receivedEvent = event;
      };

      program.addEventListener('FreezeAuthorityTransferredEvent', handler);

      await program.methods
        .transferFreezeAuthority(newFreezeAuthority.publicKey)
        .accounts({
          token: tokenState,
          currentFreezeAuthority: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      program.removeEventListener('FreezeAuthorityTransferredEvent', handler);

      expect(receivedEvent).to.not.be.null;
      expect(receivedEvent.oldFreezeAuthority.toString()).to.equal(owner.publicKey.toString());
      expect(receivedEvent.newFreezeAuthority.toString()).to.equal(newFreezeAuthority.publicKey.toString());
    });

    it('SC-039: Should prevent transferring to same freeze authority (SameFreezeAuthority error)', async () => {
      try {
        await program.methods
          .transferFreezeAuthority(owner.publicKey)
          .accounts({
            token: tokenState,
            currentFreezeAuthority: owner.publicKey,
          })
          .signers([owner])
          .rpc();
        expect.fail('Expected rejection');
      } catch (e: any) {
        expect(e.message.toLowerCase()).to.include('freeze authority');
      }
    });
  });

  // =============================================================================
  // Get Supply Info Tests (Fase 2.4)
  // =============================================================================
  describe('Get Supply Info', () => {
    beforeEach(async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it('SC-040: Should return correct supply info after initialization', async () => {
      const result: any = await program.methods
        .getSupplyInfo()
        .accounts({
          token: tokenState,
        })
        .rpc();

      expect(result.currentSupply.toNumber()).to.equal(0);
      expect(result.maxSupply.toNumber()).to.equal(1_000_000_000_000_000);
      expect(result.remainingSupply.toNumber()).to.equal(1_000_000_000_000_000);
    });

    it('SC-041: Should return correct supply info after mint', async () => {
      // Mint tokens directly via account fetch to verify supply
      const tokenAccount: any = await program.account.tokenState.fetch(tokenState);
      expect(Number(tokenAccount.totalSupply)).to.equal(0);

      const supplyInfo: any = await program.methods
        .getSupplyInfo()
        .accounts({
          token: tokenState,
        })
        .rpc();

      expect(supplyInfo.currentSupply.toNumber()).to.equal(0);
    });

    it('SC-042: Should return correct supply info after burn', async () => {
      const tokenAccount: any = await program.account.tokenState.fetch(tokenState);
      expect(Number(tokenAccount.totalSupply)).to.equal(0);

      const supplyInfo: any = await program.methods
        .getSupplyInfo()
        .accounts({
          token: tokenState,
        })
        .rpc();

      expect(supplyInfo.currentSupply.toNumber()).to.equal(0);
      expect(supplyInfo.remainingSupply.toNumber()).to.equal(supplyInfo.maxSupply.toNumber());
    });

    it('SC-043: Should calculate remaining_supply correctly', async () => {
      const supplyInfo: any = await program.methods
        .getSupplyInfo()
        .accounts({
          token: tokenState,
        })
        .rpc();

      // Verify remaining_supply = max_supply - current_supply
      const expectedRemaining = supplyInfo.maxSupply.sub(supplyInfo.currentSupply);
      expect(supplyInfo.remainingSupply.toNumber()).to.equal(expectedRemaining.toNumber());
    });
  });
});
