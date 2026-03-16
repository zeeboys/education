import { Horizon, Server, TransactionBuilder, Operation, Asset, Keypair, Networks } from 'stellar-sdk';

export class StellarService {
  private server: Server;
  private networkPassphrase: string;

  constructor() {
    this.server = new Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
    this.networkPassphrase = process.env.STELLAR_NETWORK === 'mainnet' 
      ? Networks.PUBLIC 
      : Networks.TESTNET;
  }

  async createAccount(): Promise<{ publicKey: string; secretKey: string }> {
    const keypair = Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };
  }

  async fundAccount(publicKey: string): Promise<void> {
    if (process.env.STELLAR_NETWORK !== 'mainnet') {
      try {
        const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(`Friendbot failed: ${result.detail}`);
        }
      } catch (error) {
        console.error('Failed to fund account:', error);
        throw error;
      }
    }
  }

  async getAccountBalance(publicKey: string): Promise<{ [key: string]: string }> {
    try {
      const account = await this.server.loadAccount(publicKey);
      const balances: { [key: string]: string } = {};
      
      account.balances.forEach((balance) => {
        if (balance.asset_type === 'native') {
          balances.XLM = balance.balance;
        } else {
          const assetCode = balance.asset_code || 'Unknown';
          balances[assetCode] = balance.balance;
        }
      });
      
      return balances;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      throw error;
    }
  }

  async createEduTokenAsset(issuerPublicKey: string): Promise<Asset> {
    return new Asset('EDU', issuerPublicKey);
  }

  async sendEduTokens(
    fromSecret: string,
    toPublicKey: string,
    amount: string,
    issuerPublicKey: string
  ): Promise<string> {
    try {
      const sourceKeypair = Keypair.fromSecret(fromSecret);
      const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());
      
      const eduAsset = new Asset('EDU', issuerPublicKey);
      
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: toPublicKey,
            asset: eduAsset,
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);
      
      const result = await this.server.submitTransaction(transaction);
      return result.hash;
    } catch (error) {
      console.error('Failed to send EDU tokens:', error);
      throw error;
    }
  }

  async trustAsset(
    userSecret: string,
    issuerPublicKey: string
  ): Promise<string> {
    try {
      const userKeypair = Keypair.fromSecret(userSecret);
      const userAccount = await this.server.loadAccount(userKeypair.publicKey());
      
      const eduAsset = new Asset('EDU', issuerPublicKey);
      
      const transaction = new TransactionBuilder(userAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: eduAsset,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(userKeypair);
      
      const result = await this.server.submitTransaction(transaction);
      return result.hash;
    } catch (error) {
      console.error('Failed to trust asset:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionHash: string): Promise<any> {
    try {
      const transaction = await this.server.transactions()
        .transaction(transactionHash)
        .call();
      return transaction;
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      Keypair.fromPublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async createBountyEscrow(
    creatorSecret: string,
    amount: string,
    issuerPublicKey: string,
    timeLockSeconds: number = 86400 // 24 hours default
  ): Promise<{ escrowPublicKey: string; escrowSecret: string; transactionHash: string }> {
    try {
      // Create escrow account
      const escrowKeypair = Keypair.random();
      const escrowPublicKey = escrowKeypair.publicKey();
      const escrowSecret = escrowKeypair.secret();

      // Fund escrow account
      await this.fundAccount(escrowPublicKey);

      // Set up time-locked transaction
      const creatorKeypair = Keypair.fromSecret(creatorSecret);
      const creatorAccount = await this.server.loadAccount(creatorKeypair.publicKey());
      
      const eduAsset = new Asset('EDU', issuerPublicKey);
      
      // Send tokens to escrow
      const fundTransaction = new TransactionBuilder(creatorAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: escrowPublicKey,
            asset: eduAsset,
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      fundTransaction.sign(creatorKeypair);
      const fundResult = await this.server.submitTransaction(fundTransaction);

      // Set up pre-authorized transaction for release
      const escrowAccount = await this.server.loadAccount(escrowPublicKey);
      const releaseTransaction = new TransactionBuilder(escrowAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
        timebounds: {
          minTime: 0,
          maxTime: Math.floor(Date.now() / 1000) + timeLockSeconds,
        },
      })
        .addOperation(
          Operation.setOptions({
            signer: {
              ed25519PublicKey: creatorKeypair.publicKey(),
              weight: 1,
            },
          })
        )
        .build();

      releaseTransaction.sign(escrowKeypair);

      return {
        escrowPublicKey,
        escrowSecret,
        transactionHash: fundResult.hash,
      };
    } catch (error) {
      console.error('Failed to create bounty escrow:', error);
      throw error;
    }
  }

  async releaseBountyPayment(
    escrowSecret: string,
    contributorPublicKey: string,
    issuerPublicKey: string,
    amount: string
  ): Promise<string> {
    try {
      const escrowKeypair = Keypair.fromSecret(escrowSecret);
      const escrowAccount = await this.server.loadAccount(escrowKeypair.publicKey());
      
      const eduAsset = new Asset('EDU', issuerPublicKey);
      
      const transaction = new TransactionBuilder(escrowAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: contributorPublicKey,
            asset: eduAsset,
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(escrowKeypair);
      
      const result = await this.server.submitTransaction(transaction);
      return result.hash;
    } catch (error) {
      console.error('Failed to release bounty payment:', error);
      throw error;
    }
  }
}

export const stellarService = new StellarService();
