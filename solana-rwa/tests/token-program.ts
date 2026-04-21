import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SolanaRwa } from '../target/types/solana_rwa';
import { expect } from 'chai';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

describe('Solana RWA Token Program', () => {
  const provider = AnchorProvider.env();
  const connection = provider.connection;
  const program = anchor.workspace.SolanaRwa as Program<SolanaRwa>;

  // Keypairs
  const owner = anchor.web3.Keypair.generate();
  const agent = anchor.web3.Keypair.generate();
  const recipient = anchor.web3.Keypair.generate();

  // Token state account
  let tokenState: anchor.web3.Keypair;

  before(async () => {
    // Airdrop to owner and agent (100 SOL each for rent exemption)
    const ownerSig = await connection.requestAirdrop(owner.publicKey, 100 * LAMPORTS_PER_SOL);
    const agentSig = await connection.requestAirdrop(agent.publicKey, 100 * LAMPORTS_PER_SOL);
    const recipientSig = await connection.requestAirdrop(recipient.publicKey, 100 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(ownerSig);
    await connection.confirmTransaction(agentSig);
    await connection.confirmTransaction(recipientSig);
  });

  beforeEach(async () => {
    // Create new token state account before each test
    tokenState = anchor.web3.Keypair.generate();
    // Airdrop to tokenState account itself for rent
    const sig = await connection.requestAirdrop(tokenState.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  });

  describe('Initialization', () => {
    it('Should initialize token state', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      
      expect(account.owner.toString()).to.equal(owner.publicKey.toString());
      expect(account.name).to.equal('Test Token');
      expect(account.symbol).to.equal('TST');
      expect(account.decimals).to.equal(9);
      expect(account.totalSupply.toNumber()).to.equal(0);
      expect(account.nextIndex.toNumber()).to.equal(0);
      expect(account.balances.length).to.equal(0);
      expect(account.frozenAccounts.length).to.equal(0);
      expect(account.agents.length).to.equal(0);
      expect(account.complianceModules.length).to.equal(0);
    });
  });

  describe('Agent Management', () => {
    it('Should add agent', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(account.agents.map(a => a.toString())).to.include(agent.publicKey.toString());
    });

    it('Should remove agent', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      // Add agent
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      // Remove agent
      await program.methods
        .removeAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(account.agents).to.not.include(agent.publicKey.toString());
    });

    it('Should reject non-owner adding agent', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      try {
        await program.methods
          .addAgent(agent.publicKey)
          .accounts({
            token: tokenState.publicKey,
            payer: agent.publicKey,
          })
          .signers([agent])
          .rpc();
        expect.fail('Expected transaction to fail');
      } catch (e: any) {
        expect(e.message).to.include('Unauthorized');
      }
    });
  });

  describe('Minting', () => {
    it('Should mint tokens to address', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      // Add agent
      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      // Mint tokens
      const mintAmount = new anchor.BN(1000);
      await program.methods
        .mint(recipient.publicKey, mintAmount)
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(account.totalSupply.toNumber()).to.equal(mintAmount.toNumber());
      expect(account.balances.length).to.equal(1);
      expect(account.balances[0].key.toString()).to.equal(recipient.publicKey.toString());
      expect(account.balances[0].value.toNumber()).to.equal(mintAmount.toNumber());
    });

    it('Should reject non-agent minting', async () => {
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      try {
        await program.methods
          .mint(recipient.publicKey, new anchor.BN(100))
          .accounts({
            token: tokenState.publicKey,
            agent: recipient.publicKey,
          })
          .signers([recipient])
          .rpc();
        expect.fail('Expected transaction to fail');
      } catch (e: any) {
        expect(e.message).to.include('Unauthorized');
      }
    });
  });

  describe('Transfers', () => {
    beforeEach(async () => {
      // Initialize and mint tokens for transfer tests
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(owner.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();
    });

    it('Should transfer tokens', async () => {
      const transferAmount = new anchor.BN(100);
      
      await program.methods
        .transfer(owner.publicKey, recipient.publicKey, transferAmount)
        .accounts({
          token: tokenState.publicKey,
          from: owner.publicKey,
          to: recipient.publicKey,
        })
        .signers([owner])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      
      const ownerBalance = account.balances.find(b => b.key.toString() === owner.publicKey.toString());
      const recipientBalance = account.balances.find(b => b.key.toString() === recipient.publicKey.toString());

      expect(ownerBalance?.value.toNumber()).to.equal(900);
      expect(recipientBalance?.value.toNumber()).to.equal(transferAmount.toNumber());
    });

    it('Should reject transfer with insufficient balance', async () => {
      try {
        await program.methods
          .transfer(owner.publicKey, recipient.publicKey, new anchor.BN(2000))
          .accounts({
            token: tokenState.publicKey,
            from: owner.publicKey,
            to: recipient.publicKey,
          })
          .signers([owner])
          .rpc();
        expect.fail('Expected transaction to fail');
      } catch (e: any) {
        expect(e.message).to.include('Insufficient balance');
      }
    });
  });

  describe('Freeze/Unfreeze', () => {
    beforeEach(async () => {
      // Initialize and mint tokens for freeze tests
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(recipient.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();
    });

    it('Should freeze account', async () => {
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          from: agent.publicKey,
          to: recipient.publicKey,
        })
        .signers([agent])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      const frozenEntry = account.frozenAccounts.find(f => f.key.toString() === recipient.publicKey.toString());
      expect(frozenEntry?.frozen).to.equal(true);
    });

    it('Should unfreeze account', async () => {
      // First freeze
      await program.methods
        .freezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          from: agent.publicKey,
          to: recipient.publicKey,
        })
        .signers([agent])
        .rpc();

      // Then unfreeze
      await program.methods
        .unfreezeAccount(recipient.publicKey)
        .accounts({
          token: tokenState.publicKey,
          from: agent.publicKey,
          to: recipient.publicKey,
        })
        .signers([agent])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      const frozenEntry = account.frozenAccounts.find(f => f.key.toString() === recipient.publicKey.toString());
      expect(frozenEntry?.frozen).to.equal(false);
    });
  });

  describe('Burning', () => {
    beforeEach(async () => {
      // Initialize and mint tokens for burn tests
      await program.methods
        .initialize('Test Token', 'TST', 9)
        .accounts({
          payer: owner.publicKey,
          token: tokenState.publicKey,
        })
        .signers([owner, tokenState])
        .rpc();

      await program.methods
        .addAgent(agent.publicKey)
        .accounts({
          token: tokenState.publicKey,
          payer: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .mint(owner.publicKey, new anchor.BN(1000))
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();
    });

    it('Should burn tokens', async () => {
      const burnAmount = new anchor.BN(200);
      
      await program.methods
        .burn(owner.publicKey, burnAmount)
        .accounts({
          token: tokenState.publicKey,
          agent: agent.publicKey,
        })
        .signers([agent])
        .rpc();

      const account = await program.account.tokenState.fetch(tokenState.publicKey);
      expect(account.totalSupply.toNumber()).to.equal(800);
      
      const ownerBalance = account.balances.find(b => b.key.toString() === owner.publicKey.toString());
      expect(ownerBalance?.value.toNumber()).to.equal(800);
    });

    it('Should reject burning with insufficient balance', async () => {
      try {
        await program.methods
          .burn(owner.publicKey, new anchor.BN(2000))
          .accounts({
            token: tokenState.publicKey,
            agent: agent.publicKey,
          })
          .signers([agent])
          .rpc();
        expect.fail('Expected transaction to fail');
      } catch (e: any) {
        expect(e.message).to.include('Insufficient balance');
      }
    });
  });
});
