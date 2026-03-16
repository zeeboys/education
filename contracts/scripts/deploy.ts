import { SorobanRpc, Networks, TransactionBuilder, Address, nativeToScVal, xdr } from '@stellar/stellar-sdk';

// Configuration
const NETWORK = process.env.STELLAR_NETWORK || 'TESTNET';
const RPC_URL = NETWORK === 'PUBLIC' 
  ? 'https://rpc.mainnet.stellar.org:443' 
  : 'https://soroban-testnet.stellar.org:443';

// Contract WASM paths
const CONTRACTS = {
  edu_token: './target/wasm32-unknown-unknown/release/edu_token.wasm',
  bounty_escrow: './target/wasm32-unknown-unknown/release/bounty_escrow.wasm',
  reputation: './target/wasm32-unknown-unknown/release/reputation.wasm',
};

// Account keys (should be set in environment)
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const EDU_TOKEN_ISSUER_SECRET = process.env.EDU_TOKEN_ISSUER_SECRET || '';
const BOUNTY_ESCROW_ADMIN_SECRET = process.env.BOUNTY_ESCROW_ADMIN_SECRET || '';
const REPUTATION_ADMIN_SECRET = process.env.REPUTATION_ADMIN_SECRET || '';

class ContractDeployer {
  private server: SorobanRpc.Server;
  private networkPassphrase: string;

  constructor() {
    this.server = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
    this.networkPassphrase = NETWORK === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;
  }

  async loadAccount(secretKey: string): Promise { 
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();
    
    const account = await this.server.getAccount(publicKey);
    return { keypair, account };
  }

  async deployContract(
    wasmPath: string,
    sourceSecret: string,
    contractName: string
  ): Promise<{ contractId: string; transactionHash: string }> {
    console.log(`Deploying ${contractName} contract...`);

    // Load WASM file
    const fs = require('fs');
    const wasm = fs.readFileSync(wasmPath);

    // Load source account
    const { keypair, account } = await this.loadAccount(sourceSecret);

    // Create install transaction
    const installOp = xdr.HostFunction.fromXDR(
      new xdr.HostFunction.hostFunctionTypeInvokeContract(
        new xdr.InvokeContractArgs({
          contractAddress: new Address(account.accountId()).toScAddress(),
          functionName: new xdr.Symbol("install"),
          args: [
            nativeToScVal(wasm, { type: xdr.ScValType.scvBytes }),
          ],
        })
      ).toXDR(),
      xdr.ScValType.scvVec
    );

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.invokeHostFunction({
        hostFunction: installOp,
      }))
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    // Submit transaction
    const result = await this.server.sendTransaction(transaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Failed to deploy ${contractName}: ${result.errorResult}`);
    }

    // Get transaction result
    const txResult = await this.server.getTransaction(result.hash);
    
    if (txResult.status !== 'SUCCESS') {
      throw new Error(`Transaction failed: ${txResult.resultXdr}`);
    }

    // Extract contract ID from result
    const contractId = this.extractContractId(txResult.resultXdr);

    console.log(`${contractName} deployed successfully!`);
    console.log(`Contract ID: ${contractId}`);
    console.log(`Transaction Hash: ${result.hash}`);

    return {
      contractId,
      transactionHash: result.hash,
    };
  }

  async initializeEduToken(
    contractId: string,
    adminSecret: string,
    name: string,
    symbol: string,
    decimals: number,
    initialSupply?: number,
    mintLimit?: number
  ): Promise<string> {
    console.log('Initializing EDU token contract...');

    const { keypair, account } = await this.loadAccount(adminSecret);
    const contractAddress = new Address(contractId);

    const args = [
      new Address(keypair.publicKey()).toScVal(), // admin
      nativeToScVal(name, { type: xdr.ScValType.scvString }),
      nativeToScVal(symbol, { type: xdr.ScValType.scvString }),
      nativeToScVal(decimals, { type: xdr.ScValType.scvU32 }),
      initialSupply ? nativeToScVal(initialSupply, { type: xdr.ScValType.scvI128 }) : xdr.ScVal.scvVoid(),
      mintLimit ? nativeToScVal(mintLimit, { type: xdr.ScValType.scvI128 }) : xdr.ScVal.scvVoid(),
    ];

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.invokeContract({
        contract: contractAddress,
        function: 'initialize',
        args,
      }))
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    const result = await this.server.sendTransaction(transaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Failed to initialize EDU token: ${result.errorResult}`);
    }

    console.log('EDU token initialized successfully!');
    return result.hash;
  }

  async initializeBountyEscrow(
    contractId: string,
    adminSecret: string,
    eduTokenContractId: string
  ): Promise<string> {
    console.log('Initializing bounty escrow contract...');

    const { keypair, account } = await this.loadAccount(adminSecret);
    const contractAddress = new Address(contractId);
    const eduTokenAddress = new Address(eduTokenContractId);

    const args = [
      new Address(keypair.publicKey()).toScVal(), // admin
      eduTokenAddress.toScVal(), // edu token address
    ];

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.invokeContract({
        contract: contractAddress,
        function: 'initialize',
        args,
      }))
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    const result = await this.server.sendTransaction(transaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Failed to initialize bounty escrow: ${result.errorResult}`);
    }

    console.log('Bounty escrow initialized successfully!');
    return result.hash;
  }

  async initializeReputation(
    contractId: string,
    adminSecret: string
  ): Promise<string> {
    console.log('Initializing reputation contract...');

    const { keypair, account } = await this.loadAccount(adminSecret);
    const contractAddress = new Address(contractId);

    const args = [
      new Address(keypair.publicKey()).toScVal(), // admin
    ];

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.invokeContract({
        contract: contractAddress,
        function: 'initialize',
        args,
      }))
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    const result = await this.server.sendTransaction(transaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Failed to initialize reputation contract: ${result.errorResult}`);
    }

    console.log('Reputation contract initialized successfully!');
    return result.hash;
  }

  private extractContractId(resultXdr: string): string {
    const result = xdr.TransactionResult.fromXDR(resultXdr, 'base64');
    const returnValue = result.result().value();
    
    if (returnValue instanceof xdr.ScVal && returnValue.switch() === xdr.ScValType.scvAddress) {
      const address = returnValue.address();
      return new Address(address).toString();
    }
    
    throw new Error('Could not extract contract ID from transaction result');
  }

  async deployAll(): Promise<{
    eduToken: { contractId: string; transactionHash: string };
    bountyEscrow: { contractId: string; transactionHash: string };
    reputation: { contractId: string; transactionHash: string };
  }> {
    console.log('Starting full contract deployment...\n');

    // Deploy EDU Token contract
    const eduTokenResult = await this.deployContract(
      CONTRACTS.edu_token,
      EDU_TOKEN_ISSUER_SECRET,
      'EDU Token'
    );

    // Initialize EDU Token
    await this.initializeEduToken(
      eduTokenResult.contractId,
      EDU_TOKEN_ISSUER_SECRET,
      'Education Token',
      'EDU',
      7,
      1000000000, // 100 EDU initial supply
      10000000000000 // 10 billion max supply
    );

    // Deploy Bounty Escrow contract
    const bountyEscrowResult = await this.deployContract(
      CONTRACTS.bounty_escrow,
      BOUNTY_ESCROW_ADMIN_SECRET,
      'Bounty Escrow'
    );

    // Initialize Bounty Escrow
    await this.initializeBountyEscrow(
      bountyEscrowResult.contractId,
      BOUNTY_ESCROW_ADMIN_SECRET,
      eduTokenResult.contractId
    );

    // Deploy Reputation contract
    const reputationResult = await this.deployContract(
      CONTRACTS.reputation,
      REPUTATION_ADMIN_SECRET,
      'Reputation'
    );

    // Initialize Reputation
    await this.initializeReputation(
      reputationResult.contractId,
      REPUTATION_ADMIN_SECRET
    );

    console.log('\n✅ All contracts deployed successfully!');
    console.log('\nContract Addresses:');
    console.log(`EDU Token: ${eduTokenResult.contractId}`);
    console.log(`Bounty Escrow: ${bountyEscrowResult.contractId}`);
    console.log(`Reputation: ${reputationResult.contractId}`);

    return {
      eduToken: eduTokenResult,
      bountyEscrow: bountyEscrowResult,
      reputation: reputationResult,
    };
  }
}

// Main deployment function
async function main() {
  try {
    const deployer = new ContractDeployer();
    
    // Validate environment variables
    if (!ADMIN_SECRET || !EDU_TOKEN_ISSUER_SECRET || !BOUNTY_ESCROW_ADMIN_SECRET || !REPUTATION_ADMIN_SECRET) {
      throw new Error('Missing required environment variables. Please set ADMIN_SECRET, EDU_TOKEN_ISSUER_SECRET, BOUNTY_ESCROW_ADMIN_SECRET, and REPUTATION_ADMIN_SECRET');
    }

    // Deploy all contracts
    const results = await deployer.deployAll();

    // Save contract addresses to environment file
    const envContent = `
# Stellar Smart Contract Addresses
EDU_TOKEN_CONTRACT_ID=${results.eduToken.contractId}
BOUNTY_ESCROW_CONTRACT_ID=${results.bountyEscrow.contractId}
REPUTATION_CONTRACT_ID=${results.reputation.contractId}

# Deployment Info
EDU_TOKEN_TX_HASH=${results.eduToken.transactionHash}
BOUNTY_ESCROW_TX_HASH=${results.bountyEscrow.transactionHash}
REPUTATION_TX_HASH=${results.reputation.transactionHash}
`;

    require('fs').writeFileSync('.env.contracts', envContent);
    console.log('\n📝 Contract addresses saved to .env.contracts');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  main();
}

export { ContractDeployer };
