import { StellarSdk, Horizon } from 'stellar-sdk'

// Stellar configuration
const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET'
const HORIZON_URL = STELLAR_NETWORK === 'PUBLIC' 
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org'

export const server = new Horizon.Server(HORIZON_URL)
export const stellarSdk = StellarSdk

// Education platform asset
export const EDUCATION_ASSET = {
  code: 'EDU',
  issuer: process.env.NEXT_PUBLIC_EDU_ISSUER || ''
}

export class StellarWallet {
  private keypair: StellarSdk.Keypair | null = null

  constructor(secret?: string) {
    if (secret) {
      this.keypair = StellarSdk.Keypair.fromSecret(secret)
    }
  }

  get publicKey(): string {
    return this.keypair?.publicKey() || ''
  }

  get secret(): string {
    return this.keypair?.secret() || ''
  }

  async createAccount(): Promise<{ publicKey: string; secret: string }> {
    this.keypair = StellarSdk.Keypair.random()
    
    // Fund account on testnet
    if (STELLAR_NETWORK === 'TESTNET') {
      try {
        await fetch(`https://friendbot.stellar.org?addr=${this.keypair.publicKey()}`)
      } catch (error) {
        console.error('Failed to fund testnet account:', error)
      }
    }

    return {
      publicKey: this.keypair.publicKey(),
      secret: this.keypair.secret()
    }
  }

  async createTrustline(asset: StellarSdk.Asset): Promise<string> {
    if (!this.keypair) throw new Error('Wallet not initialized')

    const account = await server.loadAccount(this.keypair.publicKey())
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks[STELLAR_NETWORK]
    })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: asset,
        limit: '10000000'
      }))
      .setTimeout(30)
      .build()

    transaction.sign(this.keypair)
    const result = await server.submitTransaction(transaction)
    
    return result.hash
  }

  async getBalance(): Promise<Array<{ asset: string; balance: string; limit?: string }>> {
    if (!this.keypair) throw new Error('Wallet not initialized')

    try {
      const account = await server.loadAccount(this.keypair.publicKey())
      return account.balances.map(balance => ({
        asset: balance.asset_type === 'native' ? 'XLM' : `${balance.asset_code}:${balance.asset_issuer}`,
        balance: balance.balance,
        limit: (balance as any).limit
      }))
    } catch (error) {
      console.error('Error getting balance:', error)
      return []
    }
  }

  async sendPayment(destination: string, amount: string, asset: StellarSdk.Asset, memo?: string): Promise<string> {
    if (!this.keypair) throw new Error('Wallet not initialized')

    const account = await server.loadAccount(this.keypair.publicKey())
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks[STELLAR_NETWORK]
    })
      .addOperation(StellarSdk.Operation.payment({
        destination,
        asset,
        amount
      }))
      .addMemo(memo ? StellarSdk.Memo.text(memo) : undefined)
      .setTimeout(30)
      .build()

    transaction.sign(this.keypair)
    const result = await server.submitTransaction(transaction)
    
    return result.hash
  }

  async signChallenge(challenge: string): Promise<string> {
    if (!this.keypair) throw new Error('Wallet not initialized')
    
    return this.keypair.sign(challenge).toString('base64')
  }
}

export class StellarService {
  static async getAccountTransactions(publicKey: string, limit: number = 10) {
    try {
      const transactions = await server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call()

      return {
        success: true,
        transactions: transactions.records
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async getAssetInfo(assetCode: string, issuer: string) {
    try {
      const asset = new StellarSdk.Asset(assetCode, issuer)
      
      // Get asset holders and other info
      const accounts = await server
        .accounts()
        .forAsset(asset)
        .limit(10)
        .call()

      return {
        success: true,
        asset: {
          code: assetCode,
          issuer: issuer,
          holders: accounts.records.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async validateAddress(address: string): Promise<boolean> {
    try {
      StellarSdk.StrKey.decodeEd25519PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  static async getAccountInfo(address: string) {
    try {
      const account = await server.loadAccount(address)
      return {
        success: true,
        account: {
          address: account.id,
          sequence: account.sequence,
          balances: account.balances,
          signers: account.signers,
          thresholds: account.thresholds
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Utility functions
export function formatStellarBalance(balance: string): string {
  const num = parseFloat(balance)
  return num.toFixed(2)
}

export function formatAsset(asset: any): string {
  if (asset.asset_type === 'native') {
    return 'XLM'
  }
  return `${asset.asset_code}:${asset.asset_issuer}`
}

export function isEducationAsset(asset: any): boolean {
  return asset.asset_code === EDUCATION_ASSET.code && 
         asset.asset_issuer === EDUCATION_ASSET.issuer
}

// React hooks
export function useStellarWallet(secret?: string) {
  const [wallet, setWallet] = useState<StellarWallet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (secret) {
      setWallet(new StellarWallet(secret))
    }
  }, [secret])

  const createWallet = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const newWallet = new StellarWallet()
      const result = await newWallet.createAccount()
      setWallet(newWallet)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getBalance = async () => {
    if (!wallet) throw new Error('Wallet not initialized')
    return await wallet.getBalance()
  }

  const createTrustline = async (asset: StellarSdk.Asset) => {
    if (!wallet) throw new Error('Wallet not initialized')
    return await wallet.createTrustline(asset)
  }

  const sendPayment = async (destination: string, amount: string, asset: StellarSdk.Asset, memo?: string) => {
    if (!wallet) throw new Error('Wallet not initialized')
    return await wallet.sendPayment(destination, amount, asset, memo)
  }

  return {
    wallet,
    loading,
    error,
    createWallet,
    getBalance,
    createTrustline,
    sendPayment,
    publicKey: wallet?.publicKey || ''
  }
}
