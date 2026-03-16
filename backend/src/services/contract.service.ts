import { Server, TransactionBuilder, Address, nativeToScVal, xdr, Operation } from '@stellar/stellar-sdk';

export interface ContractAddresses {
  eduTokenContractId: string;
  bountyEscrowContractId: string;
  reputationContractId: string;
}

export class ContractService {
  private server: Server;
  private networkPassphrase: string;
  private contracts: ContractAddresses;

  constructor() {
    this.server = new Server(
      process.env.STELLAR_NETWORK === 'PUBLIC' 
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org'
    );
    
    this.networkPassphrase = process.env.STELLAR_NETWORK === 'PUBLIC' 
      ? 'PUBLIC'
      : 'TESTNET';

    this.contracts = {
      eduTokenContractId: process.env.EDU_TOKEN_CONTRACT_ID!,
      bountyEscrowContractId: process.env.BOUNTY_ESCROW_CONTRACT_ID!,
      reputationContractId: process.env.REPUTATION_CONTRACT_ID!,
    };
  }

  // EDU Token Contract Methods
  async mintEduTokens(
    secretKey: string,
    toAddress: string,
    amount: number
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.eduTokenContractId);
      const recipientAddress = new Address(toAddress);

      const args = [
        recipientAddress.toScVal(),
        nativeToScVal(amount.toString(), { type: xdr.ScValType.scvI128 }),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'mint',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error minting EDU tokens:', error);
      throw error;
    }
  }

  async getEduTokenBalance(address: string): Promise<string> {
    try {
      const contractAddress = new Address(this.contracts.eduTokenContractId);
      const userAddress = new Address(address);

      const args = [userAddress.toScVal()];

      // This would typically be done through a contract simulation or RPC call
      // For now, return a placeholder implementation
      const account = await this.server.loadAccount(address);
      const balance = account.balances.find(b => 
        b.asset_type === 'credit_alphanum4' && 
        b.asset_code === 'EDU'
      );

      return balance?.balance || '0';
    } catch (error) {
      console.error('Error getting EDU token balance:', error);
      return '0';
    }
  }

  async transferEduTokens(
    secretKey: string,
    toAddress: string,
    amount: number
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.eduTokenContractId);
      const recipientAddress = new Address(toAddress);

      const args = [
        recipientAddress.toScVal(),
        nativeToScVal(amount.toString(), { type: xdr.ScValType.scvI128 }),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'transfer',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error transferring EDU tokens:', error);
      throw error;
    }
  }

  // Bounty Escrow Contract Methods
  async createBounty(
    secretKey: string,
    title: string,
    description: string,
    rewardAmount: number,
    deadline: number
  ): Promise<{ bountyId: string; transactionHash: string }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.bountyEscrowContractId);
      const creatorAddress = new Address(keypair.publicKey());

      const args = [
        creatorAddress.toScVal(),
        nativeToScVal(title, { type: xdr.ScValType.scvString }),
        nativeToScVal(description, { type: xdr.ScValType.scvString }),
        nativeToScVal(rewardAmount.toString(), { type: xdr.ScValType.scvI128 }),
        nativeToScVal(deadline, { type: xdr.ScValType.scvU64 }),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'create_bounty',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      // Extract bounty ID from result (simplified)
      const bountyId = this.extractU256FromResult(result.resultXdr);
      
      return {
        bountyId,
        transactionHash: result.hash,
      };
    } catch (error) {
      console.error('Error creating bounty:', error);
      throw error;
    }
  }

  async fundBounty(
    secretKey: string,
    bountyId: string
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.bountyEscrowContractId);
      const funderAddress = new Address(keypair.publicKey());

      const args = [
        nativeToScVal(bountyId, { type: xdr.ScValType.scvU256 }),
        funderAddress.toScVal(),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'fund_bounty',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error funding bounty:', error);
      throw error;
    }
  }

  async applyForBounty(
    secretKey: string,
    bountyId: string,
    proposal: string,
    experience: string,
    timeline: string
  ): Promise<{ applicationId: string; transactionHash: string }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.bountyEscrowContractId);
      const applicantAddress = new Address(keypair.publicKey());

      const args = [
        nativeToScVal(bountyId, { type: xdr.ScValType.scvU256 }),
        applicantAddress.toScVal(),
        nativeToScVal(proposal, { type: xdr.ScValType.scvString }),
        nativeToScVal(experience, { type: xdr.ScValType.scvString }),
        nativeToScVal(timeline, { type: xdr.ScValType.scvString }),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'apply_for_bounty',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      const applicationId = this.extractU256FromResult(result.resultXdr);
      
      return {
        applicationId,
        transactionHash: result.hash,
      };
    } catch (error) {
      console.error('Error applying for bounty:', error);
      throw error;
    }
  }

  async assignBounty(
    secretKey: string,
    bountyId: string,
    applicationId: string
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.bountyEscrowContractId);
      const creatorAddress = new Address(keypair.publicKey());

      const args = [
        nativeToScVal(bountyId, { type: xdr.ScValType.scvU256 }),
        nativeToScVal(applicationId, { type: xdr.ScValType.scvU256 }),
        creatorAddress.toScVal(),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'assign_bounty',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error assigning bounty:', error);
      throw error;
    }
  }

  async completeBounty(
    secretKey: string,
    bountyId: string
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.bountyEscrowContractId);
      const creatorAddress = new Address(keypair.publicKey());

      const args = [
        nativeToScVal(bountyId, { type: xdr.ScValType.scvU256 }),
        creatorAddress.toScVal(),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'complete_bounty',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error completing bounty:', error);
      throw error;
    }
  }

  // Reputation Contract Methods
  async createUserReputation(
    secretKey: string,
    initialReputation?: number
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.reputationContractId);
      const userAddress = new Address(keypair.publicKey());

      const args = [
        userAddress.toScVal(),
        initialReputation 
          ? nativeToScVal(initialReputation, { type: xdr.ScValType.scvI32 })
          : xdr.ScVal.scvVoid(),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'create_user_reputation',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error creating user reputation:', error);
      throw error;
    }
  }

  async addReputation(
    secretKey: string,
    userAddress: string,
    amount: number,
    eventType: string,
    bountyId?: string,
    description?: string
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.reputationContractId);
      const targetUserAddress = new Address(userAddress);

      const args = [
        targetUserAddress.toScVal(),
        nativeToScVal(amount, { type: xdr.ScValType.scvI32 }),
        nativeToScVal(eventType, { type: xdr.ScValType.scvString }),
        bountyId 
          ? nativeToScVal(bountyId, { type: xdr.ScValType.scvU256 })
          : xdr.ScVal.scvVoid(),
        description 
          ? nativeToScVal(description, { type: xdr.ScValType.scvString })
          : xdr.ScVal.scvVoid(),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'add_reputation',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error adding reputation:', error);
      throw error;
    }
  }

  async addSkill(
    secretKey: string,
    skill: string
  ): Promise<{ transactionHash: string; success: boolean }> {
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey);
      const account = await this.server.loadAccount(keypair.publicKey());
      
      const contractAddress = new Address(this.contracts.reputationContractId);
      const userAddress = new Address(keypair.publicKey());

      const args = [
        userAddress.toScVal(),
        nativeToScVal(skill, { type: xdr.ScValType.scvString }),
      ];

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(Operation.invokeContract({
          contract: contractAddress,
          function: 'add_skill',
          args,
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      
      const result = await this.server.sendTransaction(transaction);
      
      return {
        transactionHash: result.hash,
        success: result.status === 'SUCCESS',
      };
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    }
  }

  // Utility methods
  private extractU256FromResult(resultXdr: string): string {
    try {
      const result = xdr.TransactionResult.fromXDR(resultXdr, 'base64');
      const returnValue = result.result().value();
      
      if (returnValue instanceof xdr.ScVal && returnValue.switch() === xdr.ScValType.scvU256) {
        return returnValue.u256().toString();
      }
      
      return '0';
    } catch (error) {
      console.error('Error extracting U256 from result:', error);
      return '0';
    }
  }

  async getTransactionStatus(transactionHash: string): Promise<any> {
    try {
      const transaction = await this.server.transactions()
        .transaction(transactionHash)
        .call();
      return transaction;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return null;
    }
  }

  getContractAddresses(): ContractAddresses {
    return this.contracts;
  }
}

export const contractService = new ContractService();
